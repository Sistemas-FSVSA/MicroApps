const { poolPromise, sql } = require('../../models/conexion');

const guardarProveedor = async (req, res) => {
    const proveedores = req.body.proveedores;

    if (!Array.isArray(proveedores) || proveedores.length === 0) {
        return res.status(400).json({ error: 'Debe enviar un arreglo de proveedores' });
    }

    let pool;
    let transaction; // ← Declaración movida fuera del try

    try {
        pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        for (const proveedor of proveedores) {
            const request = new sql.Request(transaction); // ← Crear nuevo Request en cada iteración

            const {
                identificacion,
                nombre,
                direccion,
                tipoidentificacion,
                telefono
            } = proveedor;

            await request
                .input('identificacion', sql.NVarChar, identificacion)
                .input('nombre', sql.NVarChar, nombre)
                .input('direccion', sql.NVarChar, direccion)
                .input('tipoidentificacion', sql.NVarChar, tipoidentificacion)
                .input('telefono', sql.NVarChar, telefono)
                .input('estado', sql.Int, 1)
                .query(`
                    INSERT INTO proveedorescompras (
                        identificacion,
                        nombre,
                        direccion,
                        tipoidentificacion,
                        telefono,
                        estado
                    ) VALUES (
                        @identificacion,
                        @nombre,
                        @direccion,
                        @tipoidentificacion,
                        @telefono,
                        @estado
                    )
                `);
        }

        await transaction.commit();
        res.json({ mensaje: 'Proveedores guardados exitosamente' });

    } catch (error) {
        console.error('Error al guardar proveedores:', error);
        if (transaction) await transaction.rollback(); // ← Ya funciona
        res.status(500).json({ error: 'Error al guardar proveedores' });
    }
};

module.exports = { guardarProveedor };
