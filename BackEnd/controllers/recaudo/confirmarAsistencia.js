const { poolPromiseRecaudo, sql } = require("../../models/conexion");

// POST /api/recaudo/confirmarAsistencia
const confirmarAsistencia = async (req, res) => {
  try {
    const { idrecaudador } = req.body;

    if (!idrecaudador) {
      return res.status(400).json({ message: "Falta el idrecaudador." });
    }

    const pool = await poolPromiseRecaudo;

    await pool.request()
      .input("idrecaudador", sql.Int, idrecaudador)
      .query(`
        UPDATE recaudador
        SET ultimoregistro = GETDATE()
        WHERE idrecaudador = @idrecaudador AND estado = 1
      `);

    res.status(200).json({ message: "Asistencia confirmada correctamente." });
  } catch (error) {
    console.error("Error al confirmar asistencia:", error);
    res.status(500).json({ message: "Error interno al confirmar asistencia." });
  }
};

module.exports = { confirmarAsistencia };

