const { poolPromiseGestiones, sql } = require('../../models/conexion');

// FUNCION PARA OBTENER LOS MUNICIPIOS
const obtenerPlanes = async (req, res) => {
    try {
        const pool = await poolPromiseGestiones;
        const result = await pool.request().query("SELECT * FROM tipoplan");
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron planes' });}
        res.json({
            data: result.recordset
        });
    } catch (error) {
        console.error('Error al obtener municipios', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = { obtenerPlanes };
