const { Router } = require('express');
const router = Router();

const rateLimiterStrict = require('../models/rateLimiterStrict'); // 1 solicitud por minuto
const rateLimiterFast = require('../models/rateLimiterFast'); // 100 solicitudes por segundo
const authenticateToken = require('../models/authMiddleware');
const {uploadFirma, uploadFields} = require('../models/multer');

const { obtenerNovedades } = require('../controllers/recaudo/obtenerNovedades');
const { actualizarNovedad } = require('../controllers/recaudo/actualizarNovedad');
const { guardarNovedad } = require('../controllers/recaudo/guardarNovedad');
const { obtenerUsuarios } = require('../controllers/recaudo/obtenerUsuarios');
const { obtenerRecaudadores } = require('../controllers/recaudo/obtenerRecaudadores');
const { obtenerTramite } = require('../controllers/recaudo/obtenerTramites');
const { guardarTramite } = require('../controllers/recaudo/guardarTramite');
const { obtenerGestiones } = require('../controllers/recaudo/obtenerGestiones');

router.get('/obtenerNovedades', authenticateToken, rateLimiterFast, obtenerNovedades);
router.post('/actualizarNovedad', authenticateToken, rateLimiterFast, actualizarNovedad);
router.post('/guardarNovedad', rateLimiterFast, guardarNovedad);
router.get('/obtenerUsuarios', rateLimiterFast, obtenerUsuarios);
router.get('/obtenerRecaudadores', rateLimiterFast, obtenerRecaudadores);
router.get('/obtenerTramites', rateLimiterFast, obtenerTramite);
router.post('/guardarTramite', authenticateToken, rateLimiterFast, guardarTramite);
router.get('/obtenerGestiones', authenticateToken, rateLimiterFast, obtenerGestiones);

module.exports = router;
