const { poolPromiseAgenda, sql } = require('../../models/conexion');

const obtenerReservaciones = async (req, res) => {
  try {
    const { mes } = req.params;

    // Validar parámetro de mes (1 a 12)
    const mesNum = parseInt(mes, 10);
    if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
      return res.status(400).json({ error: 'Mes inválido, debe ser un número entre 1 y 12' });
    }

    const pool = await poolPromiseAgenda;
    const result = await pool.request()
      .input('mes', sql.Int, mesNum)
      .query(`
        SELECT
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
        WHERE dr.finReservacion > GETDATE()      -- Solo reservaciones futuras
          AND d.estado = 1                      -- Solo dependencias activas
          AND MONTH(dr.inicioReservacion) = @mes -- Filtrar por mes
        ORDER BY dr.inicioReservacion ASC
      `);

    return res.json(result.recordset);

  } catch (error) {
    return res.status(500).json({
      error: 'Error al obtener reservaciones',
      details: error.message
    });
  }
};

module.exports = { obtenerReservaciones };
