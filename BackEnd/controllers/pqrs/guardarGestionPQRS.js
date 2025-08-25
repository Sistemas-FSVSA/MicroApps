const { deflate } = require('zlib');
const { poolPromiseGestiones, sql } = require('../../models/conexion');

const guardarGestionPQRS = async (req, res) => {
    try {
        const {
            idpqrs, fechaServicio, coordinador, proceso, tipopqrs, fuente,
            descripcion, correccionImplementada, seguimiento, pertinencia, eficaz, estado, idusuario, subfuente,
            titular, cc, direccion, telefono, nombreFallecido, fechaFallecimiento,
            afiliado, contrato, plan, numeroServicio, detalle
        } = req.body;

        const tipopqrsValue = tipopqrs === '' ? null : tipopqrs;
        const fuenteValue = fuente === '' ? null : fuente;
        const procesoValue = proceso === '' ? null : proceso;
        const subfuenteValue = subfuente === '' ? null : subfuente;
        const fechaServicioValor = (!fechaServicio || fechaServicio.trim() === "") ? null : fechaServicio;
        const planValue = plan === '' ? null : plan;

        const pool = await poolPromiseGestiones;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const currentDataResult = await transaction.request()
                .input('idpqrs', sql.Int, idpqrs)
                .query(`
                    SELECT 
                        p.idtipopqrs, p.estado, p.servicio,
                        d.titular, d.identificacion, d.direccion, d.telefono,
                        d.fallecido, d.fechafallecimiento,
                        p.afiliado, p.contrato, p.idtipoplan, p.detalle
                    FROM pqrs p
                    INNER JOIN datospqrs d ON p.idpqrs = d.idpqrs
                    WHERE p.idpqrs = @idpqrs
                `);

            const current = currentDataResult.recordset[0];

            const nuevosValores = {
                pqrs: {
                    idtipopqrs: tipopqrsValue,
                    estado,
                    servicio: numeroServicio
                },
                datospqrs: {
                    titular,
                    detalle,
                    identificacion: cc,
                    direccion,
                    telefono,
                    fallecido: nombreFallecido,
                    fechafallecimiento: fechaFallecimiento || null,
                    afiliado,
                    contrato,
                    idtipoplan: planValue
                }
            };

            const normalize = val => {
                if (val === null || val === undefined) return null;
                if (val instanceof Date) return val.toISOString().split('T')[0];

                const str = val.toString().trim();
                if (str === '' || str === '0') return null; // ⚠️ considera "0" como null/vacío
                return str;
            };



            // Bitácora de cambios para PQRS
            for (const [campo, nuevoValor] of Object.entries(nuevosValores.pqrs)) {
                const oldVal = normalize(current[campo]);
                const newVal = normalize(nuevoValor);

                // Solo guardar si los valores no son ambos nulos y son realmente distintos
                const ambosNulos = oldVal === null && newVal === null;

                if (!ambosNulos && oldVal !== newVal) {
                    await transaction.request()
                        .input('idpqrs', sql.Int, idpqrs)
                        .input('campo', sql.VarChar, campo)
                        .input('valoranterior', sql.VarChar, oldVal ?? '')
                        .input('valornuevo', sql.VarChar, newVal ?? '')
                        .input('fecha', sql.DateTime, new Date())
                        .input('idusuario', sql.Int, idusuario)
                        .query(`
            INSERT INTO bitacoracambioPQRS (idpqrs, campo, valoranterior, valornuevo, fecha, idusuario)
            VALUES (@idpqrs, @campo, @valoranterior, @valornuevo, @fecha, @idusuario)
        `);
                }

            }

            // Bitácora de cambios para DATOSPQRS
            for (const [campo, nuevoValor] of Object.entries(nuevosValores.datospqrs)) {
                const oldVal = normalize(current[campo]);
                const newVal = normalize(nuevoValor);
                if (oldVal !== newVal) {
                    await transaction.request()
                        .input('idpqrs', sql.Int, idpqrs)
                        .input('campo', sql.VarChar, campo)
                        .input('valoranterior', sql.VarChar, oldVal)
                        .input('valornuevo', sql.VarChar, newVal)
                        .input('fecha', sql.DateTime, new Date())
                        .input('idusuario', sql.Int, idusuario)
                        .query(`
                            INSERT INTO bitacoracambioPQRS (idpqrs, campo, valoranterior, valornuevo, fecha, idusuario)
                            VALUES (@idpqrs, @campo, @valoranterior, @valornuevo, @fecha, @idusuario)
                        `);
                }
            }

            // Actualizar/inserción de gestión PQRS
            const gestionExistente = await transaction.request()
                .input('idpqrs', sql.Int, idpqrs)
                .query(`SELECT COUNT(*) AS count FROM gestionpqrs WHERE idpqrs = @idpqrs`);

            if (gestionExistente.recordset[0].count > 0) {
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

            // Actualizar DATOSPQRS
            await transaction.request()
                .input('titular', sql.VarChar, titular)
                .input('identificacion', sql.VarChar, cc)
                .input('direccion', sql.VarChar, direccion)
                .input('telefono', sql.VarChar, telefono)
                .input('fechafallecimiento', sql.Date, fechaFallecimiento || null)
                .input('fallecido', sql.VarChar, nombreFallecido)
                .input('idpqrs', sql.Int, idpqrs)
                .query(`
        UPDATE datospqrs SET 
            titular = @titular, 
            identificacion = @identificacion,
            direccion = @direccion,
            telefono = @telefono,
            fechafallecimiento = @fechafallecimiento,
            fallecido = @fallecido
        WHERE idpqrs = @idpqrs
    `);

            // Actualizar PQRS
            await transaction.request()
                .input('idpqrs', sql.Int, idpqrs)
                .input('estado', sql.VarChar, estado)
                .input('idtipopqrs', sql.Int, tipopqrsValue)
                .input('servicio', sql.VarChar, numeroServicio)
                .input('afiliado', sql.VarChar, afiliado)
                .input('contrato', sql.VarChar, contrato)
                .input('idtipoplan', sql.VarChar, planValue)
                .input('detalle', sql.VarChar, detalle)
                .query(`
                    UPDATE pqrs 
                    SET 
                        idtipopqrs = @idtipopqrs,
                        estado = @estado,
                        servicio = @servicio,
                        afiliado = @afiliado,
                        contrato = @contrato,
                        idtipoplan = @idtipoplan,
                        detalle = @detalle
                    WHERE idpqrs = @idpqrs
                `);


            // Cierre automático si FINALIZADO
            if (estado === "FINALIZADO" && idusuario) {
                await transaction.request()
                    .input('idpqrs', sql.Int, idpqrs)
                    .input('idusuario', sql.Int, idusuario)
                    .query(`UPDATE pqrs SET usuariocerro = @idusuario, fechacierre = GETDATE() WHERE idpqrs = @idpqrs`);
            }

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
