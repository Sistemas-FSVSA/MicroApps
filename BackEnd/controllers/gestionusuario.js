const { poolPromise, poolPromise2, sql } = require('../models/conexion');
const bcrypt = require('bcrypt');

// FUNCION PARA OBTENER LOS PERFILES
const getPerfiles = async (req, res = response) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM perfiles");
        if (result.recordset.length === 0) { return res.status(404).json({ message: 'No se encontraron perfiles' }); }
        res.json({
            data: result.recordset
        });
    } catch (error) {
        console.error('Error al realizar la consulta', error);
        res.status(500).json({
            error: 'Error en la base de datos'
        });
    }
};

const getUsuarios = async (req, res = response) => {
    try {
        const { idUsuario } = req.query; // Extraer idUsuario de los parámetros de consulta
        const pool = await poolPromise;

        // Query principal para obtener la información de los usuarios
        let queryUsuario = "SELECT * FROM usuarios";
        if (idUsuario) {
            queryUsuario += " WHERE idusuario = @idUsuario"; // Filtrar por idUsuario si está presente
        }

        const requestUsuario = pool.request();
        if (idUsuario) {
            requestUsuario.input("idUsuario", idUsuario); // Pasar idUsuario como parámetro al query
        }

        const resultUsuario = await requestUsuario.query(queryUsuario);

        if (resultUsuario.recordset.length === 0) {
            return res.status(404).json({
                message: idUsuario
                    ? `No se encontró un usuario con el ID ${idUsuario}`
                    : "No se encontraron usuarios"
            });
        }

        const usuarios = resultUsuario.recordset; // Obtener todos los usuarios

        // Realizar la consulta para obtener los perfiles de cada usuario
        const usuariosConPerfiles = await Promise.all(usuarios.map(async (usuario) => {
            // Consulta para obtener los perfiles de cada usuario
            const queryPerfiles = `
        SELECT 
            p.idperfil, 
            p.nombre AS perfilNombre
        FROM 
            usuarioperfil up
        INNER JOIN 
            perfiles p ON up.idperfil = p.idperfil
        WHERE 
            up.idusuario = @idUsuario
    `;

            const requestPerfiles = pool.request();
            requestPerfiles.input("idUsuario", usuario.idusuario); // Asegúrate de que el campo sea idusuario y no idUsuario

            const resultPerfiles = await requestPerfiles.query(queryPerfiles);

            // Asignar los perfiles al usuario en la nueva estructura
            usuario.perfiles = resultPerfiles.recordset.map(perfil => ({
                idperfil: perfil.idperfil,
                nombre: perfil.perfilNombre,
            }));

            // Si no hay perfiles, asegurarse de que sea un array vacío
            if (!usuario.perfiles) {
                usuario.perfiles = [];
            }

            return usuario;
        }));


        // Responder con los datos de los usuarios y sus perfiles
        res.json({
            data: usuariosConPerfiles
        });
    } catch (error) {
        console.error("Error al realizar la consulta", error);
        res.status(500).json({
            error: "Error en la base de datos"
        });
    }
};


const BuscarUsuario = async (req, res = response) => {
    try {
        // Obtenemos el número de documento desde los parámetros de la URL
        const { documento } = req.params;

        // Conexión a la segunda base de datos
        const pool = await poolPromise2;

        // Realizamos la consulta con un parámetro para evitar inyección SQL
        const result = await pool.request()
            .input('documento', sql.VarChar, documento) // Definimos el parámetro 'documento' como tipo 'VarChar'
            .query("SELECT Nombre, email  FROM empleados WHERE cedula = @documento");


        // Verificamos si se encontraron resultados
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false, // Cambié esto para que coincida con lo que espera el frontend
                message: 'No se encontraron usuarios'
            });
        }

        // Si se encuentran resultados, los devolvemos en la respuesta
        return res.json({
            success: true, // Agregado para indicar éxito
            usuario: result.recordset[0] // Cambié esto para devolver el primer usuario
        });
    } catch (error) {
        console.error('Error al realizar la consulta', error);
        res.status(500).json({
            success: false, // Se debe indicar que hubo un error en la respuesta
            error: 'Error en la base de datos'
        });
    }
};



