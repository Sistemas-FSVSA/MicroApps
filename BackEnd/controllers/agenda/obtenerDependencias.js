const { poolPromiseAgenda, sql } = require('../../models/conexion');

const obtenerDependencias = async (req, res) => {
  try {
    const { id } = req.params; // puede venir o no

    const pool = await poolPromiseAgenda;
    const request = pool.request();

    let query = `
      SELECT iddependencia, nombre, estado
      FROM dependencias
      WHERE estado = 1
    `;

    if (id) {
      const idNum = parseInt(id);
      if (isNaN(idNum)) {
        return res.status(400).json({ error: 'ID de dependencia inválido' });
      }
      request.input('id', sql.Int, idNum);
      query += ` AND iddependencia = @id`;
    }

    query += ` ORDER BY nombre ASC`;

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.json([]); // no encontrada o no hay activas
    }

    // Filtrar dependencias con datos completos
    const dependenciasValidas = result.recordset.filter(
      dep => dep.iddependencia && dep.nombre
    );

    res.json(dependenciasValidas);

  } catch (err) {
    res.status(500).json({
      error: 'Error al obtener dependencias',
      details: err.message
    });
  }
};

module.exports = { obtenerDependencias };
