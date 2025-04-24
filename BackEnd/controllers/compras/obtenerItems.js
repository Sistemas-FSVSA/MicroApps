const { poolPromise, sql } = require('../../models/conexion');

const obtenerItems = async (req, res) => {
    const { query } = req.query;  // Recibimos el valor del query desde la URL

    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'Se requiere un valor de búsqueda' });
    }

    let pool;
    try {
        pool = await poolPromise;

        // Realizamos la consulta con LIKE en el nombre de los items
        const request = pool.request();

        // Realizamos la consulta JOIN con la tabla de categorías
        const result = await request
            .input('query', sql.VarChar, `%${query}%`)  // Usamos el valor recibido en la búsqueda
            .query(`
                SELECT 
                    i.nombre AS itemNombre, 
                    i.descripcion AS itemDescripcion, 
                    c.nombre AS categoriaNombre,
                    i.iditem AS itemId
                FROM items i
                INNER JOIN itemcategoria ic ON i.iditem = ic.iditem
                INNER JOIN categoriaitem c ON ic.idcategoria = c.idcategoriaitem
                WHERE i.nombre LIKE @query
            `);

        // Devolvemos los resultados
        res.json(result.recordset);

    } catch (error) {
        console.error('Error al obtener los items:', error);
        res.status(500).json({ error: 'Error al obtener los items' });
    }
};

module.exports = { obtenerItems };
