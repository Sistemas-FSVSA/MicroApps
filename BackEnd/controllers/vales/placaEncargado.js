const { poolPromiseGestiones, sql } = require('../../models/conexion');

const placaEncargado = async (req, res) => {
    try {
        const { idusuariovale } = req.body;

        // Validar que se haya enviado el idusuariovale
        if (!idusuariovale) {
            return res.status(400).json({ message: 'El idusuariovale es requerido' });
        }

        const pool = await poolPromiseGestiones;
        const result = await pool
            .request()
            .input('idusuariovale', sql.Int, idusuariovale)
            .query("SELECT * FROM placas WHERE idusuariovale = @idusuariovale");

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron placas para este usuario' });
        }

        res.json({ data: result.recordset });
    } catch (error) {
        console.error('Error al obtener las placas:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = { placaEncargado };
