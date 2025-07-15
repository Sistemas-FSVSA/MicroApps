const { poolPromiseGestiones, sql } = require('../../models/conexion');

const obtenerCategorias = async (req, res) => {
    try {
        const pool = await poolPromiseGestiones;

        // Consulta para obtener los valores únicos de la columna "categoria"
        const dependenciasResult = await pool.request().query(`
            SELECT DISTINCT categoria 
            FROM vale
            WHERE categoria IS NOT NULL
        `);

        // Extraer solo los valores únicos de "categoria"
        const dependencia = dependenciasResult.recordset.map(row => ({
            nombre: row.categoria
        }));

        // Enviar los datos como respuesta JSON
        res.json({ dependencia });

    } catch (err) {
        console.error("Error obteniendo los filtros:", err);
        res.status(500).send("Hubo un error en el servidor, inténtalo de nuevo.");
    }
};

module.exports = { obtenerCategorias };
