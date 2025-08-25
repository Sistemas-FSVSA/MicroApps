const { poolPromiseGestiones, sql } = require('../../models/conexion');

const obtenerAprobado = async (req, res) => {
  try {
    const pool = await poolPromiseGestiones;
    const result = await pool.request()
      .query('SELECT idaprueba, nombres, estado FROM usuariosaprueban');

    res.status(200).json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Error al obtener aprobados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = { obtenerAprobado };
