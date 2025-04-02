const { poolPromise, sql } = require('../../models/conexion');

const obtenerAdjuntos = async (req, res) => {
    const { idpqrs } = req.body; // Solo necesitamos el ID de PQRS

    try {
        const pool = await poolPromise;

        // Consultar las anotaciones de la PQRS específica
        const result = await pool.request()
            .input('idpqrs', sql.Int, idpqrs)
            .query(`
                SELECT *
                FROM adjuntospqrs
                WHERE idpqrs = @idpqrs
                ORDER BY fecha DESC
            `);

        res.json({ adjuntos: result.recordset });

    } catch (error) {
        console.error('Error al obtener los adjuntos:', error);
        res.status(500).json({ error: 'Error al obtener los adjuntos' });
    }
};

module.exports = { obtenerAdjuntos };
