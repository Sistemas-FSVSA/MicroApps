const { poolPromise, sql } = require('../../models/conexion');

const consultarVales = async (req, res) => {
    const { categorias } = req.body;

    if (!categorias || !Array.isArray(categorias) || categorias.length === 0) {
        return res.status(400).json({ error: 'Debe proporcionar al menos una categoría válida' });
    }

    try {
        const pool = await poolPromise;
        const request = pool.request();

        // Construir dinámicamente los parámetros para la consulta
        const categoriasParams = categorias.map((cat, index) => `@categoria${index}`).join(', ');
        categorias.forEach((cat, index) => request.input(`categoria${index}`, sql.VarChar(50), cat));

        // Consulta con JOIN para obtener el nombre completo del encargado
        const query = `
            SELECT 
                v.idvale,
                v.idusuariovale, 
                uv.nombres + ' ' + uv.apellidos AS encargado,
                v.valor, 
                v.motivo, 
                v.fechavale, 
                v.idusuario, 
                v.placa, 
                v.categoria
            FROM vale v
            JOIN usuariosvale uv ON v.idusuariovale = uv.idusuariovale
            WHERE v.categoria IN (${categoriasParams})
        `;

        const result = await request.query(query);

        res.status(200).json({ data: result.recordset });

    } catch (error) {
        console.error('Error al consultar vales:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

module.exports = { consultarVales };
