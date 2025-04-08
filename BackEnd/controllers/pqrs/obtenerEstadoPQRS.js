const { poolPromise, sql } = require('../../models/conexion');

const obtenerEstadoPQRS = async (req, res) => {
    const { idpqrs } = req.params; // Suponiendo que lo recibes como /api/pqrs/estado/:idpqrs

    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input('idpqrs', sql.Int, idpqrs)
            .query('SELECT estado FROM pqrs WHERE idpqrs = @idpqrs');

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'PQRS no encontrada' });
        }

        const estado = result.recordset[0].estado;
        return res.json({ estado });

    } catch (error) {
        console.error('Error al obtener el estado de la PQRS:', error);
        return res.status(500).json({ error: 'Error interno al obtener el estado' });
    }
};

module.exports = { obtenerEstadoPQRS };
