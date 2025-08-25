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

    // Respuesta directa a Postman
    res.json(result.recordset);

  } catch (error) {
    res.status(500).json({
      error: 'Error al obtener reservaciones',
      details: error.message
    });
  }
};

module.exports = { getReservaciones };
