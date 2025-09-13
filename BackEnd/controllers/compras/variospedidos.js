// controllers/compras/variospedidos.js
const { poolPromiseGestiones, sql } = require('../../models/conexion');

const variosPedidos = async (req, res) => {
  try {
    const idusuarioRaw = req.query.idusuario ?? req.body?.idusuario;
    const idusuario = parseInt(idusuarioRaw, 10);

    if (!idusuario || Number.isNaN(idusuario)) {
      return res.status(400).json({ message: 'idusuario requerido' });
    }

    const pool = await poolPromiseGestiones;

    // Dependencias del usuario con su nombre
    const depRes = await pool.request()
      .input('idusuario', sql.Int, idusuario)
      .query(`
        SELECT d.iddependencia, d.nombre
        FROM usuariocompras uc
        JOIN dependencias d ON d.iddependencia = uc.iddependencia
        WHERE uc.idusuario = @idusuario
      `);

    if (depRes.recordset.length === 0) {
      return res.json({ dependencias: [] });
    }

    const dependencias = [];

    for (const dep of depRes.recordset) {
      // Subdependencias de la dependencia
      const subRes = await pool.request()
        .input('iddependencia', sql.Int, dep.iddependencia)
        .query(`
          SELECT idsubdependencia, nombre, estado
          FROM subdependencias
          WHERE iddependencia = @iddependencia
        `);

      // Si no tiene subdependencias, no entra al resultado
      if (subRes.recordset.length === 0) continue;

      // Pedidos en estado INICIADO de esa dependencia
      const pedidosRes = await pool.request()
        .input('iddependencia', sql.Int, dep.iddependencia)
        .query(`
          SELECT 
            p.idpedido,
            p.estado,
            p.idsubdependencia,
            s.nombre AS nombreSubdependencia
          FROM pedidos p
          LEFT JOIN subdependencias s ON s.idsubdependencia = p.idsubdependencia
          WHERE p.iddependencia = @iddependencia
            AND p.estado = 'INICIADO'
        `);

      // Si no hay pedidos INICIADO, no se incluye
      if (pedidosRes.recordset.length === 0) continue;

      dependencias.push({
        iddependencia: dep.iddependencia,
        nombreDependencia: dep.nombre,      
        subdependencias: subRes.recordset,
        pedidos: pedidosRes.recordset
      });
    }

    return res.json({ dependencias });
  } catch (err) {
    console.error('Error en variosPedidos:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { variosPedidos };
