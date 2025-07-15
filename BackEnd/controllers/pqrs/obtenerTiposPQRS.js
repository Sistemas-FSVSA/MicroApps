const { poolPromiseGestiones, sql } = require('../../models/conexion');

const obtenerTiposPQRS = async (req, res) => {
    try {
        const pool = await poolPromiseGestiones;
        const result = await pool.request().query("SELECT * FROM tipopqrs");
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron tipos pqrs' });}
        res.json({
            data: result.recordset
        });
    } catch (error) {
        console.error('Error al obtener pqrs', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = { obtenerTiposPQRS };
