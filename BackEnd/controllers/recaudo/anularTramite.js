const { poolPromiseRecaudo, sql } = require("../../models/conexion");

// POST /api/recaudo/anularTramite
const anularTramite = async (req, res) => {
  try {
    const { idplanillatramite, motivo, idusuario } = req.body;

    // Validaciones básicas
    if (!idplanillatramite || !motivo || !idusuario) {
      return res.status(400).json({ message: "Faltan datos requeridos." });
    }

    const pool = await poolPromiseRecaudo;
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      // 1. Actualizar estado en planillatramites
      await transaction.request()
        .input("idplanillatramite", sql.Int, idplanillatramite)
        .query(`
          UPDATE [recaudo].[dbo].[planillatramites]
          SET estado = 0
          WHERE idplanillatramite = @idplanillatramite
        `);

      // 2. Insertar registro en anulaciontramite
      await transaction.request()
        .input("idplanillatramite", sql.Int, idplanillatramite)
        .input("motivo", sql.VarChar(255), motivo)
        .input("idusuario", sql.Int, idusuario)
        .query(`
          INSERT INTO [recaudo].[dbo].[anulaciontramite] (idplanillatramite, motivo, idusuario)
          VALUES (@idplanillatramite, @motivo, @idusuario)
        `);

      await transaction.commit();

      res.status(200).json({ message: "Trámite anulado con éxito." });
    } catch (err) {
      await transaction.rollback();
      console.error("Error en transacción de anulación:", err);
      res.status(500).json({ message: "Error al anular el trámite." });
    }

  } catch (error) {
    console.error("Error general en anularTramite:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

module.exports = { anularTramite };

