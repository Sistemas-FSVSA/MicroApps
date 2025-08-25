const { sql, poolPromiseAgenda } = require('./conexion');

//
// 🔹 Consultar Reservaciones con manejo de errores mejorado
//
async function getReservaciones() {
  try {
    const pool = await poolPromiseAgenda;
    const result = await pool.request()
      .query(`
        SELECT DISTINCT
          dr.id AS reservacionId,
          dr.usuario,
          dr.correo,
          d.nombre AS dependencia,
          dr.iddependencia,
          CAST(dr.inicioReservacion AS DATE) AS fechaReservacion,
          FORMAT(dr.inicioReservacion, 'HH:mm:ss') AS horaInicio,
          FORMAT(dr.finReservacion, 'HH:mm:ss') AS horaFin,
          dr.detallesReservacion,
          dr.inicioReservacion,
          dr.finReservacion
        FROM datosreservacion dr
        INNER JOIN dependencias d ON dr.iddependencia = d.iddependencia
        WHERE dr.finReservacion > GETDATE() -- Solo reservaciones futuras
          AND d.estado = 1 -- Solo dependencias activas
        ORDER BY dr.inicioReservacion ASC
      `);

    console.log('=== DEPURACIÓN DE RESERVACIONES ===');
    console.log('Total registros obtenidos:', result.recordset.length);

    result.recordset.forEach((record, index) => {
      console.log(`Registro ${index + 1}:`, {
        id: record.reservacionId,
        usuario: record.usuario,
        dependencia: record.dependencia,
        iddependencia: record.iddependencia,
        fechaReservacion: record.fechaReservacion,
        horaInicio: record.horaInicio,
        horaFin: record.horaFin,
        inicioCompleto: record.inicioReservacion,
        finCompleto: record.finReservacion
      });
    });

    console.log('=== FIN DEPURACIÓN ===');
    return result.recordset;

  } catch (error) {
    console.error('Error en getReservaciones:', error);
    throw error;
  }
}

