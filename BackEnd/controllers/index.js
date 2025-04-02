const { poolPromise, sql } = require('../models/conexion');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');

const logout = (req, res) => {
    try {
        // Borrar la cookie 'authToken'
        res.clearCookie('authToken', {
            httpOnly: true, // Asegura que solo se puede acceder desde el backend
            secure: false,  // Cambiar a `true` si usas HTTPS
            sameSite: 'strict', // Igual que cuando se creó
            path: '/', // Asegúrate de que el path sea igual
        });

        // Respuesta indicando que el cierre de sesión fue exitoso
        res.status(200).json({ estado: 'ok', mensaje: 'Sesión cerrada correctamente.' });
    } catch (error) {
        console.error('Error durante el logout:', error);
        res.status(500).json({ estado: 'error', mensaje: 'Ocurrió un error al cerrar sesión.' });
    }
};

const postUsuario = async (req, res) => {
    const { identificacion, password } = req.body;

    try {
        // Intentar obtener la conexión a la base de datos
        const pool = await poolPromise;

        if (!pool) {
            return res.status(503).json({ error: 'Base de datos no disponible.' });
        }

        // Obtener información del usuario
        const result = await pool.request()
            .input('identificacion', sql.VarChar, identificacion)
            .query(`
                SELECT u.idusuario, u.identificacion, u.estado, u.nombres, u.apellidos, u.email, u.password
                FROM usuarios u 
                WHERE u.identificacion = @identificacion
            `);

        const data = result.recordset;

        if (data.length === 0) {
            return res.status(401).json({ error: 'Identificación inválida.' });
        }

        const user = data[0];

        if (!user.estado) {
            return res.status(403).json({ error: 'Usuario desactivado. No tiene acceso.' });
        }

        // Comparar la contraseña encriptada con la contraseña proporcionada
        const passwordCoincide = await bcrypt.compare(password, user.password);

        if (!passwordCoincide) {
            return res.status(401).json({ error: 'Contraseña inválida.' });
        }

        // Actualizar la fecha de último inicio de sesión
        await pool.request()
            .input('idusuario', sql.Int, user.idusuario)
            .query(`
                UPDATE usuarios
                SET ultimoinicio = GETDATE()
                WHERE idusuario = @idusuario
            `);

        // Obtener el rol del usuario y los permisos asociados
        const rolResult = await pool.request()
            .input('idusuario', sql.Int, user.idusuario)
            .query(`
                SELECT p.nombre AS nombreperfil, pm.vista, pm.elemento
                FROM usuarioperfil up
                JOIN perfiles p ON up.idperfil = p.idperfil
                JOIN permisos pm ON pm.idperfil = p.idperfil
                WHERE up.idusuario = @idusuario
            `);

        const rolData = rolResult.recordset;

        if (rolData.length === 0) {
            return res.status(403).json({ error: 'Usuario no tiene un rol asignado.' });
        }

        // Obtener el nombre del rol y la lista de permisos (vistas y elementos)
        const nombreRol = rolData[0].nombreperfil;
        const permisos = rolData.map(permiso => ({
            vista: permiso.vista,
            elemento: permiso.elemento
        }));

        // Generar token JWT
        const token = jwt.sign(
            {
                identificacion: user.identificacion,
                nombres: user.nombres,
                apellidos: user.apellidos,
                nombreRol: nombreRol
            },
            'MicroApps_Funeraria3467*',
            { expiresIn: '12h' }
        );

        // Crear la cookie con el token
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 12 * 60 * 60 * 1000,
            path: '/'
        });

        // Enviar la respuesta con los datos del usuario y permisos
        return res.status(200).json({
            estado: 'ok',
            mensaje: 'Inicio de sesión exitoso.',
            user: {
                idusuario: user.idusuario,
                identificacion: user.identificacion,
                nombres: user.nombres,
                apellidos: user.apellidos,
                email: user.email,
                nombreRol: nombreRol,
                permisos: permisos
            }
        });

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('Error: No se pudo conectar a la base de datos.', error);
            return res.status(503).json({ error: 'Base de datos no disponible.' });
        }
        console.error('Error interno del servidor:', error);
        return res.status(500).json({ error: 'Error interno del servidor. Intente más tarde.' });
    }
};

module.exports = { postUsuario, logout };
