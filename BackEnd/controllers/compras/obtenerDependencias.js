const { poolPromiseGestiones, sql } = require('../../models/conexion');

const obtenerDependencias = async (req, res) => {
    try {
        const pool = await poolPromiseGestiones;

        const result = await pool.request().query(`
            SELECT * FROM dependencias
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener dependencias:', error);
        res.status(500).json({ error: 'Error al obtener dependencias', detalle: error.message });
    }
};

module.exports = { obtenerDependencias };