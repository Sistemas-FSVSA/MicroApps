const { poolPromiseRecaudo, sql } = require("../../models/conexion");

// POST /api/recaudo/guardarTramite
const guardarTramite = async (req, res) => {
  try {
    const {
      cedula,
      idrecaudador,
      idtramite,
      fecha,
      nombre,
      idusuario,
      cantidad
    } = req.body;

    // Validaciones básicas
    if (!cedula || !idrecaudador || !idtramite || !fecha || !cantidad) {
      return res.status(400).json({ message: "Faltan datos requeridos." });
    }

    const pool = await poolPromiseRecaudo;

    // Convertimos la cantidad a número entero
    const repeticiones = parseInt(cantidad, 10);

    for (let i = 0; i < repeticiones; i++) {
      await pool.request()
        .input("cedula", sql.VarChar(20), cedula)
        .input("nombre", sql.VarChar(100), nombre)
        .input("idtramite", sql.Int, parseInt(idtramite))
        .input("fecha", sql.DateTime, new Date(fecha))
        .input("idrecaudador", sql.Int, parseInt(idrecaudador))
        .input("idgenero", sql.Int, parseInt(idusuario))
        .input("estado", sql.Bit, 1)
        .query(`
          INSERT INTO [recaudo].[dbo].[planillatramites]
          (cedula, nombre, idtramite, fecha, idrecaudador, idgenero, estado)
          VALUES (@cedula, @nombre, @idtramite, @fecha, @idrecaudador, @idgenero, @estado)
        `);
    }

    res.status(200).json({ message: `Se registraron ${repeticiones} gestiones correctamente.` });

  } catch (error) {
    console.error("Error al registrar trámite:", error);
    res.status(500).json({ message: "Error interno al registrar trámite." });
  }
};

module.exports = { guardarTramite };
