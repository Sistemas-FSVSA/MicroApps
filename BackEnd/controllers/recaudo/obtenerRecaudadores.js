const { poolPromise3, sql } = require("../../models/conexion");

// Función para obtener recaudadores
const obtenerRecaudadores = async (req, res) => {
  try {
    const pool = await poolPromise3; // Obtener conexión del pool
    const result = await pool.request().query(`SELECT * FROM recaudador`); // Consulta a la tabla recaudador
    res.json(result.recordset); // Enviar los datos al frontend
  } catch (error) {
    console.error("Error al obtener recaudadores:", error.message);
    res.status(500).json({ mensaje: "Error al obtener los recaudadores" });
  }
};

module.exports = { obtenerRecaudadores };
