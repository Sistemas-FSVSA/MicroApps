const { poolPromiseGestiones, sql } = require('../../models/conexion');

const guardarCategoria = async (req, res) => {
    const categorias = req.body; // Esperamos un array de categorías [{nombre, descripcion}, ...]

    if (!Array.isArray(categorias) || categorias.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de categorías válido' });
    }

    let pool;
    let transaction;

    try {
        pool = await poolPromiseGestiones;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = transaction.request();

            for (let i = 0; i < categorias.length; i++) {
                const { nombre, descripcion } = categorias[i];

                if (!nombre) {
                    throw new Error(`Datos inválidos en la categoría: ${JSON.stringify(categorias[i])}`);
                }

                // Asignar el estado a true por defecto
                const estado = true;

                // Usar un nombre de parámetro único para cada iteración
                await request
                    .input(`nombre${i}`, sql.VarChar, nombre) // Nombre único por índice
                    .input(`descripcion${i}`, sql.Text, descripcion || null) // Descripción única por índice
                    .input(`estado${i}`, sql.Bit, estado) // Estado único por índice
                    .query(`
                        INSERT INTO categoriaitem (nombre, descripcion, estado)
                        VALUES (@nombre${i}, @descripcion${i}, @estado${i})
                    `);
            }

            // Confirmar la transacción después de todas las inserciones
            await transaction.commit();
            res.json({ message: 'Categorías guardadas exitosamente' });

        } catch (error) {
            // Si hay error, deshacer cambios
            await transaction.rollback();
            console.error('Error al registrar categorías:', error);
            res.status(500).json({ error: 'Error al registrar categorías' });
        }
    } catch (error) {
        console.error('Error en la conexión con la base de datos:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = { guardarCategoria };
