const { poolPromiseGestiones, sql } = require('../../models/conexion');

const guardarAnotacion = async (req, res) => {
    const { usuario, anotacion, idpqrs } = req.body;
    let pool;
    let transaction;

    try {
        pool = await poolPromiseGestiones;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Insertar en la tabla anotacionespqrs
            await transaction.request()
                .input('anotacion', sql.Text, anotacion)
                .input('usuario', sql.VarChar, usuario)
                .input('idpqrs', sql.Int, idpqrs)
                .query(`
                    INSERT INTO anotacionespqrs (fecha, usuario, idpqrs, anotacion)
                    VALUES (GETDATE(), @usuario, @idpqrs, @anotacion)
                `);

            // Confirmar la transacción
            await transaction.commit();
            res.json({ message: 'Anotación guardada exitosamente', idpqrs });

        } catch (error) {
            // Si hay error en la inserción, deshacer cambios
            await transaction.rollback();
            console.error('Error al registrar anotación:', error);
            res.status(500).json({ error: 'Error al registrar anotación' });
        }
    } catch (error) {
        console.error('Error en la conexión con la base de datos:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = { guardarAnotacion };
