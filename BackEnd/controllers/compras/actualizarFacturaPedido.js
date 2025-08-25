const { poolPromiseGestiones, sql } = require('../../models/conexion');

const actualizarFacturaPedido = async (req, res) => {
    const { idorden, factura, items, fechaEntrega } = req.body;

    let pool;
    try {
        pool = await poolPromiseGestiones;
        const transaction = new sql.Transaction(pool);

        await transaction.begin();
        const request = new sql.Request(transaction);

        // Actualizar factura en orden
        await request
            .input('idorden', sql.Int, idorden)
            .input('factura', sql.VarChar, factura)
            .input('fechaentrega', sql.DateTime, fechaEntrega || null)
            .query(`
                UPDATE orden
                SET factura = @factura
                , fechaentrega = @fechaentrega
                WHERE idorden = @idorden
            `);

        // Si vienen items, actualizamos sus valores
        if (Array.isArray(items)) {
            for (const item of items) {
                if (!item.iditem || item.valor == null) continue;

                await request
                    .input('iditem', sql.Int, item.iditem)
                    .input('valor', sql.Decimal(18, 2), item.valor)
                    .input('cantidad', sql.Int, item.cantidad || 0) // Asignar cantidad por defecto si no se proporciona
                    .input('observacion', sql.VarChar, item.observacion || '')
                    .query(`
                        UPDATE detalleorden
                        SET valor = @valor, cantidad = @cantidad, observacion = @observacion
                        WHERE idorden = @idorden AND iditem = @iditem
                    `);

                // Limpieza de parámetros para el siguiente item
                request.parameters = {
                    idorden: request.parameters.idorden, // mantener idorden para todos
                };
            }
        }

        await transaction.commit();
        res.status(200).json({ mensaje: 'Orden y detalles actualizados correctamente' });

    } catch (error) {
        console.error('Error al actualizar el orden:', error);
        if (transaction) await transaction.rollback();
        res.status(500).json({ error: 'Error al actualizar el orden y detalles' });
    }
};

module.exports = { actualizarFacturaPedido };
