const { poolPromiseGestiones } = require('../../models/conexion');

const obtenerItemsPedido = async (req, res) => {
    try {
        const pool = await poolPromiseGestiones;
        const request = pool.request();

        // Consulta 1: Totales por item
        const resultItems = await request.query(`
            SELECT 
                dp.iditem,
                i.nombre AS itemNombre,
                c.nombre AS categoriaNombre,
                SUM(dp.cantidad) AS total
            FROM detallepedido dp
            INNER JOIN pedidos p ON dp.idpedido = p.idpedido
            INNER JOIN items i ON dp.iditem = i.iditem
            INNER JOIN itemcategoria ic ON i.iditem = ic.iditem
            INNER JOIN categoriaitem c ON ic.idcategoria = c.idcategoriaitem
            WHERE p.estado = 'AUTORIZADO'
              AND dp.estado = 'PENDIENTE'
            GROUP BY dp.iditem, i.nombre, c.nombre
        `);

        // Consulta 2: Detalle por dependencia para cada item
        const resultDetalleDependencias = await request.query(`
            SELECT 
                dp.iditem,
                i.nombre AS itemNombre,
                d.nombre AS dependenciaNombre,
                SUM(dp.cantidad) AS cantidad
            FROM detallepedido dp
            INNER JOIN pedidos p ON dp.idpedido = p.idpedido
            INNER JOIN dependencias d ON p.iddependencia = d.iddependencia
            INNER JOIN items i ON dp.iditem = i.iditem
            WHERE p.estado = 'AUTORIZADO'
              AND dp.estado = 'PENDIENTE'
            GROUP BY dp.iditem, i.nombre, d.nombre ORDER BY dp.iditem ASC
        `);

        // Consulta 3: Totales por item en órdenes generadas
        const resultItemsOrden = await request.query(`
            SELECT 
                do.iditem,
                i.nombre AS itemNombre,
                SUM(do.cantidad) AS total
            FROM detalleorden do
            INNER JOIN orden o ON do.idorden = o.idorden
            INNER JOIN items i ON do.iditem = i.iditem
            WHERE o.estado = 'GENERADO'
            GROUP BY do.iditem, i.nombre
        `);

        res.json({
            items: resultItems.recordset,
            dependencias: resultDetalleDependencias.recordset,
            itemsOrden: resultItemsOrden.recordset
        });
        
    } catch (error) {
        console.error('Error al obtener los datos del pedido:', error);
        res.status(500).json({ error: 'Error al obtener los datos del pedido' });
    }
};

module.exports = { obtenerItemsPedido };
