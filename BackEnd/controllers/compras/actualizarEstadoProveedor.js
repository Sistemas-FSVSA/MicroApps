const { poolPromise, sql } = require('../../models/conexion');

const actualizarEstadoProveedor = async (req, res) => {
  const { idproveedor, estado } = req.body;

  if (typeof idproveedor === 'undefined' || typeof estado === 'undefined') {
    return res.status(400).json({ mensaje: 'iditem y estado son requeridos' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('idproveedor', sql.Int, idproveedor)
      .input('estado', sql.Bit, estado)
      .query('UPDATE proveedorescompras SET estado = @estado WHERE idproveedor = @idproveedor');

    if (result.rowsAffected[0] > 0) {
      return res.status(200).json({ mensaje: 'Estado actualizado correctamente' });
    } else {
      return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
    }
  } catch (error) {
    console.error('Error al actualizar el estado del Proveedor:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { actualizarEstadoProveedor };
