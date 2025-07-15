const { poolPromiseRecaudo, sql } = require('../../models/conexion');

// Función para guardar la novedad
const guardarNovedad = async (req, res) => {
    const { idusuario, idrecaudador, detalle } = req.body; // Obtener los datos del cuerpo de la solicitud
    
    // Capturar la IP del cliente (en el caso de que esté detrás de un proxy)
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // Asegurarse de que solo se obtiene la dirección IPv4
    ip = ip.split(',')[0].trim(); // Tomamos la primera IP si hay varias
  
    // Si la IP tiene el prefijo "::ffff:", lo eliminamos
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7); // Elimina el prefijo "::ffff:"
    }
  
    // El estado se establece siempre como 'CREADO'
    const estado = 'CREADO';
  
    try {
      const pool = await poolPromiseRecaudo; // Obtener conexión del pool
  
      // Aquí puedes agregar la consulta SQL para guardar la novedad en la base de datos
      const result = await pool.request()
        .input('idusuario', idusuario)
        .input('idrecaudador', idrecaudador)
        .input('detalle', detalle)
        .input('estado', estado)
        .input('ip', ip) // Guardar la IP del cliente
        .query(`
          INSERT INTO gestion (idusuario, idrecaudador, detalle, fechagenerado, estado, ip)
          VALUES (@idusuario, @idrecaudador, @detalle, GETDATE(), @estado, @ip)
        `);
  
      // Enviar una respuesta exitosa
      res.status(201).json({ mensaje: 'Novedad generada con éxito' });
    } catch (error) {
      console.error('Error al guardar la novedad:', error.message);
      res.status(500).json({ mensaje: 'Error al guardar la novedad' });
    }
  };

  module.exports = { guardarNovedad };
