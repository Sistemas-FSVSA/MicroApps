const { poolPromiseAgenda, sql } = require('../../models/conexion');

const guardarReservacion = async (req, res) => {
    const pool = await poolPromiseAgenda;
    const transaction = new sql.Transaction(pool);

    try {
        const data = req.body; // 🔹 Capturar datos enviados por POSTMAN

        await transaction.begin();

        // 🔹 VALIDACIONES DE DATOS
        if (!data.usuario || !data.correo || !data.dependencia || !data.fechaReservacion || !data.horaInicio || !data.horaFin) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        const dependenciaId = parseInt(data.dependencia);
        if (isNaN(dependenciaId)) {
            return res.status(400).json({ error: 'ID de dependencia inválido' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.correo)) {
            return res.status(400).json({ error: 'Formato de correo electrónico inválido' });
        }

        // 🔹 Verificar dependencia activa
        const requestVerificar = new sql.Request(transaction);
        const verificarDep = await requestVerificar
            .input('iddependencia', sql.Int, dependenciaId)
            .query('SELECT COUNT(*) as count FROM dependencias WHERE iddependencia = @iddependencia AND estado = 1');

        if (verificarDep.recordset.length === 0 || verificarDep.recordset[0].count === 0) {
            return res.status(400).json({ error: `La dependencia con ID ${dependenciaId} no existe o está inactiva` });
        }

        // 🔹 Validar fechas
        const fechaHoy = new Date();
        const fechaReserva = new Date(data.fechaReservacion + 'T' + data.horaInicio);
        const hoyInicio = new Date(fechaHoy.getFullYear(), fechaHoy.getMonth(), fechaHoy.getDate());

        if (fechaReserva < hoyInicio) {
            return res.status(400).json({ error: 'No se pueden crear reservaciones en fechas pasadas' });
        }

        // 🔹 Validar que hora fin sea mayor que hora inicio
        const [horaI, minI] = data.horaInicio.split(':');
        const [horaF, minF] = data.horaFin.split(':');
        const inicioMinutos = parseInt(horaI) * 60 + parseInt(minI);
        const finMinutos = parseInt(horaF) * 60 + parseInt(minF);

        if (finMinutos <= inicioMinutos) {
            return res.status(400).json({ error: 'La hora de finalización debe ser mayor que la hora de inicio' });
        }

        // 🔹 Construir fechas completas para comparación
        const inicioStr = `${data.fechaReservacion} ${data.horaInicio}`;
        const finStr = `${data.fechaReservacion} ${data.horaFin}`;

        // 🔹 ✅ VALIDACIÓN DE CONFLICTOS MEJORADA - EVITA SOLAPAMIENTOS
        const requestConflicto = new sql.Request(transaction);
        const conflictos = await requestConflicto
            .input('fechaReservacion', sql.Date, data.fechaReservacion)
            .input('inicioStr', sql.NVarChar(19), inicioStr)
            .input('finStr', sql.NVarChar(19), finStr)
            .query(`
                SELECT 
                    dr.inicioReservacion, 
                    dr.finReservacion,
                    dr.usuario,
                    FORMAT(dr.inicioReservacion, 'HH:mm') as horaInicio,
                    FORMAT(dr.finReservacion, 'HH:mm') as horaFin
                FROM datosreservacion dr
                INNER JOIN dependencias d ON dr.iddependencia = d.iddependencia
                WHERE CAST(dr.inicioReservacion AS DATE) = @fechaReservacion
                  AND dr.finReservacion > GETDATE()
                  AND d.estado = 1
                  AND (
                    -- Verificar solapamiento de horarios: nueva reservación se solapa con existente
                    (CONVERT(datetime2, @inicioStr, 120) < dr.finReservacion) 
                    AND 
                    (CONVERT(datetime2, @finStr, 120) > dr.inicioReservacion)
                  )
            `);

        if (conflictos.recordset.length > 0) {
            const reservacionEnConflicto = conflictos.recordset[0];
            return res.status(400).json({ 
                error: 'HORARIO_NO_DISPONIBLE',
                message: `El horario de ${data.horaInicio} a ${data.horaFin} se solapa con una reservación existente.`,
                conflicto: {
                    usuario: reservacionEnConflicto.usuario,
                    horaInicio: reservacionEnConflicto.horaInicio,
                    horaFin: reservacionEnConflicto.horaFin,
                    fechaCompleta: reservacionEnConflicto.inicioReservacion
                }
            });
        }

        // 🔹 Insertar reservación
        const requestInsert = new sql.Request(transaction);
        await requestInsert
            .input('usuario', sql.NVarChar(100), data.usuario.trim())
            .input('correo', sql.NVarChar(150), data.correo.trim().toLowerCase())
            .input('iddependencia', sql.Int, dependenciaId)
            .input('inicioStr', sql.NVarChar(19), inicioStr)
            .input('finStr', sql.NVarChar(19), finStr)
            .input('detallesReservacion', sql.NVarChar(sql.MAX), data.detallesReservacion || null)
            .query(`
                INSERT INTO datosreservacion (usuario, correo, iddependencia, inicioReservacion, finReservacion, detallesReservacion)
                VALUES (
                  @usuario, 
                  @correo, 
                  @iddependencia, 
                  CONVERT(datetime2, @inicioStr, 120), 
                  CONVERT(datetime2, @finStr, 120), 
                  @detallesReservacion
                );
            `);

        // 🔹 Obtener reservación recién creada
        const requestGetData = new sql.Request(transaction);
        const result = await requestGetData
            .input('usuario', sql.NVarChar(100), data.usuario.trim())
            .input('correo', sql.NVarChar(150), data.correo.trim().toLowerCase())
            .input('iddependencia', sql.Int, dependenciaId)
            .input('inicioStr', sql.NVarChar(19), inicioStr)
            .query(`
                SELECT TOP 1 id, inicioReservacion, finReservacion
                FROM datosreservacion 
                WHERE usuario = @usuario 
                  AND correo = @correo 
                  AND iddependencia = @iddependencia
                  AND FORMAT(inicioReservacion, 'yyyy-MM-dd HH:mm:ss') = @inicioStr
                ORDER BY id DESC
            `);

        if (result.recordset.length === 0) {
            return res.status(500).json({ error: 'No se pudo recuperar la reservación recién creada' });
        }

        await transaction.commit();

        return res.json({
            success: true,
            message: 'Reservación creada correctamente',
            reservacion: result.recordset[0]
        });

    } catch (error) {
        try {
            if (transaction && transaction.isolationLevel) {
                await transaction.rollback();
            }
        } catch (_) { }

        return res.status(500).json({
            error: 'Error creando reservación',
            details: error.message
        });
    }
};

module.exports = { guardarReservacion };