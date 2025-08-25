const { poolPromiseAgenda, sql } = require('../../models/conexion');

const limpiarReservacionesExpiradas = async (req, res) => {
  try {
    const pool = await poolPromiseAgenda;
    const result = await pool.request()
      .query(`
        DELETE FROM datosreservacion 
        WHERE finReservacion < DATEADD(day, -7, GETDATE());
      `);

    console.log('Reservaciones expiradas limpiadas:', result.rowsAffected);
    return result.rowsAffected;
  } catch (error) {
    console.error('Error limpiando reservaciones expiradas:', error);
    throw error;
  }
}

module.exports = { limpiarReservacionesExpiradas };