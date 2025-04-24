const { poolPromise, sql } = require('../../models/conexion');

const obtenerPedido = async (req, res) => {
    try {
        const { idusuario, idpedido, estado } = req.body;

        // Crear conexión a la base de datos
        const pool = await poolPromise;

        if (idusuario) {
            // Consultar el iddependencia asociado al idusuario
            const dependenciaResult = await pool.request()
            .input('idusuario', sql.Int, idusuario)
            .query('SELECT iddependencia FROM usuariocompras WHERE idusuario = @idusuario');

            if (dependenciaResult.recordset.length === 0) {
            return res.status(404).send('No se encontró el iddependencia para el idusuario proporcionado.');
            }

            const iddependencia = dependenciaResult.recordset[0].iddependencia;

            // Consultar si hay algún pedido con el iddependencia y estado
            const pedidoResult = await pool.request()
            .input('iddependencia', sql.Int, iddependencia)
            .input('estado', sql.VarChar, estado)
            .query(`
                SELECT idpedido FROM pedidos 
                WHERE iddependencia = @iddependencia AND estado = @estado
            `);

            if (pedidoResult.recordset.length > 0) {
            return res.json({ exists: true, idpedido: pedidoResult.recordset[0].idpedido }); // Retornar true y el idpedido
            } else {
            return res.json({ exists: false }); // No hay pedidos que cumplan las condiciones
            }
        }if (idpedido) {
            // Consultar el pedido por idpedido
            const pedidoResult = await pool.request()
                .input('idpedido', sql.Int, idpedido)
                .query('SELECT * FROM pedidos WHERE idpedido = @idpedido');

            if (pedidoResult.recordset.length === 0) {
                return res.status(404).send('No se encontró el pedido para el idpedido proporcionado.');
            }

            const pedido = pedidoResult.recordset[0];

            // Obtener el detalle del pedido
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
                    nombreCompleto: detalle.nombreusuario // Si este campo no existe, ajusta según sea necesario
                });
            }

            pedido.detalle = detalles;

            // Obtener el nombre de la dependencia
            const dependenciaNombreResult = await pool.request()
                .input('iddependencia', sql.Int, pedido.iddependencia)
                .query('SELECT nombre FROM dependencias WHERE iddependencia = @iddependencia');

            pedido.nombreDependencia = dependenciaNombreResult.recordset[0].nombre;

            return res.json(pedido);
        } else {
            return res.status(400).send('Debe proporcionar idusuario o idpedido.');
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        res.status(500).send('Error interno del servidor.');
    }
};

module.exports = { obtenerPedido };
