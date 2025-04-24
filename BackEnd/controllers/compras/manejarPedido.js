const { poolPromise, sql } = require('../../models/conexion');

const manejarPedido = async (req, res) => {
    try {
        const { idusuario, items, estado } = req.body;
        let idpedido = req.body.idpedido;

        // Crear conexión a la base de datos
        const pool = await poolPromise;

        if (idpedido) {
            // Si llega un idpedido, eliminar los ítems existentes de ese pedido
            await pool.request()
                .input('idpedido', sql.Int, idpedido)
                .query('DELETE FROM detallepedido WHERE idpedido = @idpedido');

            // Actualizar el estado del pedido
            await pool.request()
                .input('idpedido', sql.Int, idpedido)
                .input('estado', sql.VarChar, estado || 'INICIADO') // Estado por defecto si no llega
                .query('UPDATE pedidos SET estado = @estado WHERE idpedido = @idpedido');
        } else {
            // Si no llega un idpedido, crear un nuevo registro en la tabla pedidos
            const result = await pool.request()
                .input('idusuario', sql.Int, idusuario)
                .query('SELECT iddependencia FROM usuariocompras WHERE idusuario = @idusuario');

            if (result.recordset.length === 0) {
                return res.status(404).send('No se encontró el iddependencia para el idusuario proporcionado.');
            }

            const iddependencia = result.recordset[0].iddependencia;

            const pedidoResult = await pool.request()
                .input('iddependencia', sql.Int, iddependencia)
                .input('estado', sql.VarChar, estado || 'INICIADO') // Estado por defecto si no llega
                .query('INSERT INTO pedidos (iddependencia, estado) OUTPUT INSERTED.idpedido VALUES (@iddependencia, @estado)');

            idpedido = pedidoResult.recordset[0].idpedido;
        }

        // Insertar los nuevos ítems en la tabla detallepedido
        for (const item of items) {
            const { id, cantidad, nombreCompleto } = item;

            await pool.request()
                .input('idpedido', sql.Int, idpedido)
                .input('idusuariosolicito', sql.Int, idusuario)
                .input('nombreusuario', sql.VarChar, nombreCompleto)
                .input('iditem', sql.Int, id)
                .input('cantidad', sql.Int, cantidad)
                .input('fechasolicitud', sql.DateTime, new Date())
                .input('estado', sql.VarChar, 'PENDIENTE')
                .query(`
                    INSERT INTO detallepedido 
                    (idpedido, idusuariosolicito, nombreusuario, iditem, cantidad, fechasolicitud, estado) 
                    VALUES (@idpedido, @idusuariosolicito, @nombreusuario, @iditem, @cantidad, @fechasolicitud, @estado)
                `);
        }

        // Retornar el idpedido generado o actualizado al frontend
        res.json({ message: 'Pedido y detalles procesados correctamente.', idpedido });
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        res.status(500).send('Error interno del servidor.');
    }
};

module.exports = { manejarPedido };
