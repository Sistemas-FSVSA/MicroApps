const { poolPromiseGestiones, sql } = require('../../models/conexion');

const obtenerSubfuentes = async (req, res) => {
    try {
        const { idfuente } = req.params; // Obtener el parámetro de la URL

        if (!idfuente) {
            return res.status(400).json({ error: 'El parámetro idfuente es requerido' });
        }

        const pool = await poolPromiseGestiones;
        const result = await pool.request()
            .input('idfuente', sql.Int, idfuente)
            .query("SELECT * FROM subfuentes WHERE idfuentepqrs = @idfuente");

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron subfuentes para esta fuente' });
        }

        res.json({ subfuentes: result.recordset });

    } catch (error) {
        console.error('Error al obtener las subfuentes:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = { obtenerSubfuentes };
