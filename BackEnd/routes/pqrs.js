const { Router } = require('express');
const router = Router();

const rateLimiterStrict = require('../models/rateLimiterStrict'); // 1 solicitud por minuto
const rateLimiterFast = require('../models/rateLimiterFast'); // 100 solicitudes por segundo
const authenticateToken = require('../models/authMiddleware');
const {uploadFirma, uploadFields} = require('../models/multer');

const { obtenerPlanes } = require('../controllers/pqrs/obtenerPlanes');
const { guardarPQRS } = require('../controllers/pqrs/guardarPQRS');
const { obtenerPQRS } = require('../controllers/pqrs/obtenerPQRS');
const { obtenerTiposPQRS } = require('../controllers/pqrs/obtenerTiposPQRS');
const { obtenerFuentes } = require('../controllers/pqrs/obtenerFuentes');
const { obtenerProcesos } = require('../controllers/pqrs/obtenerProcesos');
const { guardarAnotacion } = require('../controllers/pqrs/guardarAnotacion');
const { obtenerAnotaciones } = require('../controllers/pqrs/obtenerAnotaciones');
const { obtenerAdjuntos } = require('../controllers/pqrs/obtenerAdjuntos');
const { guardarGestionPQRS } = require('../controllers/pqrs/guardarGestionPQRS');
const { guardarAdjuntosPQRS } = require('../controllers/pqrs/guardarAdjuntosPQRS');
const { generarImpresionPQRS } = require('../controllers/pqrs/generarImpresionPQRS');
const { obtenerSubfuentes } = require('../controllers/pqrs/obtenerSubfuentes');

router.get('/obtenerPlanes', authenticateToken, rateLimiterFast, obtenerPlanes);
router.get('/obtenerTiposPQRS', authenticateToken, rateLimiterFast, obtenerTiposPQRS);
router.get('/obtenerFuentes', authenticateToken, rateLimiterFast, obtenerFuentes);
router.get('/obtenerProcesos', authenticateToken, rateLimiterFast, obtenerProcesos);
router.post('/guardarPQRS', authenticateToken, rateLimiterFast, guardarPQRS);
router.post('/guardarAnotacion', authenticateToken, rateLimiterFast, guardarAnotacion);
router.post('/obtenerAnotaciones', authenticateToken, rateLimiterFast, obtenerAnotaciones);
router.post('/obtenerAdjuntos', authenticateToken, rateLimiterFast, obtenerAdjuntos);
router.post('/guardarGestionPQRS', authenticateToken, rateLimiterFast, guardarGestionPQRS);
router.post('/guardarAdjuntosPQRS', authenticateToken, rateLimiterFast, uploadFields, guardarAdjuntosPQRS);
router.post('/obtenerPQRS', authenticateToken, rateLimiterFast, obtenerPQRS);
router.post('/generarImpresionPQRS', authenticateToken, rateLimiterFast, uploadFirma, generarImpresionPQRS);
router.get('/obtenerSubfuentes/:idfuente', authenticateToken, rateLimiterFast, obtenerSubfuentes);

module.exports = router;
