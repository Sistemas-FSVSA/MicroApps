const { poolPromiseGestiones, sql } = require('../../models/conexion');

const guardarDependencia = async (req, res) => {
    const dependencia = req.body; // Esperamos un array de dependencia

    if (!Array.isArray(dependencia) || dependencia.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de dependencia válido' });
    }

    let pool;
    let transaction;

    try {
        pool = await poolPromiseGestiones;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            for (let i = 0; i < dependencia.length; i++) {
                const { nombre } = dependencia[i];

                if (!nombre) {
                    throw new Error(`Datos inválidos en la dependencia: ${JSON.stringify(dependencia[i])}`);
                }

                // Asignar el estado a true por defecto
                const estado = true;

                // Crear un nuevo request para cada iteración
                const request = transaction.request();
                await request
                    .input('nombre', sql.VarChar, nombre) // Nombre único por iteración
                    .input('estado', sql.Bit, estado) // Estado único por iteración
                    .query(`
                        INSERT INTO dependencias (nombre, estado)
                        VALUES (@nombre, @estado)
                    `);
            }

            // Confirmar la transacción después de todas las inserciones
            await transaction.commit();
            res.json({ message: 'Dependencias guardadas exitosamente' });

        } catch (error) {
            // Si hay error, deshacer cambios
            await transaction.rollback();
            console.error('Error al registrar dependencia:', error);
            res.status(500).json({ error: 'Error al registrar dependencia', detalle: error.message });
        }
    } catch (error) {
        console.error('Error en la conexión con la base de datos:', error);
        res.status(500).json({ error: 'Error en la base de datos', detalle: error.message });
    }
};

module.exports = { guardarDependencia };
