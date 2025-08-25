const { Router } = require('express');
const router = Router();

const rateLimiterStrict = require('../models/rateLimiterStrict'); // 1 solicitud por minuto
const rateLimiterFast = require('../models/rateLimiterFast'); // 100 solicitudes por segundo
const authenticateToken = require('../models/authMiddleware');
const { uploadFirma, uploadFields } = require('../models/multer');

const { crearReservacion } = require('../controllers/agenda/crearReservacion');
const { getReservaciones } = require('../controllers/agenda/getReservaciones');
const { limpiarReservacionesExpiradas } = require('../controllers/agenda/limpiarReservacionesExpiradas');
const { nuevaReservacion } = require('../controllers/agenda/nuevaReservacion');
const { listarDependencias } = require('../controllers/agenda/listarDependencias');
const { obtenerDependenciaPorId } = require('../controllers/agenda/obtenerDependenciaPorId');

router.post('/crearReservacion', rateLimiterFast, crearReservacion);
router.get('/getReservaciones', rateLimiterFast, getReservaciones);
router.post('/limpiarReservaciones', rateLimiterStrict, limpiarReservacionesExpiradas);
router.post('/nuevaReservacion', rateLimiterFast, nuevaReservacion);
router.get('/listarDependencias', rateLimiterFast, listarDependencias);
router.get('/obtenerDependencia/:id', rateLimiterFast, obtenerDependenciaPorId);


module.exports = router;