const { poolPromise, sql } = require('../../models/conexion');

const actualizarEstadoItem = async (req, res) => {
  const { iditem, estado } = req.body;

  if (typeof iditem === 'undefined' || typeof estado === 'undefined') {
    return res.status(400).json({ mensaje: 'iditem y estado son requeridos' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('iditem', sql.Int, iditem)
      .input('estado', sql.Bit, estado)
      .query('UPDATE items SET estado = @estado WHERE iditem = @iditem');

    if (result.rowsAffected[0] > 0) {
      return res.status(200).json({ mensaje: 'Estado actualizado correctamente' });
    } else {
      return res.status(404).json({ mensaje: 'Item no encontrado' });
    }
  } catch (error) {
    console.error('Error al actualizar el estado del item:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { actualizarEstadoItem };
