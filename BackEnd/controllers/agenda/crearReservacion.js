const { poolPromiseAgenda, sql } = require('../../models/conexion');

const crearReservacion = async (req, res) => {
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

    // 🔹 Construir fechas
    const inicioStr = `${data.fechaReservacion} ${data.horaInicio}`;
    const finStr = `${data.fechaReservacion} ${data.horaFin}`;

    // 🔹 Verificar conflictos globales
    const requestConflicto = new sql.Request(transaction);
    const conflictos = await requestConflicto
      .input('inicioStr', sql.NVarChar(19), inicioStr)
      .input('finStr', sql.NVarChar(19), finStr)
      .query(`
        SELECT dr.inicioReservacion, dr.finReservacion
        FROM datosreservacion dr
        INNER JOIN dependencias d ON dr.iddependencia = d.iddependencia
        WHERE dr.finReservacion > GETDATE()
          AND d.estado = 1
      `);

    const conflictosReales = conflictos.recordset.filter(reserva => {
      const inicioNueva = new Date(inicioStr);
      const finNueva = new Date(finStr);
      const inicioExistente = new Date(reserva.inicioReservacion);
      const finExistente = new Date(reserva.finReservacion);
      return (inicioNueva < finExistente) && (finNueva > inicioExistente);
    });

    if (conflictosReales.length > 0) {
      return res.status(400).json({ error: 'Conflicto de horarios: Ya existe una reservación en este rango de tiempo.' });
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
    } catch (_) {}

    return res.status(500).json({
      error: 'Error creando reservación',
      details: error.message
    });
  }
};

module.exports = { crearReservacion };
