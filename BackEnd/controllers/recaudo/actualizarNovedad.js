const { poolPromiseRecaudo, sql } = require('../../models/conexion');

const actualizarNovedad = async (req, res) => {
  const { idgestion, estado } = req.body;

  // Validaciones
  if (!idgestion || isNaN(idgestion)) {
    return res.status(400).json({ error: "El idgestion es inválido." });
  }

  if (!estado || typeof estado !== 'string') {
    return res.status(400).json({ error: "El estado es inválido." });
  }

  try {
    const pool = await poolPromiseRecaudo; // Obtener conexión al pool

    // Realizar la actualización con el estado proporcionado
    const result = await pool.request()
      .input("idgestion", sql.Int, idgestion)
      .input("estado", sql.VarChar, estado)
      .query(`
        UPDATE gestion
        SET estado = @estado, fechacerrado = GETDATE()
        WHERE idgestion = @idgestion
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Novedad no encontrada o ya cerrada." });
    }

    res.status(200).json({ message: `Novedad actualizada a estado: ${estado}` });
  } catch (error) {
    console.error("Error al actualizar la novedad:", error);
    res.status(500).json({ error: "Error al actualizar la novedad" });
  }
};

module.exports = { actualizarNovedad };
