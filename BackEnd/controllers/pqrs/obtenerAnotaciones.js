const { poolPromiseGestiones, sql } = require('../../models/conexion');

const obtenerAnotaciones = async (req, res) => {
    const { idpqrs } = req.body; // Solo necesitamos el ID de PQRS

    try {
        const pool = await poolPromiseGestiones;

        // Consultar las anotaciones de la PQRS específica
        const result = await pool.request()
            .input('idpqrs', sql.Int, idpqrs)
            .query(`
                SELECT idanotacion, fecha, usuario, anotacion
                FROM anotacionespqrs
                WHERE idpqrs = @idpqrs
                ORDER BY fecha DESC
            `);

        res.json({ anotaciones: result.recordset });

    } catch (error) {
        console.error('Error al obtener las anotaciones:', error);
        res.status(500).json({ error: 'Error al obtener las anotaciones' });
    }
};

module.exports = { obtenerAnotaciones };
