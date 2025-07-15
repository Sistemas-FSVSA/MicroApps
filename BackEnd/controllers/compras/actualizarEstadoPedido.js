const { poolPromiseGestiones, sql } = require('../../models/conexion');

const actualizarEstadoPedido = async (req, res) => {
  const { idpedido, estado, idusuario } = req.body;

  if (typeof idpedido === 'undefined' || typeof estado === 'undefined') {
    return res.status(400).json({ mensaje: 'idpedido y estado son requeridos' });
  }

  try {
    const pool = await poolPromiseGestiones;
    const request = pool.request()
      .input('idpedido', sql.Int, idpedido)
      .input('estado', sql.VarChar, estado);

    let query = 'UPDATE pedidos SET estado = @estado WHERE idpedido = @idpedido';

    // Si el estado es "ENTREGADO", también actualiza fechaentrega e idusuariorecibio
    if (estado === 'ENTREGADO') {
      if (typeof idusuario === 'undefined') {
        return res.status(400).json({ mensaje: 'idusuario es requerido cuando el estado es ENTREGADO' });
      }
      request.input('idusuario', sql.Int, idusuario);
      query = `
        UPDATE pedidos 
        SET estado = @estado, fechaentrega = GETDATE(), idusuariorecibio = @idusuario
        WHERE idpedido = @idpedido
      `;
    }

    const result = await request.query(query);

    if (result.rowsAffected[0] > 0) {
      return res.status(200).json({ mensaje: 'Estado actualizado correctamente' });
    } else {
      return res.status(404).json({ mensaje: 'pedido no encontrado' });
    }
  } catch (error) {
    console.error('Error al actualizar el estado del pedido:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { actualizarEstadoPedido };
