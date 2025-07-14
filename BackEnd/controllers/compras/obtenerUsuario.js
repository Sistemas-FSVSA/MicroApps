const { poolPromiseGestiones, sql } = require('../../models/conexion');

const obtenerUsuario = async (req, res) => {
    try {
        const { identificacion } = req.body;

        if (!identificacion) {
            return res.status(400).json({ mensaje: 'Identificación requerida' });
        }

        const pool = await poolPromiseGestiones;

        // 1. Obtener datos del usuario
        const usuarioResult = await pool.request()
            .input('identificacion', sql.VarChar, identificacion)
            .query(`
                SELECT idusuario, nombres, apellidos, identificacion
                FROM usuarios
                WHERE identificacion = @identificacion
            `);

        if (usuarioResult.recordset.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        const usuario = usuarioResult.recordset[0];

        // 2. Obtener iddependencias del usuario
        const comprasResult = await pool.request()
            .input('idusuario', sql.Int, usuario.idusuario)
            .query(`
                SELECT DISTINCT iddependencia
                FROM usuariocompras
                WHERE idusuario = @idusuario
            `);

        const dependenciasIds = comprasResult.recordset.map(row => row.iddependencia);

        let dependencias = {};

        if (dependenciasIds.length > 0) {
            // 3. Obtener nombres de dependencias
            const dependenciasResult = await pool.request()
                .query(`
                    SELECT iddependencia, nombre
                    FROM dependencias
                    WHERE iddependencia IN (${dependenciasIds.join(',')})
                `);

            // 4. Convertir resultado en objeto { id: nombre }
            dependenciasResult.recordset.forEach(dep => {
                dependencias[dep.iddependencia] = dep.nombre;
            });
        }

        // 5. Construir respuesta
        const respuesta = {
            identificacion: usuario.identificacion,
            idusuario: usuario.idusuario,
            nombres: usuario.nombres,
            apellidos: usuario.apellidos,
            dependencias
        };

        res.json(respuesta);

    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        res.status(500).send('Error interno del servidor.');
    }
};

module.exports = { obtenerUsuario };
