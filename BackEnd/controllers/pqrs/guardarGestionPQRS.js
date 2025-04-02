const { poolPromise, sql } = require('../../models/conexion');

const guardarGestionPQRS = async (req, res) => {
    try {
        const {
            idpqrs, fechaServicio, coordinador, proceso, tipopqrs, fuente,
            descripcion, correccionImplementada, seguimiento, pertinencia, eficaz, estado, idusuario, subfuente
        } = req.body;

        const tipopqrsValue = tipopqrs === '' ? null : tipopqrs;
        const fuenteValue = fuente === '' ? null : fuente;
        const procesoValue = proceso === '' ? null : proceso;
        const subfuenteValue = subfuente === '' ? null : subfuente;
        // Si fechaServicio es null, vacío o undefined, lo establecemos explícitamente como null
        const fechaServicioValor = (!fechaServicio || fechaServicio.trim() === "") ? null : fechaServicio;


        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Verificar si ya existe una gestión para el idpqrs
            const gestionExistente = await transaction.request()
                .input('idpqrs', sql.Int, idpqrs)
                .query(`SELECT COUNT(*) AS count FROM gestionpqrs WHERE idpqrs = @idpqrs`);

            if (gestionExistente.recordset[0].count > 0) {
                // Si existe, actualizar la gestión existente
                await transaction.request()
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
                    .input('idpqrs', sql.Int, idpqrs)
                    .query(`
                        UPDATE gestionpqrs 
                        SET fechaservicio = @fechaservicio, responsable = @responsable, idtipoproceso = @idtipoproceso, 
                            idfuentepqrs = @idfuentepqrs, especifico = @especifico, correccion = @correccion, 
                            seguimiento = @seguimiento, pertinencia = @pertinencia, eficaz = @eficaz, estado = @estado, idsubfuente = @idsubfuente
                        WHERE idpqrs = @idpqrs
                    `);
            } else {
                // Si no existe, insertar una nueva gestión
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
            }

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

            // Confirmar la transacción
            await transaction.commit();

            res.json({ message: 'Gestión PQRS procesada exitosamente' });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al procesar la gestión PQRS:', error);
            res.status(500).json({ error: 'Error al procesar la gestión PQRS' });
        }
    } catch (error) {
        console.error('Error en la conexión con la base de datos', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};


module.exports = { guardarGestionPQRS };
