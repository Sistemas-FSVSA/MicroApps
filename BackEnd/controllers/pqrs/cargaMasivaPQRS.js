const { poolPromise, sql } = require('../../models/conexion');

const cargaMasivaPQRS = async (req, res) => {
    try {
        const { 
            idusuario, titular, cc, direccion, telefono, afiliado, contrato, plan, numeroServicio, nombreFallecido, 
            fechaFallecimiento, reclamo, fechaServicio, coordinador, proceso, tipopqrs, fuente, subfuente, 
            descripcion, correccionImplementada, seguimiento, pertinencia, eficaz, estado
        } = req.body;

        const afiliadoValue = afiliado === 'true';
        const planValue = plan === '' ? null : plan;
        const tipopqrsValue = tipopqrs === '' ? null : tipopqrs;
        const fuenteValue = fuente === '' ? null : fuente;
        const procesoValue = proceso === '' ? null : proceso;
        const subfuenteValue = subfuente === '' ? null : subfuente;
        const fechaServicioValor = (!fechaServicio || fechaServicio.trim() === "") ? null : fechaServicio;

        const pool = await poolPromise;
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

            // Insertar la gestión en gestionpqrs
            await transaction.request()
                .input('idpqrs', sql.Int, idpqrs)
                .input('fechaservicio', sql.Date, fechaServicioValor)
                .input('responsable', sql.VarChar, coordinador)
                .input('idtipoproceso', sql.Int, procesoValue)
                .input('idfuentepqrs', sql.Int, fuenteValue)
                .input('idsubfuente', sql.Int, subfuenteValue)
                .input('estado', sql.VarChar, estado)
                .input('especifico', sql.Text, descripcion)
                .input('correccion', sql.Text, correccionImplementada)
                .input('seguimiento', sql.Text, seguimiento)
                .input('pertinencia', sql.VarChar, pertinencia)
                .input('eficaz', sql.VarChar, eficaz)
                .query(`
                    INSERT INTO gestionpqrs (idpqrs, fechaservicio, responsable, idtipoproceso, idfuentepqrs, especifico, correccion, seguimiento, pertinencia, eficaz, estado, idsubfuente)
                    VALUES (@idpqrs, @fechaservicio, @responsable, @idtipoproceso, @idfuentepqrs, @especifico, @correccion, @seguimiento, @pertinencia, @eficaz, @estado, @idsubfuente)
                `);

            // Actualizar la tabla pqrs con idtipopqrs y estado
            await transaction.request()
                .input('idpqrs', sql.Int, idpqrs)
                .input('estado', sql.VarChar, estado)
                .input('idtipopqrs', sql.Int, tipopqrsValue)
                .query(`
                    UPDATE pqrs SET idtipopqrs = @idtipopqrs, estado = @estado WHERE idpqrs = @idpqrs
                `);

            // Si el estado es FINALIZADO, actualizar idusuario y fechacierre en pqrs
            if (estado === "FINALIZADO" && idusuario) {
                await transaction.request()
                    .input('idpqrs', sql.Int, idpqrs)
                    .input('idusuario', sql.Int, idusuario)
                    .query(`
                        UPDATE pqrs 
                        SET usuariocerro = @idusuario, fechacierre = GETDATE()
                        WHERE idpqrs = @idpqrs
                    `);
            }

            await transaction.commit();
            res.json({ message: 'PQRS y Gestión registrados exitosamente', idpqrs });
        } catch (error) {
            await transaction.rollback();
            console.error('Error en el proceso de registro:', error);
            res.status(500).json({ error: 'Error en el registro' });
        }
    } catch (error) {
        console.error('Error en la conexión con la base de datos:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = { cargaMasivaPQRS };
