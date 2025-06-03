const { poolPromise, sql } = require('../../models/conexion');

const actualizarItems = async (req, res) => {
    const { iditem, nombre, descripcion, categoriaId } = req.body;

    // Validaciones básicas
    if (!iditem || !nombre || !categoriaId) {
        return res.status(400).json({ error: 'Faltan datos requeridos para la actualización' });
    }

    let pool;
    try {
        pool = await poolPromise;

        const request = pool.request();

        request.input('iditem', sql.Int, iditem);
        request.input('nombre', sql.VarChar, nombre);
        request.input('descripcion', sql.VarChar, descripcion || '');
        request.input('categoriaId', sql.Int, categoriaId);

        // 1. Actualizar nombre y descripción del item
        await request.query(`
            UPDATE items
            SET nombre = @nombre,
                descripcion = @descripcion
            WHERE iditem = @iditem
        `);

        // 2. Actualizar la categoría del item en la tabla intermedia
        await request.query(`
            UPDATE itemcategoria
            SET idcategoria = @categoriaId
            WHERE iditem = @iditem
        `);

        res.status(200).json({ mensaje: 'Item actualizado correctamente' });

    } catch (error) {
        console.error('Error al actualizar el item:', error);
        res.status(500).json({ error: 'Error al actualizar el item' });
    }
};

module.exports = { actualizarItems };
