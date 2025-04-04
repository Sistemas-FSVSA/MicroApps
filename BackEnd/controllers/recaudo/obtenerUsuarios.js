const { poolPromise3, sql } = require('../../models/conexion');

// Función para obtener usuarios
const obtenerUsuarios = async (req, res) => {
    try {
      const pool = await poolPromise3; // Obtener conexión del pool
      const result = await pool.request().query(`SELECT * FROM usuario`); // Consulta a la tabla usuario
      res.json(result.recordset); // Enviar los datos al frontend
    } catch (error) {
      console.error('Error al obtener usuarios:', error.message);
      res.status(500).json({ mensaje: 'Error al obtener los usuarios' });
    }
  };
  

module.exports = { obtenerUsuarios };
