const { poolPromise3, sql } = require("../../models/conexion");

const obtenerGestiones = async (req, res) => {
  try {
    const pool = await poolPromise3;

    const result = await pool.request().query(`
      SELECT 
        pt.idplanillatramite,
        pt.cedula,
        pt.nombre,
        pt.idtramite,
        t.nombre AS nombreTramite,
        pt.fecha
      FROM 
        recaudo.dbo.planillatramites pt
      INNER JOIN 
        recaudo.dbo.tramite t ON pt.idtramite = t.idtramite
      ORDER BY pt.fecha DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Error al obtener los trámites:", error.message);
    res.status(500).json({ mensaje: "Error al obtener los trámites" });
  }
};

module.exports = { obtenerGestiones };