const actualizarEstadoUsuario = async (req, res = response) => {
    try {
        const { idusuario, estado } = req.body;

        // Validar que se hayan enviado los parámetros necesarios
        if (idusuario === undefined || estado === undefined) {
            return res.status(400).json({
                message: 'Faltan parámetros requeridos: idusuario y estado',
            });
        }

        // Validar que el estado sea un valor válido (0 o 1)
        if (![0, 1].includes(estado)) {
            return res.status(400).json({
                message: 'El estado debe ser 0 (inactivo) o 1 (activo)',
            });
        }

        const pool = await poolPromise;

        // Actualizar el estado del usuario en la base de datos
        const query = `
            UPDATE usuarios
            SET estado = @estado
            WHERE idusuario = @idusuario
        `;

        const result = await pool.request()
            .input('estado', estado) // Se utiliza parámetro seguro
            .input('idusuario', idusuario)
            .query(query);

        // Verificar si la actualización afectó alguna fila
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                message: 'No se encontró el usuario con el ID proporcionado',
            });
        }

        res.json({
            message: 'Estado actualizado correctamente',
        });
    } catch (error) {
        console.error('Error al actualizar el estado del usuario', error);
        res.status(500).json({
            error: 'Error en la base de datos',
        });
    }
};



const crearUsuario = async (req, res) => {
    const { idUsuario, nombres, apellidos, email, documento, perfiles } = req.body;

    try {
        // Validar campos obligatorios
        if (!nombres || !apellidos || !documento || !Array.isArray(perfiles) || perfiles.length === 0) {
            return res.status(400).json({ error: 'Todos los campos obligatorios deben estar presentes y válidos.' });
        }

        if (typeof documento !== 'string' || documento.length < 4) {
            return res.status(400).json({ error: 'El documento debe ser una cadena con al menos 4 caracteres.' });
        }

        const pool = await poolPromise;

        // Si idUsuario está presente, es una actualización
        if (idUsuario) {
            // Verificar si el usuario existe
            const existeUsuario = await pool.request()
                .input('idUsuario', sql.Int, idUsuario)
                .query(`SELECT idusuario FROM usuarios WHERE idusuario = @idUsuario`);

            if (existeUsuario.recordset.length === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado.' });
            }

            // Actualizar el usuario existente
            await pool.request()
                .input('idUsuario', sql.Int, idUsuario)
                .input('nombres', sql.VarChar, nombres)
                .input('apellidos', sql.VarChar, apellidos)
                .input('email', sql.VarChar, email)
                .input('identificacion', sql.VarChar, documento)
                .query(`
                    UPDATE usuarios
                    SET nombres = @nombres, apellidos = @apellidos, email = @email, identificacion = @identificacion
                    WHERE idusuario = @idUsuario
                `);

            // Eliminar los perfiles anteriores
            await pool.request()
                .input('idUsuario', sql.Int, idUsuario)
                .query(`
                    DELETE FROM usuarioperfil WHERE idusuario = @idUsuario
                `);

            // Insertar los nuevos perfiles
            for (const idPerfil of perfiles) {
                await pool.request()
                    .input('idusuario', sql.Int, idUsuario)
                    .input('idperfil', sql.Int, idPerfil)
                    .query(`
                        INSERT INTO usuarioperfil (idusuario, idperfil)
                        VALUES (@idusuario, @idperfil)
                    `);
            }

            // Respuesta exitosa
            return res.status(200).json({
                success: true,
                message: 'Usuario actualizado correctamente.',
                usuario: {
                    idusuario: idUsuario,
                    nombres,
                    apellidos,
                    email,
                    documento,
                    perfiles,
                }
            });
        } else {
            // Si no se pasa idUsuario, creamos un nuevo usuario

            // Validar si ya existe un usuario con el mismo documento
            const existeUsuario = await pool.request()
                .input('identificacion', sql.VarChar, documento)
                .query(`
                    SELECT idusuario 
                    FROM usuarios 
                    WHERE identificacion = @identificacion
                `);

            if (existeUsuario.recordset.length > 0) {
                return res.status(400).json({ error: 'El usuario con este documento ya existe.' });
            }

            // Obtener el último valor del campo 'registro'
            const ultimoRegistro = await pool.request()
                .query(`SELECT TOP 1 CAST(LTRIM(RTRIM(registro)) AS INT) AS registro FROM usuarios ORDER BY CAST(LTRIM(RTRIM(registro)) AS INT) DESC`);

            let nuevoRegistro;
            if (ultimoRegistro.recordset.length > 0) {
                nuevoRegistro = parseInt(ultimoRegistro.recordset[0].registro, 10) + 1;
            } else {
                // Si no hay registros previos, se asigna 1
                nuevoRegistro = 1;
            }

            // Generar la contraseña encriptada
            const passwordPorDefecto = documento.substring(0, 4); // Primeros 4 dígitos del documento
            const passwordEncriptada = bcrypt.hashSync(passwordPorDefecto, 10);

            const usuarioCreado = await pool.request()
                .input('nombres', sql.VarChar, nombres)
                .input('apellidos', sql.VarChar, apellidos)
                .input('email', sql.VarChar, email)
                .input('identificacion', sql.VarChar, documento)
                .input('password', sql.VarChar, passwordEncriptada)
                .input('estado', sql.Bit, true) // Estado activo por defecto
                .input('registro', sql.Int, nuevoRegistro) // Asignar el nuevo valor de registro
                .query(`
                    INSERT INTO usuarios (nombres, apellidos, email, identificacion, password, estado, registro, fecha)
                    OUTPUT inserted.idusuario
                    VALUES (@nombres, @apellidos, @email, @identificacion, @password, @estado, @registro, GETDATE())
                `);

            const idUsuarioCreado = usuarioCreado.recordset[0].idusuario;

            // Insertar los perfiles asociados al usuario
            for (const idPerfil of perfiles) {
                await pool.request()
                    .input('idusuario', sql.Int, idUsuarioCreado)
                    .input('idperfil', sql.Int, idPerfil)
                    .query(`
                        INSERT INTO usuarioperfil (idusuario, idperfil)
                        VALUES (@idusuario, @idperfil)
                    `);
            }

            // Respuesta exitosa
            return res.status(201).json({
                success: true,
                message: 'Usuario creado correctamente.',
                usuario: {
                    idusuario: idUsuarioCreado,
                    nombres,
                    apellidos,
                    email,
                    documento,
                    perfiles,
                    registro: nuevoRegistro // Devolver el registro generado
                }
            });
        }

    } catch (error) {
        console.error('Error en la base de datos:', error);
        return res.status(500).json({ error: 'Error al crear o actualizar el usuario en la base de datos.' });
    }
};


