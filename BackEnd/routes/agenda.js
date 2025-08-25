const express = require('express');
const router = express.Router();

const agendaController = require('../controllers/agenda/agenda');
const dependenciaController = require('../controllers/agenda/dependencia');

// Rutas de agenda
router.get('/eventos', agendaController.getEventos);
router.post('/', agendaController.nuevaReservacion);

// Rutas de dependencias
router.get('/dependencias', dependenciaController.listarDependencias);

module.exports = router;


// const rateLimiterStrict = require('../models/rateLimiterStrict'); // 1 solicitud por minuto
// const rateLimiterFast = require('../models/rateLimiterFast'); // 100 solicitudes por segundo
// const authenticateToken = require('../models/authMiddleware');