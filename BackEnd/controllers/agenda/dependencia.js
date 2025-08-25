const { sql, poolPromiseAgenda } = require('../../models/conexion');

async function listarDependencias(req, res) {
    try {
        console.log('🔄 === LISTANDO DEPENDENCIAS ===');
        
        const pool = await poolPromiseAgenda;
        const result = await pool.request().query(`
            SELECT iddependencia, nombre, estado
            FROM dependencias 
            WHERE estado = 1
            ORDER BY nombre ASC
        `);

        console.log('✅ Dependencias encontradas:', result.recordset.length);
        
        // Log de cada dependencia para depuración
        result.recordset.forEach((dep, index) => {
            console.log(`Dependencia ${index + 1}:`, {
                id: dep.iddependencia,
                nombre: dep.nombre,
                estado: dep.estado
            });
        });

        // Validar que tenemos dependencias activas
        if (result.recordset.length === 0) {
            console.warn('⚠️ No se encontraron dependencias activas');
            return res.json([]);
        }

        // Verificar estructura de datos
        const dependenciasValidas = result.recordset.filter(dep => {
            const esValida = dep.iddependencia && dep.nombre;
            if (!esValida) {
                console.warn('⚠️ Dependencia con datos incompletos:', dep);
            }
            return esValida;
        });

        console.log(`✅ ${dependenciasValidas.length} dependencias válidas de ${result.recordset.length} totales`);
        
        res.json(dependenciasValidas);
        
    } catch (err) {
        console.error('❌ Error al listar dependencias:', err);
        res.status(500).json({ 
            error: 'Error al obtener dependencias',
            details: err.message 
        });
    }
}

async function obtenerDependenciaPorId(req, res) {
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
    listarDependencias,
    obtenerDependenciaPorId 
};