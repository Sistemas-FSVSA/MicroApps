const { poolPromiseGestiones, sql } = require('../../models/conexion');

const manejarPedido = async (req, res) => {
    try {
        const { idusuario, items, estado, idaprueba, iddependencia, idsubdependencia } = req.body;
        let idpedido = req.body.idpedido;
        console.log(idaprueba);

        const pool = await poolPromiseGestiones;

        if (idpedido) {
            // Eliminar ítems existentes del pedido
            await pool.request()
                .input('idpedido', sql.Int, idpedido)
                .query('DELETE FROM detallepedido WHERE idpedido = @idpedido');

            // Actualizar el estado del pedido
            const updateQuery = `
                UPDATE pedidos 
                SET estado = @estado${estado === 'APROBADO' ? ', fechapedido = GETDATE()' : ''}, 
                    idusuarioaprobo = @idusuario 
                WHERE idpedido = @idpedido
            `;
            await pool.request()
                .input('idpedido', sql.Int, idpedido)
                .input('estado', sql.VarChar, estado || 'INICIADO')
                .input('idusuario', sql.Int, idusuario)
                .query(updateQuery);

            // 🔧 Actualizar el idaprueba en la tabla pedidos
            if (idaprueba) {
                await pool.request()
                    .input('idpedido', sql.Int, idpedido)
                    .input('idaprueba', sql.Int, idaprueba)
                    .query(`
                        UPDATE pedidos
                        SET idaprueba = @idaprueba
                        WHERE idpedido = @idpedido
                    `);
            }
        } else {
            // ⚡ Validación: verificar si ya existe un pedido iniciado en esta área
            const validarResult = await pool.request()
                .input('iddependencia', sql.Int, iddependencia)
                .input('idsubdependencia', sql.Int, idsubdependencia || null)
                .query(`
                    SELECT TOP 1 idpedido 
                    FROM pedidos 
                    WHERE iddependencia = @iddependencia
                      AND (@idsubdependencia IS NULL OR idsubdependencia = @idsubdependencia)
                      AND estado = 'INICIADO'
                `);

            if (validarResult.recordset.length > 0) {
                return res.status(400).json({
                    message: 'Ya existe un pedido INICIADO para esta área',
                    idpedido: validarResult.recordset[0].idpedido
                });
            }

            // Crear nuevo pedido
            const pedidoResult = await pool.request()
                .input('iddependencia', sql.Int, iddependencia)
                .input('estado', sql.VarChar, estado || 'INICIADO')
                .input('idaprueba', sql.Int, idaprueba || null)
                .input('idsubdependencia', sql.Int, idsubdependencia || null)
                .query(`
                    INSERT INTO pedidos (iddependencia, estado, idaprueba, idsubdependencia) 
                    OUTPUT INSERTED.idpedido 
                    VALUES (@iddependencia, @estado, @idaprueba, @idsubdependencia)
                `);

            idpedido = pedidoResult.recordset[0].idpedido;
        }

        // Insertar ítems
        for (const item of items) {
            const { id, cantidad, nombreCompleto, notas } = item;

            await pool.request()
                .input('idpedido', sql.Int, idpedido)
                .input('idusuariosolicito', sql.Int, idusuario)
                .input('nombreusuario', sql.VarChar, nombreCompleto)
                .input('iditem', sql.Int, id)
                .input('cantidad', sql.Int, cantidad)
                .input('fechasolicitud', sql.DateTime, new Date())
                .input('estado', sql.VarChar, 'PENDIENTE')
                .input('notas', sql.VarChar, notas || null)
                .query(`
                    INSERT INTO detallepedido 
                    (idpedido, idusuariosolicito, nombreusuario, iditem, cantidad, fechasolicitud, estado, notas) 
                    VALUES (@idpedido, @idusuariosolicito, @nombreusuario, @iditem, @cantidad, @fechasolicitud, @estado, @notas)
                `);
        }

        res.json({ message: 'Pedido y detalles procesados correctamente.', idpedido });
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        res.status(500).send('Error interno del servidor.');
    }
};

module.exports = { manejarPedido };
