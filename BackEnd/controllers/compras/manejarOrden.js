const { poolPromiseGestiones, sql } = require('../../models/conexion');

const manejarOrden = async (req, res) => {
    try {
        const { items, idusuario, tipo, idproveedor } = req.body;


        if (!Array.isArray(items) || items.length === 0 || !idusuario) {
            return res.status(400).json({ message: 'Datos inválidos' });
        }

        if (tipo === 'compra' && !idproveedor) {
            return res.status(400).json({ message: 'Proveedor requerido para orden de compra' });
        }


        const pool = await poolPromiseGestiones;
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        // Insertar en tabla orden
        const ordenRequest = new sql.Request(transaction);
        const insertOrdenQuery = `
            INSERT INTO orden (fecha, estado, idusuario, tipo, idproveedor)
            OUTPUT INSERTED.idorden
            VALUES (GETDATE(), 'GENERADO', @idusuario, @tipo, @idproveedor)
        `;
        ordenRequest.input('idusuario', sql.Int, idusuario);
        ordenRequest.input('tipo', sql.VarChar, tipo);
        ordenRequest.input('idproveedor', sql.Int, tipo === 'COMPRA' ? idproveedor : null);

        const resultOrden = await ordenRequest.query(insertOrdenQuery);
        const idorden = resultOrden.recordset[0].idorden;

        // Insertar en tabla detalleorden
        const detalleRequest = new sql.Request(transaction);
        const insertDetalleQuery = `
            INSERT INTO detalleorden (idorden, iditem, cantidad, observacion, valor)
            VALUES (@idorden, @iditem, @cantidad, @observacion, @valor)
        `;

        for (const item of items) {
            detalleRequest.input('idorden', sql.Int, idorden);
            detalleRequest.input('iditem', sql.Int, item.iditem);
            detalleRequest.input('cantidad', sql.Int, item.total);
            detalleRequest.input('observacion', sql.VarChar, item.observacion || ''); // Agregar observación si existe
            detalleRequest.input('valor', sql.Decimal(18, 2), item.valor || 0); // o ajusta tipo según DB
            await detalleRequest.query(insertDetalleQuery);
            detalleRequest.parameters = {};
        }

        await transaction.commit();

        res.status(200).json({ message: 'Orden creada exitosamente', idorden });
    } catch (error) {
        console.error('Error al manejar la orden:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = { manejarOrden };
