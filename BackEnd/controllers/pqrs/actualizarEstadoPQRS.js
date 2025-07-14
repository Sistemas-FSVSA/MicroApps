const { poolPromiseGestiones, sql } = require('../../models/conexion');

const actualizarEstadoPQRS = async (req, res) => {
    const { idusuario, idpqrs, estado } = req.body;
    let pool;
    let transaction;

    try {
        pool = await poolPromiseGestiones;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Obtener el estado actual
        const result = await transaction.request()
            .input('idpqrs', sql.Int, idpqrs)
            .query('SELECT estado FROM pqrs WHERE idpqrs = @idpqrs');

        if (result.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: 'PQRS no encontrada' });
        }

        const estadoAnterior = result.recordset[0].estado;

        // Insertar en bitacoraEstadoPQRS
        await transaction.request()
            .input('idusuario', sql.Int, idusuario)
            .input('idpqrs', sql.Int, idpqrs)
            .input('estado_anterior', sql.VarChar(50), estadoAnterior)
            .input('estado_nuevo', sql.VarChar(50), estado)
            .query(`
                INSERT INTO bitacoraEstadoPQRS (idusuario, idpqrs, estado_anterior, estado_nuevo, fecha)
                VALUES (@idusuario, @idpqrs, @estado_anterior, @estado_nuevo, GETDATE())
            `);

        // Actualizar el estado en la tabla pqrs
        await transaction.request()
            .input('estado', sql.VarChar(50), estado)
            .input('idpqrs', sql.Int, idpqrs)
            .query('UPDATE pqrs SET estado = @estado WHERE idpqrs = @idpqrs');

        await transaction.commit();
        res.json({ message: 'Estado actualizado y registrado en bitácora correctamente' });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error al actualizar el estado de la PQRS:', error);
        res.status(500).json({ error: 'Error interno al actualizar estado' });
    }
};

module.exports = { actualizarEstadoPQRS };
