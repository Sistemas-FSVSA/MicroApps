const { poolPromise, sql } = require('../../models/conexion');

const manejarOrden = async (req, res) => {
    try {
        const { items, idusuario } = req.body;

        if (!Array.isArray(items) || items.length === 0 || !idusuario) {
            return res.status(400).json({ message: 'Datos inválidos' });
        }

        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        // Insertar en tabla orden
        const ordenRequest = new sql.Request(transaction);
        const insertOrdenQuery = `
            INSERT INTO orden (fecha, estado, idusuario)
            OUTPUT INSERTED.idorden
            VALUES (GETDATE(), 'GENERADO', @idusuario)
        `;
        ordenRequest.input('idusuario', sql.Int, idusuario);
        const resultOrden = await ordenRequest.query(insertOrdenQuery);
        const idorden = resultOrden.recordset[0].idorden;

        // Insertar en tabla detalleorden
        const detalleRequest = new sql.Request(transaction);
        const insertDetalleQuery = `
            INSERT INTO detalleorden (idorden, iditem, cantidad)
            VALUES (@idorden, @iditem, @cantidad)
        `;

        for (const item of items) {
            detalleRequest.input('idorden', sql.Int, idorden);
            detalleRequest.input('iditem', sql.Int, item.iditem);
            detalleRequest.input('cantidad', sql.Int, item.total);
            await detalleRequest.query(insertDetalleQuery);
            detalleRequest.parameters = {}; // Limpiar parámetros para el siguiente item
        }

        await transaction.commit();

        res.status(200).json({ message: 'Orden creada exitosamente', idorden });
    } catch (error) {
        console.error('Error al manejar la orden:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = { manejarOrden };
