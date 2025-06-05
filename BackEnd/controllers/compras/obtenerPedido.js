const { poolPromise, sql } = require('../../models/conexion');

const obtenerPedido = async (req, res) => {
    try {
        const { idusuario, idpedido, estado } = req.body;
        const pool = await poolPromise;


        // Escenario 1: Solo idusuario
        if (idusuario && !idpedido && !estado) {
            // Validar si el idusuario es inválido solo en este contexto
            if (
                idusuario === null ||
                idusuario === undefined ||
                (typeof idusuario === 'string' && idusuario.trim() === '') ||
                (typeof idusuario === 'number' && isNaN(idusuario))
            ) {
                return res.status(200).json({ message: 'Sin parámetro válido: idusuario' });
            }

            const dependenciasResult = await pool.request()
                .input('idusuario', sql.Int, idusuario)
                .query('SELECT iddependencia, tipo FROM usuariocompras WHERE idusuario = @idusuario');

            if (dependenciasResult.recordset.length === 0) {
                // No hay dependencias asociadas
                return res.status(200).json({ message: 'Sin Dependencias' });
            }

            const dependencias = [];

            for (const dependencia of dependenciasResult.recordset) {
                const pedidosResult = await pool.request()
                    .input('iddependencia', sql.Int, dependencia.iddependencia)
                    .query('SELECT idpedido, estado FROM pedidos WHERE iddependencia = @iddependencia');

                const dependenciaNombreResult = await pool.request()
                    .input('iddependencia', sql.Int, dependencia.iddependencia)
                    .query('SELECT nombre FROM dependencias WHERE iddependencia = @iddependencia');

                dependencias.push({
                    iddependencia: dependencia.iddependencia,
                    tipo: dependencia.tipo,
                    nombreDependencia: dependenciaNombreResult.recordset[0]?.nombre || null,
                    pedidos: pedidosResult.recordset
                });
            }

            // Retornar todas las dependencias con sus pedidos y nombres
            return res.json({ dependencias });
        }


        // Escenario 2: idusuario + estado
        if (idusuario && estado && !idpedido) {
            const dependenciaResult = await pool.request()
                .input('idusuario', sql.Int, idusuario)
                .query('SELECT iddependencia FROM usuariocompras WHERE idusuario = @idusuario');

            if (dependenciaResult.recordset.length === 0) {
                return res.status(404).send('No se encontró el iddependencia para el idusuario proporcionado.');
            }

            const iddependencia = dependenciaResult.recordset[0].iddependencia;

            const pedidoResult = await pool.request()
                .input('iddependencia', sql.Int, iddependencia)
                .input('estado', sql.VarChar, estado)
                .query(`
            SELECT TOP 1 idpedido FROM pedidos 
            WHERE iddependencia = @iddependencia AND estado = @estado
        `);

            if (pedidoResult.recordset.length > 0) {
                return res.json({ exists: true, idpedido: pedidoResult.recordset[0].idpedido });
            } else {
                return res.json({ exists: false });
            }
        }

        // Escenario 3: Solo idpedido
        if (idpedido && !idusuario) {
            const pedidoResult = await pool.request()
                .input('idpedido', sql.Int, idpedido)
                .query('SELECT * FROM pedidos WHERE idpedido = @idpedido');

            if (pedidoResult.recordset.length === 0) {
                return res.status(404).send('No se encontró el pedido para el idpedido proporcionado.');
            }

            const pedido = pedidoResult.recordset[0];

            const detalleResult = await pool.request()
                .input('idpedido', sql.Int, idpedido)
                .query('SELECT * FROM detallepedido WHERE idpedido = @idpedido');

            const detalles = [];

            for (const detalle of detalleResult.recordset) {
                const itemResult = await pool.request()
                    .input('iditem', sql.Int, detalle.iditem)
                    .query('SELECT nombre, descripcion FROM items WHERE iditem = @iditem');

                const itemCategoriaResult = await pool.request()
                    .input('iditem', sql.Int, detalle.iditem)
                    .query('SELECT idcategoria FROM itemcategoria WHERE iditem = @iditem');

                const categoriaResult = await pool.request()
                    .input('idcategoria', sql.Int, itemCategoriaResult.recordset[0].idcategoria)
                    .query('SELECT nombre FROM categoriaitem WHERE idcategoriaitem = @idcategoria');

                detalles.push({
                    id: detalle.iditem,
                    cantidad: detalle.cantidad,
                    nombre: itemResult.recordset[0].nombre,
                    descripcion: itemResult.recordset[0].descripcion,
                    categoria: categoriaResult.recordset[0].nombre,
                    nombreCompleto: detalle.nombreusuario || null
                });
            }

            pedido.detalle = detalles;

            const dependenciaNombreResult = await pool.request()
                .input('iddependencia', sql.Int, pedido.iddependencia)
                .query('SELECT nombre FROM dependencias WHERE iddependencia = @iddependencia');

            pedido.nombreDependencia = dependenciaNombreResult.recordset[0].nombre;

            return res.json(pedido);
        }

        // Escenario 4: Solo estado (obtener todos los pedidos con ese estado)
        if (estado && !idusuario && !idpedido) {
            const pedidosResult = await pool.request()
                .input('estado', sql.VarChar, estado)
                .query('SELECT * FROM pedidos WHERE estado = @estado');

            const pedidos = [];

            for (const pedido of pedidosResult.recordset) {
                // Obtener nombre de dependencia
                const dependenciaNombreResult = await pool.request()
                    .input('iddependencia', sql.Int, pedido.iddependencia)
                    .query('SELECT nombre FROM dependencias WHERE iddependencia = @iddependencia');

                // Obtener total de ítems del pedido
                const totalItemsResult = await pool.request()
                    .input('idpedido', sql.Int, pedido.idpedido)
                    .query('SELECT SUM(cantidad) AS totalItems FROM detallepedido WHERE idpedido = @idpedido');

                // Obtener idorden relacionados desde ordenpedido
                const ordenesRelacionadasResult = await pool.request()
                    .input('idpedido', sql.Int, pedido.idpedido)
                    .query('SELECT idorden FROM ordenpedido WHERE idpedido = @idpedido');

                const ordenesRelacionadas = ordenesRelacionadasResult.recordset.map(r => r.idorden);

                pedidos.push({
                    ...pedido,
                    nombreDependencia: dependenciaNombreResult.recordset[0]?.nombre || null,
                    totalItems: totalItemsResult.recordset[0]?.totalItems || 0,
                    ordenesRelacionadas: ordenesRelacionadas // << Aquí está el nuevo campo
                });
            }

            return res.json({ pedidos });
        }

        // Si no se cumple ninguno de los 3 escenarios
        return res.status(400).send('Debe proporcionar una combinación válida de parámetros.');

    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        res.status(500).send('Error interno del servidor.');
    }
};

module.exports = { obtenerPedido };
