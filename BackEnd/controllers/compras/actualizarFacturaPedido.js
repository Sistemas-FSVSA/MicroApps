const { poolPromise, sql } = require('../../models/conexion');

const actualizarFacturaPedido = async (req, res) => {
    const { idorden, factura } = req.body;

    // Validaciones básicas
    if (!idorden || !factura ) {
        return res.status(400).json({ error: 'Faltan datos requeridos para la actualización' });
    }

    let pool;
    try {
        pool = await poolPromise;

        const request = pool.request();

        request.input('idorden', sql.Int, idorden);
        request.input('factura', sql.VarChar, factura);

        // 1. Actualizar nombre y descripción del item
        await request.query(`
            UPDATE orden
            SET factura = @factura
            WHERE idorden = @idorden
        `);


        res.status(200).json({ mensaje: 'Orden actualizado correctamente' });

    } catch (error) {
        console.error('Error al actualizar el orden:', error);
        res.status(500).json({ error: 'Error al actualizar el orden' });
    }
};

module.exports = { actualizarFacturaPedido };
