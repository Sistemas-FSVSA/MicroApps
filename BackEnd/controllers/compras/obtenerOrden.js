const { poolPromise, sql } = require('../../models/conexion');

const obtenerOrden = async (req, res) => {
    try {
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).send('Debe proporcionar el estado.');
        }

        const pool = await poolPromise;

        const result = await pool.request()
            .input('estado', sql.VarChar(50), estado)
            .query(`
                SELECT 
                    o.idorden, o.fecha, o.estado, o.tipo, o.idusuario,
                    d.iddetalleorden, d.iditem, d.cantidad
                FROM orden o
                LEFT JOIN detalleorden d ON o.idorden = d.idorden
                WHERE o.estado = @estado
            `);

        if (result.recordset.length === 0) {
            return res.status(404).send('No se encontraron órdenes con ese estado.');
        }

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        res.status(500).send('Error interno del servidor.');
    }
};

module.exports = { obtenerOrden };
