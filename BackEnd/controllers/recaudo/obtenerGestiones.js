const { poolPromiseRecaudo, poolPromiseGestiones, sql } = require("../../models/conexion");

const obtenerGestiones = async (req, res) => {
  try {
    const pool = await poolPromiseRecaudo;

    const result = await pool.request().query(`
      SELECT 
        pt.idplanillatramite,
        pt.cedula,
        pt.nombre,
        pt.idtramite,
        t.nombre AS nombreTramite,
        pt.fecha,
        pt.estado,
        at.motivo,
        at.idusuario
      FROM 
        recaudo.dbo.planillatramites pt
      INNER JOIN 
        recaudo.dbo.tramite t ON pt.idtramite = t.idtramite
      LEFT JOIN 
        recaudo.dbo.anulaciontramite at ON pt.idplanillatramite = at.idplanillatramite
      ORDER BY pt.fecha DESC
    `);

    const gestiones = result.recordset;

    // Si hay anulados, traemos los nombres de los usuarios desde poolPromise1
    const idsUsuarios = gestiones
      .filter(g => g.estado === false && g.idusuario) // solo anulados con idusuario
      .map(g => g.idusuario);

    const usuariosMap = {};

    if (idsUsuarios.length > 0) {
      const pool1 = await poolPromiseGestiones;

      const usuariosResult = await pool1.request()
        .query(`
          SELECT idusuario, nombres, apellidos
          FROM usuarios
          WHERE idusuario IN (${[...new Set(idsUsuarios)].join(",")})
        `);

      usuariosResult.recordset.forEach(u => {
        usuariosMap[u.idusuario] = `${u.nombres} ${u.apellidos}`;
      });
    }

    // Añadir nombre completo del usuario anulador a las gestiones
    const gestionesConUsuario = gestiones.map(g => ({
      ...g,
      usuarioAnulo: g.estado === false && g.idusuario
        ? usuariosMap[g.idusuario] || "Usuario desconocido"
        : null
    }));

    res.json(gestionesConUsuario);
  } catch (error) {
    console.error("Error al obtener los trámites:", error.message);
    res.status(500).json({ mensaje: "Error al obtener los trámites" });
  }
};

module.exports = { obtenerGestiones };

