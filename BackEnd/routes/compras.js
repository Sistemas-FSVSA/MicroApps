const { Router } = require('express');
const router = Router();

const rateLimiterStrict = require('../models/rateLimiterStrict'); // 1 solicitud por minuto
const rateLimiterFast = require('../models/rateLimiterFast'); // 100 solicitudes por segundo
const authenticateToken = require('../models/authMiddleware');
const { uploadFirma, uploadFields } = require('../models/multer');

const { guardarCategoria } = require('../controllers/compras/guardarCategoria');
const { guardarItem } = require('../controllers/compras/guardarItem');
const { guardarDependencia } = require('../controllers/compras/guardarDependencia');
const { obtenerItems } = require('../controllers/compras/obtenerItems');
const { obtenerItemsPedido } = require('../controllers/compras/obtenerItemsPedido');
const { manejarPedido } = require('../controllers/compras/manejarPedido');
const { obtenerPedido } = require('../controllers/compras/obtenerPedido');
const { obtenerEstadoPedido } = require('../controllers/compras/obtenerEstadoPedido');

router.post('/guardarCategoria', authenticateToken, rateLimiterFast, guardarCategoria);
router.post('/guardarItem', authenticateToken, rateLimiterFast, guardarItem);
router.post('/guardarDependencia', authenticateToken, rateLimiterFast, guardarDependencia);
router.get('/obtenerItems', authenticateToken, rateLimiterFast, obtenerItems);
router.get('/obtenerItemsPedido', authenticateToken, rateLimiterFast, obtenerItemsPedido);
router.post('/manejarPedido', authenticateToken, rateLimiterFast, manejarPedido);
router.post('/obtenerPedido', authenticateToken, rateLimiterFast, obtenerPedido)
router.get('/obtenerEstadoPedido/:idpedido', authenticateToken, rateLimiterFast, obtenerEstadoPedido);


module.exports = router;
