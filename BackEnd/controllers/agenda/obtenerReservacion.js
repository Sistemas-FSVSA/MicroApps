const { poolPromiseAgenda, sql } = require('../../models/conexion');

const obtenerReservacionPorId = async (req, res) => {
  try {
    const { idreservacion } = req.params;

    // Validar que venga el id y sea número
    const idNum = parseInt(idreservacion, 10);
    if (!idreservacion || isNaN(idNum)) {
      return res.status(400).json({ error: 'idreservacion inválido. Debe enviarse un número en params.' });
    }

    const pool = await poolPromiseAgenda;
    const result = await pool.request()
      .input('id', sql.Int, idNum)
      .query(`
        SELECT
          dr.id AS reservacionId,
          dr.usuario,
          dr.correo,
          dr.inicioReservacion,
          dr.finReservacion,
          dr.detallesReservacion,
          dr.iddependencia,
          d.nombre AS dependencia,
          d.estado AS dependenciaEstado,
          CAST(dr.inicioReservacion AS DATE) AS fechaReservacion,
          FORMAT(dr.inicioReservacion, 'HH:mm:ss') AS horaInicio,
          FORMAT(dr.finReservacion, 'HH:mm:ss') AS horaFin
        FROM datosreservacion dr
        LEFT JOIN dependencias d ON dr.iddependencia = d.iddependencia
        WHERE dr.id = @id
      `);

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ error: 'Reservación no encontrada' });
    }

    return res.json(result.recordset[0]);

  } catch (err) {
    return res.status(500).json({
      error: 'Error al obtener reservación',
      details: err.message
    });
  }
};

module.exports = { obtenerReservacionPorId };
