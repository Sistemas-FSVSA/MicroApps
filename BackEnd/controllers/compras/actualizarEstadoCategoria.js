const { poolPromise, sql } = require('../../models/conexion');

const actualizarEstadoCategoria = async (req, res) => {
  const { idcategoriaitem, estado } = req.body;

  if (typeof idcategoriaitem === 'undefined' || typeof estado === 'undefined') {
    return res.status(400).json({ mensaje: 'iditem y estado son requeridos' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('idcategoriaitem', sql.Int, idcategoriaitem)
      .input('estado', sql.Bit, estado)
      .query('UPDATE categoriaitem SET estado = @estado WHERE idcategoriaitem = @idcategoriaitem');

    if (result.rowsAffected[0] > 0) {
      return res.status(200).json({ mensaje: 'Estado actualizado correctamente' });
    } else {
      return res.status(404).json({ mensaje: 'Categoria no encontrado' });
    }
  } catch (error) {
    console.error('Error al actualizar el estado del Categoria:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { actualizarEstadoCategoria };
