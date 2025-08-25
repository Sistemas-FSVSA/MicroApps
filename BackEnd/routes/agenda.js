const { Router } = require('express');
const router = Router();
const rateLimiterFast = require('../models/rateLimiterFast'); // 100 solicitudes por segundo


const { obtenerReservaciones } = require('../controllers/agenda/obtenerReservaciones');
const { guardarReservacion } = require('../controllers/agenda/guardarReservacion');
const { obtenerDependencias } = require('../controllers/agenda/obtenerDependencias');
const { obtenerReservacionPorId } = require('../controllers/agenda/obtenerReservacion');

router.get('/obtenerReservaciones/:mes', rateLimiterFast, obtenerReservaciones);
router.post('/guardarReservacion', rateLimiterFast, guardarReservacion);
router.get('/obtenerDependencias', rateLimiterFast, obtenerDependencias);
router.get('/obtenerDependencias/:id', rateLimiterFast, obtenerDependencias);
router.get('/obtenerReservacion/:idreservacion', rateLimiterFast, obtenerReservacionPorId);


module.exports = router;
