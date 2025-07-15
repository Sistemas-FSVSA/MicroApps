const { poolPromiseGestiones, sql } = require('../../models/conexion');

const guardarItem = async (req, res) => {
    const { items, idcategoria } = req.body; // Se recibe un array de items y el idcategoria

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de items válido' });
    }

    let pool;
    let transaction;

    try {
        pool = await poolPromiseGestiones;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = transaction.request();

            // Primero insertamos los items en la tabla "items"
            const iditems = []; // Para almacenar los ids generados

            for (let i = 0; i < items.length; i++) {
                const { nombre, descripcion } = items[i];

                if (!nombre) {
                    throw new Error(`Datos inválidos en el item: ${JSON.stringify(items[i])}`);
                }

                const estado = true; // Establecemos el estado como verdadero por defecto

                // Insertamos el item en la tabla items y recuperamos su id
                const result = await request
                    .input(`nombre${i}`, sql.VarChar, nombre)
                    .input(`descripcion${i}`, sql.Text, descripcion || null)
                    .input(`estado${i}`, sql.Bit, estado)
                    .query(`
                        INSERT INTO items (nombre, descripcion, estado)
                        OUTPUT INSERTED.iditem AS iditem
                        VALUES (@nombre${i}, @descripcion${i}, @estado${i})
                    `);

                const iditem = result.recordset[0].iditem; // Obtener el id del item recién insertado
                iditems.push(iditem); // Guardamos el id del item para usarlo en la siguiente consulta
            }

            // Luego asociamos los iditems con el idcategoria en la tabla "itemcategoria"
            for (let i = 0; i < iditems.length; i++) {
                const newRequest = transaction.request(); // Nueva instancia de request en cada iteración
                await newRequest
                    .input('idcategoria', sql.Int, idcategoria)
                    .input('iditem', sql.Int, iditems[i])
                    .query(`
                    INSERT INTO itemcategoria (idcategoria, iditem)
                    VALUES (@idcategoria, @iditem)
                `);
            }

            // Confirmar la transacción después de todas las inserciones
            await transaction.commit();
            res.status(200).json({ message: 'Items registrados exitosamente' });

        } catch (error) {
            // Si hay error, deshacer cambios
            await transaction.rollback();
            console.error('Error al registrar items:', error);
            res.status(500).json({ error: 'Error al registrar items' });
        }
    } catch (error) {
        console.error('Error en la conexión con la base de datos:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = { guardarItem };
