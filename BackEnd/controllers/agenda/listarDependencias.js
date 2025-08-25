const { poolPromiseAgenda, sql } = require('../../models/conexion');

const listarDependencias = async (req, res) => {
  try {
    const pool = await poolPromiseAgenda;
    const result = await pool.request().query(`
      SELECT iddependencia, nombre, estado
      FROM dependencias 
      WHERE estado = 1
      ORDER BY nombre ASC
    `);

    // Validar que tenemos dependencias activas
    if (result.recordset.length === 0) {
      return res.json([]);
    }

    // Filtrar dependencias con datos completos
    const dependenciasValidas = result.recordset.filter(dep => dep.iddependencia && dep.nombre);

    res.json(dependenciasValidas);

  } catch (err) {
    res.status(500).json({
      error: 'Error al obtener dependencias',
      details: err.message
    });
  }
};

module.exports = {
  listarDependencias
};
