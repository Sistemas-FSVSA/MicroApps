const { poolPromiseAgenda, sql } = require('../../models/conexion');

const obtenerDependenciaPorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ error: 'ID de dependencia inválido' });
        }

        const pool = await poolPromiseAgenda;
        const result = await pool.request()
            .input('id', sql.Int, parseInt(id))
            .query(`
                SELECT iddependencia, nombre, estado
                FROM dependencias 
                WHERE iddependencia = @id AND estado = 1
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Dependencia no encontrada' });
        }

        res.json(result.recordset[0]);

    } catch (err) {
        console.error('Error al obtener dependencia:', err);
        res.status(500).json({
            error: 'Error al obtener dependencia',
            details: err.message
        });
    }
}

module.exports = {
    obtenerDependenciaPorId
};