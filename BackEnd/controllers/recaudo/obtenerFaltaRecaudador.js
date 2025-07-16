const { poolPromiseRecaudo, sql } = require("../../models/conexion");

// GET /api/recaudo/faltaRecaudador
const obtenerFaltaRecaudador = async (req, res) => {
  try {
    const pool = await poolPromiseRecaudo;

    // Obtenemos la fecha de hoy a medianoche
    const fechaHoy = new Date();
    fechaHoy.setHours(0, 0, 0, 0);

    const result = await pool.request()
      .input("fechaHoy", sql.DateTime, fechaHoy)
      .query(`
        SELECT r.*
        FROM recaudador r
        WHERE r.idrecaudador NOT IN (
          SELECT DISTINCT pt.idrecaudador
          FROM planillatramites pt
          WHERE CONVERT(date, pt.fecha) = CONVERT(date, @fechaHoy)
        )
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error al obtener recaudadores que faltan:", error);
    res.status(500).json({ message: "Error al obtener los recaudadores que no han registrado trámite hoy." });
  }
};

module.exports = { obtenerFaltaRecaudador };