//
// 🔹 Crear Reservación CORREGIDA - Sin tabla reservacion duplicada
//
async function crearReservacion(data) {
  const pool = await poolPromiseAgenda;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    console.log('🔄 Iniciando transacción para crear reservación...');

    // 🔹 VALIDACIONES DE DATOS
    if (!data.usuario || !data.correo || !data.dependencia || !data.fechaReservacion || !data.horaInicio || !data.horaFin) {
      throw new Error('Faltan campos obligatorios');
    }

    // Validar que la dependencia sea un número entero
    const dependenciaId = parseInt(data.dependencia);
    if (isNaN(dependenciaId)) {
      throw new Error('ID de dependencia inválido');
    }

    console.log('✅ Datos recibidos:', {
      usuario: data.usuario,
      correo: data.correo,
      dependencia: dependenciaId,
      fechaReservacion: data.fechaReservacion,
      horaInicio: data.horaInicio,
      horaFin: data.horaFin
    });

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.correo)) {
      throw new Error('Formato de correo electrónico inválido');
    }

    // 🔹 VERIFICAR QUE LA DEPENDENCIA EXISTE Y ESTÁ ACTIVA
    const requestVerificar = new sql.Request(transaction);
    const verificarDep = await requestVerificar
      .input('iddependencia', sql.Int, dependenciaId)
      .query('SELECT COUNT(*) as count, nombre FROM dependencias WHERE iddependencia = @iddependencia AND estado = 1 GROUP BY nombre');

    if (verificarDep.recordset.length === 0 || verificarDep.recordset[0].count === 0) {
      throw new Error(`La dependencia con ID ${dependenciaId} no existe o está inactiva`);
    }

    console.log('✅ Dependencia verificada:', verificarDep.recordset[0]);

    // 🔹 VALIDACIÓN DE FECHA SIMPLIFICADA
    const fechaHoy = new Date();
    const fechaReserva = new Date(data.fechaReservacion + 'T' + data.horaInicio);

    // Comparar solo con fecha actual (sin considerar hora exacta del día)
    const hoyInicio = new Date(fechaHoy.getFullYear(), fechaHoy.getMonth(), fechaHoy.getDate());
    const reservaFecha = new Date(fechaReserva.getFullYear(), fechaReserva.getMonth(), fechaReserva.getDate());

    console.log('📅 Validación de fecha:', {
      fechaHoy: hoyInicio.toISOString().split('T')[0],
      fechaReserva: reservaFecha.toISOString().split('T')[0],
      esPasada: reservaFecha < hoyInicio
    });

    if (reservaFecha < hoyInicio) {
      throw new Error('No se pueden crear reservaciones en fechas pasadas');
    }

    // 🔹 CONSTRUIR FECHAS DATETIME CORRECTAMENTE - SIN CONVERSIÓN DE ZONA HORARIA
    const inicioStr = `${data.fechaReservacion} ${data.horaInicio}`; 
    const finStr = `${data.fechaReservacion} ${data.horaFin}`;    

    console.log('🕒 Fechas construidas (formato ISO):', {
      inicioStr,
      finStr
    });

    // 🔹 VERIFICAR CONFLICTOS DE HORARIOS GLOBALES - SIN IMPORTAR LA DEPENDENCIA
    console.log('🔍 INICIANDO VALIDACIÓN DE CONFLICTOS GLOBALES...');
    console.log('📊 Datos para validar:', {
      usuario: data.usuario,
      dependenciaSolicitada: dependenciaId,
      fechaCompleta: data.fechaReservacion,
      horaInicio: data.horaInicio,
      horaFin: data.horaFin,
      inicioStr: inicioStr,
      finStr: finStr
    });

    const requestConflicto = new sql.Request(transaction);
    const conflictos = await requestConflicto
      .input('inicioStr', sql.NVarChar(19), inicioStr)
      .input('finStr', sql.NVarChar(19), finStr)
      .query(`
        SELECT 
          dr.id,
          dr.usuario,
          d.nombre as dependencia_nombre,
          dr.inicioReservacion,
          dr.finReservacion,
          FORMAT(dr.inicioReservacion, 'yyyy-MM-dd HH:mm:ss') as inicio_formateado,
          FORMAT(dr.finReservacion, 'yyyy-MM-dd HH:mm:ss') as fin_formateado,
          dr.detallesReservacion,
          -- Debug: Mostrar las comparaciones
          CASE 
            WHEN CONVERT(datetime2, @inicioStr, 120) < dr.finReservacion 
                 AND CONVERT(datetime2, @finStr, 120) > dr.inicioReservacion 
            THEN 'CONFLICTO_DETECTADO' 
            ELSE 'SIN_CONFLICTO' 
          END as estado_validacion
        FROM datosreservacion dr
        INNER JOIN dependencias d ON dr.iddependencia = d.iddependencia
        WHERE 
          dr.finReservacion > GETDATE() -- Solo reservaciones futuras
          AND d.estado = 1 -- Solo dependencias activas
        ORDER BY dr.inicioReservacion ASC
      `);

    console.log('📋 TODAS las reservaciones existentes (TODAS las dependencias):');
    conflictos.recordset.forEach((reserva, index) => {
      console.log(`   ${index + 1}. ${reserva.usuario} en ${reserva.dependencia_nombre}: ${reserva.inicio_formateado} - ${reserva.fin_formateado} [${reserva.estado_validacion}]`);
    });

    // 🔹 FILTRAR SOLO LOS CONFLICTOS REALES GLOBALES
    const conflictosReales = conflictos.recordset.filter(reserva => {
      const inicioNueva = new Date(inicioStr);
      const finNueva = new Date(finStr);
      const inicioExistente = new Date(reserva.inicioReservacion);
      const finExistente = new Date(reserva.finReservacion);

      // Lógica de superposición: Si hay ANY overlap, es conflicto
      const haySupersposicion = (inicioNueva < finExistente) && (finNueva > inicioExistente);
      
      console.log(`🔍 Validando conflicto GLOBAL con ${reserva.usuario} (${reserva.dependencia_nombre}):`, {
        nuevaSolicitud: `${data.usuario} en ${dependenciaId}: ${inicioStr} - ${finStr}`,
        existente: `${reserva.usuario} en ${reserva.dependencia_nombre}: ${reserva.inicio_formateado} - ${reserva.fin_formateado}`,
        inicioNuevaAntesDeFin: inicioNueva < finExistente,
        finNuevaDespuesDeInicio: finNueva > inicioExistente,
        hayConflicto: haySupersposicion
      });

      return haySupersposicion;
    });

    console.log(`🎯 RESULTADO FINAL: ${conflictosReales.length} conflictos GLOBALES encontrados de ${conflictos.recordset.length} reservaciones totales`);

    // 🔹 MOSTRAR DETALLES DE CONFLICTOS PARA DEBUG
    conflictosReales.forEach((conflicto, index) => {
      console.log(`❌ Conflicto GLOBAL ${index + 1}:`, {
        id: conflicto.id,
        usuario: conflicto.usuario,
        dependencia: conflicto.dependencia_nombre,
        inicio: conflicto.inicio_formateado,
        fin: conflicto.fin_formateado,
        detalles: conflicto.detallesReservacion
      });
    });

    if (conflictosReales.length > 0) {
      const conflicto = conflictosReales[0];
      const mensajeError = `🚨 CONFLICTO DE HORARIOS GLOBAL DETECTADO:
      
🔴 Reservación existente que bloquea el horario:
   • Usuario: ${conflicto.usuario}
   • Dependencia: ${conflicto.dependencia_nombre}
   • Horario: ${conflicto.inicio_formateado} - ${conflicto.fin_formateado}
   • Detalles: ${conflicto.detallesReservacion || 'Sin detalles'}

🔴 Nueva reservación solicitada (BLOQUEADA):
   • Usuario: ${data.usuario}
   • Dependencia solicitada: ID ${dependenciaId}
   • Horario solicitado: ${inicioStr} - ${finStr}

💡 POLÍTICA: No se pueden crear reservaciones en horarios que se superpongan con otras existentes, 
   sin importar la dependencia. El horario ya está ocupado.`;

      console.error('🚨 BLOQUEANDO CREACIÓN POR CONFLICTO GLOBAL:', mensajeError);
      throw new Error(`Conflicto de horarios: El horario ${inicioStr} - ${finStr} ya está ocupado por "${conflicto.usuario}" en ${conflicto.dependencia_nombre}. No se pueden crear reservaciones en horarios superpuestos.`);
    }

    console.log('✅ No hay conflictos de horario');

    // 🔹 INSERTAR NUEVA RESERVACIÓN - COMPATIBLE CON TRIGGERS
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

    // 🔹 OBTENER EL ID Y DATOS DE LA RESERVACIÓN RECIÉN INSERTADA
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
      throw new Error('No se pudo recuperar la reservación recién creada');
    }

    const nuevaReservacion = result.recordset[0];
    const nuevaReservacionId = nuevaReservacion.id;
    const inicioReservacionCompleto = nuevaReservacion.inicioReservacion;
    const finReservacionCompleto = nuevaReservacion.finReservacion;

    console.log('✅ Nueva reservación insertada:', {
      id: nuevaReservacionId,
      inicio: inicioReservacionCompleto,
      fin: finReservacionCompleto
    });

    await transaction.commit();
    console.log('✅ Transacción confirmada exitosamente');

    return {
      success: true,
      message: 'Reservacion creada correctamente',
      reservacionId: nuevaReservacionId,
      datos: {
        id: nuevaReservacionId,
        usuario: data.usuario,
        correo: data.correo,
        dependencia: dependenciaId,
        inicioReservacion: inicioReservacionCompleto,
        finReservacion: finReservacionCompleto,
        detalles: data.detallesReservacion
      }
    };

  } catch (error) {
    // ✅ VERIFICAR SI LA TRANSACCIÓN ESTÁ ACTIVA ANTES DE HACER ROLLBACK
    try {
      if (transaction && transaction.isolationLevel) {
        await transaction.rollback();
        console.log('✅ Rollback ejecutado correctamente');
      }
    } catch (rollbackError) {
      console.error('❌ Error durante rollback:', rollbackError.message);
    }

    console.error('❌ Error creando reservación:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

//
// 🔹 Función para limpiar reservaciones expiradas (opcional)
//
async function limpiarReservacionesExpiradas() {
  try {
    const pool = await poolPromiseAgenda;
    const result = await pool.request()
      .query(`
        DELETE FROM datosreservacion 
        WHERE finReservacion < DATEADD(day, -7, GETDATE());
      `);

    console.log('Reservaciones expiradas limpiadas:', result.rowsAffected);
    return result.rowsAffected;
  } catch (error) {
    console.error('Error limpiando reservaciones expiradas:', error);
    throw error;
  }
}

//
// 🔹 Función de prueba de conexión
//
async function testConnection() {
  try {
    const pool = await poolPromiseAgenda;
    const result = await pool.request().query('SELECT 1 as test');
    console.log('✅ Conexión a la base de datos exitosa');
    return { success: true, message: 'Conexión exitosa' };
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    throw error;
  }
}

//
// 🔹 Exportar funciones
//
module.exports = {
  getReservaciones,
  crearReservacion,
  limpiarReservacionesExpiradas,
  testConnection
};