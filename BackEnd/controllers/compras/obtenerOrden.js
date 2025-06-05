const { poolPromise, sql } = require('../../models/conexion');

const obtenerOrden = async (req, res) => {
    try {
        const { estado, idorden } = req.body;
        const pool = await poolPromise;

        // Escenario 1: Listar órdenes por estado (sin detalles)
        if (estado) {
            const result = await pool.request()
                .input('estado', sql.VarChar(50), estado)
                .query(`
                    SELECT 
                        idorden, fecha, estado, tipo, idusuario
                    FROM orden
                    WHERE estado = @estado
                `);

            const ordenes = [];

            for (const orden of result.recordset) {
                const pedidosRelacionadosResult = await pool.request()
                    .input('idorden', sql.Int, orden.idorden)
                    .query('SELECT idpedido FROM ordenpedido WHERE idorden = @idorden');

                const pedidosRelacionados = pedidosRelacionadosResult.recordset.map(r => r.idpedido);

                ordenes.push({
                    ...orden,
                    pedidosRelacionados
                });
            }

            return res.status(200).json(ordenes);
        }

        // Escenario 2: Traer una orden con detalles agrupados
        if (idorden) {
            const result = await pool.request()
                .input('idorden', sql.Int, idorden)
                .query(`
                    SELECT 
                        o.idorden, o.fecha, o.estado, o.idusuario, o.tipo,
                        do.iddetalleorden, do.iditem, do.cantidad,
                        i.nombre, do.valor, o.factura, o.aprobado, p.nombre as proveedor
                    FROM orden o
                    INNER JOIN detalleorden do ON o.idorden = do.idorden
                    INNER JOIN items i ON do.iditem = i.iditem
                    LEFT JOIN proveedorescompras AS p ON o.idproveedor = p.idproveedor
                    WHERE o.idorden = @idorden
                `);

            if (result.recordset.length === 0) {
                return res.status(200).send('No se encontraron detalles para esa orden.');
            }

            const detalles = result.recordset.map(row => ({
                iddetalleorden: row.iddetalleorden,
                iditem: row.iditem,
                cantidad: row.cantidad,
                nombre: row.nombre,
                valor: row.valor
            }));

            const orden = {
                idorden: result.recordset[0].idorden,
                fecha: result.recordset[0].fecha,
                estado: result.recordset[0].estado,
                idusuario: result.recordset[0].idusuario,
                tipo: result.recordset[0].tipo,
                factura: result.recordset[0].factura,
                aprobado: result.recordset[0].aprobado,
                proveedor: result.recordset[0].proveedor,
                detalles: detalles
            };

            return res.status(200).json(orden);
        }

        // Escenario 3: Obtener todas las órdenes con datos básicos (sin filtros)
        const result = await pool.request()
            .query(`
                SELECT 
                    o.idorden, o.fecha, o.estado, o.tipo, o.idusuario, p.nombre as proveedor
                FROM orden AS o
                LEFT JOIN proveedorescompras AS p ON o.idproveedor = p.idproveedor
            `)

        const ordenes = [];

        for (const orden of result.recordset) {
            const pedidosRelacionadosResult = await pool.request()
                .input('idorden', sql.Int, orden.idorden)
                .query('SELECT idpedido FROM ordenpedido WHERE idorden = @idorden');

            const pedidosRelacionados = pedidosRelacionadosResult.recordset.map(r => r.idpedido);

            ordenes.push({
                ...orden,
                pedidosRelacionados
            });
        }

        return res.status(200).json(ordenes);

    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        res.status(500).send('Error interno del servidor.');
    }
};

module.exports = { obtenerOrden };
