const { poolPromise3, sql } = require('../../models/conexion');

const obtenerNovedades = async (req, res) => {
    try {
      const pool = await poolPromise3; // Obtener conexión al pool
  
      // Consulta para obtener gestiones con estado 'CREADO' y unir con los nombres de usuarios y recaudadores
      const gestiones = await pool.request()
        .input('estado', 'CREADO')
        .query(`
          SELECT 
            g.idgestion, g.idusuario, g.idrecaudador, g.detalle, g.fechagenerado, 
            u.nombre AS nombreUsuario, r.nombre AS nombreRecaudador
          FROM gestion g
          LEFT JOIN usuario u ON g.idusuario = u.idusuario
          LEFT JOIN recaudador r ON g.idrecaudador = r.idrecaudador
          WHERE g.estado = @estado
        `);
  
      // Si no hay resultados, devolver una lista vacía
      if (gestiones.recordset.length === 0) {
        return res.json([]);
      }
  
      // Formatear las gestiones con los nombres directamente, incluyendo el idgestion como id
      const novedades = gestiones.recordset.map(g => ({
        id: g.idgestion, // Retornamos el idgestion como id
        generadoPor: g.nombreUsuario || 'Desconocido',
        recaudador: g.nombreRecaudador || 'Desconocido',
        detalle: g.detalle,
        fechagenerado: g.fechagenerado
      }));
  
      res.json(novedades); // Enviar los datos como respuesta JSON
    } catch (error) {
      console.error('Error al obtener novedades:', error);
      res.status(500).json({ error: 'Error al obtener novedades' });
    }
  };
  

module.exports = { obtenerNovedades };