const actualizarPasswordUsuario = async (req, res = response) => {
    try {
        const { idusuario, passwordAnterior, nuevaContraseña, confirmarContraseña } = req.body;

        // Validar que se hayan enviado los parámetros necesarios
        if (!idusuario || !passwordAnterior || !nuevaContraseña || !confirmarContraseña) {
            return res.status(400).json({
                message: 'Faltan parámetros requeridos: idusuario, passwordAnterior, nuevaContraseña, confirmarContraseña',
            });
        }

        // Validar que la nueva contraseña y la confirmación sean iguales
        if (nuevaContraseña !== confirmarContraseña) {
            return res.status(400).json({
                message: 'La nueva contraseña y la confirmación no coinciden',
            });
        }

        // Validar que la nueva contraseña tenga un mínimo de caracteres (ejemplo: 6 caracteres)
        if (nuevaContraseña.length < 4) {
            return res.status(400).json({
                message: 'La nueva contraseña debe tener al menos 4 caracteres',
            });
        }

        const pool = await poolPromise;

        // Obtener el usuario desde la base de datos para verificar la contraseña anterior
        const queryUsuario = `
            SELECT password
            FROM usuarios
            WHERE idusuario = @idusuario
        `;
        const resultUsuario = await pool.request()
            .input('idusuario', sql.Int, idusuario)
            .query(queryUsuario);

        if (resultUsuario.recordset.length === 0) {
            return res.status(404).json({
                message: 'Usuario no encontrado',
            });
        }

        const usuario = resultUsuario.recordset[0];

        // Verificar que la contraseña anterior coincida con la almacenada en la base de datos
        const esContraseñaValida = await bcrypt.compare(passwordAnterior, usuario.password);
        if (!esContraseñaValida) {
            return res.status(400).json({
                message: 'La contraseña anterior es incorrecta',
            });
        }

        // Encriptar la nueva contraseña
        const nuevaContraseñaEncriptada = await bcrypt.hash(nuevaContraseña, 10);

        // Actualizar la contraseña del usuario en la base de datos
        const queryActualizar = `
            UPDATE usuarios
            SET password = @nuevaContraseña
            WHERE idusuario = @idusuario
        `;
        const resultActualizar = await pool.request()
            .input('nuevaContraseña', sql.VarChar, nuevaContraseñaEncriptada) // Nueva contraseña encriptada
            .input('idusuario', sql.Int, idusuario)
            .query(queryActualizar);

        // Verificar si la actualización afectó alguna fila
        if (resultActualizar.rowsAffected[0] === 0) {
            return res.status(404).json({
                message: 'No se encontró el usuario con el ID proporcionado',
            });
        }

        res.json({
            message: 'Contraseña actualizada correctamente',
        });
    } catch (error) {
        console.error('Error al actualizar la contraseña del usuario', error);
        res.status(500).json({
            error: 'Error en la base de datos',
        });
    }
};





module.exports = { crearUsuario, getUsuarios, actualizarEstadoUsuario, BuscarUsuario, getPerfiles, actualizarPasswordUsuario };
