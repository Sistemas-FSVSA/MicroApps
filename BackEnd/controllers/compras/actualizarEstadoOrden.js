const { poolPromise, sql } = require('../../models/conexion');

const actualizarEstadoOrden = async (req, res) => {
    const { idorden, estado } = req.body;

    if (typeof idorden === 'undefined' || typeof estado === 'undefined') {
        return res.status(400).json({ mensaje: 'idorden y estado son requeridos' });
    }

    try {
        const pool = await poolPromise;
        const request = pool.request()
            .input('idorden', sql.Int, idorden)
            .input('estado', sql.VarChar, estado);

        // Primero actualizar el estado
        let query = 'UPDATE orden SET estado = @estado WHERE idorden = @idorden';
        const result = await request.query(query);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ mensaje: 'Pedido no encontrado' });
        }

        // Si el estado es ANULADO, eliminar registros de ordenpedido
        if (estado === 'ANULADO') {
            const deleteRequest = pool.request()
                .input('idorden', sql.Int, idorden);

            await deleteRequest.query('DELETE FROM ordenpedido WHERE idorden = @idorden');
        }

        return res.status(200).json({ mensaje: 'Estado actualizado correctamente' });

    } catch (error) {
        console.error('Error al actualizar el estado del pedido:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

module.exports = { actualizarEstadoOrden };
