const { poolPromiseGestiones, sql } = require('../../models/conexion');

const consultaCategorias = async (req, res) => {
    try {
        const { idusuario } = req.body;
        if (!idusuario) {
            return res.status(400).json({ error: 'idusuario es requerido' });
        }

        const pool = await poolPromiseGestiones;

        // Obtener idcategoria de la tabla categoriasusuario
        const categoriasUsuarioResult = await pool.request()
            .input('idusuario', sql.Int, idusuario)
            .query("SELECT idcategoria FROM categoriasusuario WHERE idusuario = @idusuario");

        if (categoriasUsuarioResult.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron categorías para este usuario' });
        }

        const idCategorias = categoriasUsuarioResult.recordset.map(row => row.idcategoria);

        // Obtener los nombres de las categorías desde categoriasvale
        const categoriasValeResult = await pool.request()
            .query(`SELECT idcategoria, nombre FROM categoriasvale WHERE idcategoria IN (${idCategorias.join(',')})`);

        if (categoriasValeResult.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron nombres de categorías' });
        }

        res.json({ data: categoriasValeResult.recordset });

    } catch (error) {
        console.error('Error al obtener las categorías', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = { consultaCategorias };
