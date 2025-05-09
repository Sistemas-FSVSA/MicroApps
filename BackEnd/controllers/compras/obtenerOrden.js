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

            if (result.recordset.length === 0) {
                return res.status(404).send('No se encontraron órdenes con ese estado.');
            }

            return res.status(200).json(result.recordset);
        }

        // Escenario 2: Traer una orden con detalles agrupados
        if (idorden) {
            const result = await pool.request()
                .input('idorden', sql.Int, idorden)
                .query(`
                    SELECT 
                        o.idorden, o.fecha, o.estado, o.idusuario, o.tipo,
                        do.iddetalleorden, do.iditem, do.cantidad,
                        i.nombre
                    FROM orden o
                    INNER JOIN detalleorden do ON o.idorden = do.idorden
                    INNER JOIN items i ON do.iditem = i.iditem
                    WHERE o.idorden = @idorden
                `);

            if (result.recordset.length === 0) {
                return res.status(404).send('No se encontraron detalles para esa orden.');
            }

            const detalles = result.recordset.map(row => ({
                iddetalleorden: row.iddetalleorden,
                iditem: row.iditem,
                cantidad: row.cantidad,
                nombre: row.nombre
            }));

            const orden = {
                idorden: result.recordset[0].idorden,
                fecha: result.recordset[0].fecha,
                estado: result.recordset[0].estado,
                idusuario: result.recordset[0].idusuario,
                tipo: result.recordset[0].tipo,
                detalles: detalles
            };

            return res.status(200).json(orden);
        }

        return res.status(400).send('Debe proporcionar "estado" o "idorden".');
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        res.status(500).send('Error interno del servidor.');
    }
};

module.exports = { obtenerOrden };
