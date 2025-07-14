const { poolPromiseGestiones, sql } = require('../../models/conexion');

const obtenerProveedores = async (req, res) => {
    const { query } = req.query;

    let pool;
    try {
        pool = await poolPromiseGestiones;
        const request = pool.request();

        let result;

        if (query && query.trim() !== '') {
            // Consulta con filtro por nombre
            result = await request
                .input('query', sql.NVarChar, `%${query}%`)
                .query(`
                    SELECT 
                        idproveedor, 
                        nombre, 
                        direccion, 
                        identificacion, 
                        tipoidentificacion, 
                        telefono, 
                        estado
                    FROM proveedorescompras
                    WHERE nombre LIKE @query AND estado = 1
                `);
        } else {
            // Consulta sin filtro, devuelve todos los proveedores activos
            result = await request.query(`
                SELECT 
                    idproveedor, 
                    nombre, 
                    direccion, 
                    identificacion, 
                    tipoidentificacion, 
                    telefono, 
                    estado
                FROM proveedorescompras
            `);
        }

        res.json(result.recordset);

    } catch (error) {
        console.error('Error al obtener los proveedores:', error);
        res.status(500).json({ error: 'Error al obtener los proveedores' });
    }
};

module.exports = { obtenerProveedores };
