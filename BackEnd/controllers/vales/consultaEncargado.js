const { poolPromiseGestiones, sql } = require('../../models/conexion');

const consultaEncargados = async (req, res) => {
    try {
        const { categoria, estado } = req.body; // Obtener la categoría del body


        if (!categoria) {
            return res.status(400).json({ error: 'La categoría es requerida' });
        }

        const pool = await poolPromiseGestiones;
        const result = await pool.request()
            .input('categoria', sql.NVarChar, categoria) // Pasar la categoría como parámetro seguro
            .input('estado', sql.Bit, estado) // Pasar la categoría como parámetro seguro
            .query("SELECT * FROM usuariosvale WHERE categoria = @categoria and estado = @estado");

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron usuarios para esta categoría' });
        }

        res.json({ data: result.recordset });

    } catch (error) {
        console.error('Error al obtener los usuarios:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = { consultaEncargados };
