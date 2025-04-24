const { poolPromise, sql } = require('../../models/conexion');

const obtenerEstadoPedido = async (req, res) => {
    const { idpedido } = req.params;

    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input('idpedido', sql.Int, idpedido)
            .query('SELECT estado FROM pedidos WHERE idpedido = @idpedido');

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const estado = result.recordset[0].estado;
        return res.json({ estado });

    } catch (error) {
        console.error('Error al obtener el estado del Pedido:', error);
        return res.status(500).json({ error: 'Error interno al obtener el estado' });
    }
};

module.exports = { obtenerEstadoPedido };
