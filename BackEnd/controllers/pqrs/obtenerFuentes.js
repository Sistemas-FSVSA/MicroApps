const { poolPromiseGestiones, sql } = require('../../models/conexion');

const obtenerFuentes = async (req, res) => {
    try {
        const pool = await poolPromiseGestiones;
        const result = await pool.request().query("SELECT * FROM fuentepqrs");
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron fuente pqrs' });}
        res.json({
            data: result.recordset
        });
    } catch (error) {
        console.error('Error al obtener la fuente de los pqrs', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = { obtenerFuentes };
