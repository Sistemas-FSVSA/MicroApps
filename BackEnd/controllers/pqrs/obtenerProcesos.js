const { poolPromise, sql } = require('../../models/conexion');

const obtenerProcesos = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM tipoproceso");
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron procesos' });}
        res.json({
            data: result.recordset
        });
    } catch (error) {
        console.error('Error al obtener municipios', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = { obtenerProcesos };
