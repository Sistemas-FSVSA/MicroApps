const { poolPromiseGestiones, sql } = require('../../models/conexion');

const guardarPQRS = async (req, res) => {
    try {
        const { idusuario, titular, cc, direccion, telefono, afiliado, contrato, plan, numeroServicio, nombreFallecido, fechaFallecimiento, reclamo } = req.body;

        // Convertir 'true'/'false' a booleano para SQL Server
        const afiliadoValue = afiliado === 'true' ? true : false;


        // Si `plan` es una cadena vacía, establecerlo en `NULL`
        const planValue = plan === '' ? null : plan;

        const pool = await poolPromiseGestiones;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Insertar en la tabla pqrs
            const pqrsResult = await transaction.request()
                .input('afiliado', sql.Bit, afiliadoValue)
                .input('contrato', sql.VarChar, contrato)
                .input('plan', sql.Int, planValue)
                .input('servicio', sql.VarChar, numeroServicio)
                .input('detalle', sql.Text, reclamo)
                .input('idtipopqrs', sql.Int, null)
                .input('idusuario', sql.Int, idusuario)
                .query(`
                    INSERT INTO pqrs (fechapqrs, afiliado, contrato, idtipoplan, servicio, detalle, idtipopqrs, idusuario, estado)
                    OUTPUT INSERTED.idpqrs
                    VALUES (GETDATE(), @afiliado, @contrato, @plan, @servicio, @detalle, @idtipopqrs, @idusuario, 'RECIBIDO')
                `);


            // Obtener el idpqrs correctamente desde `recordset`
            const idpqrs = pqrsResult.recordset[0].idpqrs;

            // Insertar en la tabla datospqrs
            await transaction.request()
                .input('idpqrs', sql.Int, idpqrs)
                .input('titular', sql.VarChar, titular)
                .input('identificacion', sql.VarChar, cc)
                .input('direccion', sql.VarChar, direccion)
                .input('telefono', sql.VarChar, telefono)
                .input('fechafallecimiento', sql.Date, fechaFallecimiento)
                .input('fallecido', sql.VarChar, nombreFallecido)
                .query(`
                    INSERT INTO datospqrs (idpqrs, titular, identificacion, direccion, telefono, fechafallecimiento, fallecido)
                    VALUES (@idpqrs, @titular, @identificacion, @direccion, @telefono, @fechafallecimiento, @fallecido)
                `);

            // Confirmar la transacción
            await transaction.commit();

            res.json({ message: 'PQRS registrado exitosamente', idpqrs });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al registrar PQRS:', error);
            res.status(500).json({ error: 'Error al registrar PQRS' });
        }
    } catch (error) {
        console.error('Error en la conexión con la base de datos', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = { guardarPQRS };
