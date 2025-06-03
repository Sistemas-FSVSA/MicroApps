const { poolPromise, sql } = require('../../models/conexion');

const actualizarUsuario = async (req, res) => {
    try {
        const { idusuario, dependencias } = req.body;

        if (!idusuario || !dependencias || Object.keys(dependencias).length === 0) {
            return res.status(400).json({ mensaje: 'Datos incompletos para actualizar.' });
        }

        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        try {
            const request = new sql.Request(transaction);

            // 1. Eliminar dependencias existentes del usuario
            await request
                .input('idusuario', sql.Int, idusuario)
                .query(`
                    DELETE FROM usuariocompras WHERE idusuario = @idusuario
                `);

            // 2. Insertar las nuevas dependencias
            const dependenciasIds = Object.keys(dependencias).map(id => parseInt(id));

            for (let iddependencia of dependenciasIds) {
                const insertRequest = new sql.Request(transaction); // NUEVO Request por cada insert

                await insertRequest
                    .input('idusuario', sql.Int, idusuario)
                    .input('iddependencia', sql.Int, iddependencia)
                    .input('tipo', sql.Int, '1')
                    .query(`
            INSERT INTO usuariocompras (idusuario, iddependencia, tipo )
            VALUES (@idusuario, @iddependencia, @tipo)
        `);
            }


            await transaction.commit();

            console.log(`Dependencias del usuario ${idusuario} actualizadas:`, dependencias);

            return res.json({ mensaje: 'Dependencias actualizadas exitosamente.' });

        } catch (err) {
            await transaction.rollback();
            console.error('Error durante la transacción:', err);
            return res.status(500).json({ mensaje: 'Error al actualizar dependencias.' });
        }

    } catch (error) {
        console.error('Error general en actualizarUsuario:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

module.exports = { actualizarUsuario };
