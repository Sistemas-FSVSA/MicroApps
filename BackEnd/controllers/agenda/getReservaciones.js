const { poolPromiseAgenda, sql } = require('../../models/conexion');

const getReservaciones = async (req, res) => {
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

module.exports = { getReservaciones };