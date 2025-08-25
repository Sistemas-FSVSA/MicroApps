    // controllers/agenda.js
const agendaModel = require('../models/agendaModel');

// Obtener todas las reservaciones
async function getReservaciones(req, res) {
  try {
    const reservaciones = await agendaModel.getReservaciones();
    res.status(200).json(reservaciones);
  } catch (error) {
    console.error('Error al obtener reservaciones:', error);
    res.status(500).json({ error: 'Error al obtener reservaciones' });
  }
}

// Crear nueva reservación
async function crearReservacion(req, res) {
  try {
    const data = req.body;

    // Validación rápida de campos obligatorios
    if (!data.usuario || !data.correo || !data.dependencia || !data.fechaReservacion || !data.horaInicio || !data.horaFin) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const result = await agendaModel.crearReservacion(data);
    res.status(201).json(result);

  } catch (error) {
    console.error('Error al crear reservación:', error);
    res.status(500).json({ error: 'Error al crear reservación' });
  }
}

module.exports = {
  getReservaciones,
  crearReservacion
};