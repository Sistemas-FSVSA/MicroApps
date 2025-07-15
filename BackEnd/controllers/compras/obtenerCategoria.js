const { poolPromiseGestiones, sql } = require('../../models/conexion');

const obtenerCategoria = async (req, res) => {
    const { idcategoriaitem } = req.body;

    try {
        const pool = await poolPromiseGestiones;
        const request = pool.request();

        if (idcategoriaitem !== undefined) {
            // Obtener una categoría específica con todos sus campos
            const result = await request
                .input('idcategoriaitem', sql.Int, idcategoriaitem)
                .query(`
                    SELECT *
                    FROM categoriaitem
                    WHERE idcategoriaitem = @idcategoriaitem
                `);

            if (result.recordset.length === 0) {
                return res.status(404).json({ mensaje: 'Categoría no encontrada' });
            }

            return res.status(200).json(result.recordset[0]);

        } else {
            // Obtener todas las categorías con información básica
            const result = await request.query(`
                SELECT idcategoriaitem, nombre, estado
                FROM categoriaitem
            `);

            return res.status(200).json(result.recordset);
        }
    } catch (error) {
        console.error('Error al obtener categoría(s):', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

module.exports = { obtenerCategoria };
