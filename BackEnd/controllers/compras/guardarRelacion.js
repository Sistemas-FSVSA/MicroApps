const { poolPromise, sql } = require('../../models/conexion');

const guardarRelacion = async (req, res) => {
    const { relaciones } = req.body;

    if (!Array.isArray(relaciones) || relaciones.length === 0) {
        return res.status(400).json({ mensaje: 'No se enviaron relaciones válidas.' });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // Insertar relaciones
        for (const relacion of relaciones) {
            const { idpedido, idorden } = relacion;
            const request = new sql.Request(transaction); // 🔁 Nuevo por iteración

            await request
                .input('idpedido', sql.Int, parseInt(idpedido))
                .input('idorden', sql.Int, parseInt(idorden))
                .query(`
                    IF NOT EXISTS (
                        SELECT 1 FROM ordenpedido 
                        WHERE idpedido = @idpedido AND idorden = @idorden
                    )
                    INSERT INTO ordenpedido (idpedido, idorden)
                    VALUES (@idpedido, @idorden)
                `);
        }

        // IDs únicos
        const pedidosUnicos = [...new Set(relaciones.map(r => parseInt(r.idpedido)))];
        const ordenesUnicas = [...new Set(relaciones.map(r => parseInt(r.idorden)))];

        // Actualizar pedidos
        if (pedidosUnicos.length > 0) {
            const request = new sql.Request(transaction);
            await request.query(`
                UPDATE pedidos 
                SET estado = 'FINALIZADO'
                WHERE idpedido IN (${pedidosUnicos.join(',')})
            `);
        }

        // Actualizar ordenes
        if (ordenesUnicas.length > 0) {
            const request = new sql.Request(transaction);
            await request.query(`
                UPDATE orden 
                SET estado = 'RELACIONADO'
                WHERE idorden IN (${ordenesUnicas.join(',')})
            `);
        }

        await transaction.commit();
        return res.status(200).json({ mensaje: 'Relaciones guardadas y estados actualizados correctamente.' });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al guardar relaciones:', error);
        return res.status(500).json({ mensaje: 'Error al guardar relaciones.', error: error.message });
    }
};

module.exports = { guardarRelacion };
