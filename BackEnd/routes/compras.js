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
const { manejarOrden } = require('../controllers/compras/manejarOrden');
const { obtenerPedido } = require('../controllers/compras/obtenerPedido');
const { obtenerEstadoPedido } = require('../controllers/compras/obtenerEstadoPedido');
const { obtenerOrden } = require('../controllers/compras/obtenerOrden');
const { guardarRelacion } = require('../controllers/compras/guardarRelacion');
const { obtenerProveedores } = require('../controllers/compras/obtenerProveedor');
const { actualizarEstadoItem } = require('../controllers/compras/actualizarEstadoItem');
const { obtenerCategoria } = require('../controllers/compras/obtenerCategoria');

router.post('/guardarCategoria', authenticateToken, rateLimiterFast, guardarCategoria);
router.post('/guardarItem', authenticateToken, rateLimiterFast, guardarItem);
router.post('/guardarDependencia', authenticateToken, rateLimiterFast, guardarDependencia);
router.get('/obtenerItems', authenticateToken, rateLimiterFast, obtenerItems);
router.get('/obtenerItemsPedido', authenticateToken, rateLimiterFast, obtenerItemsPedido);
router.post('/manejarPedido', authenticateToken, rateLimiterFast, manejarPedido);
router.post('/manejarOrden', authenticateToken, rateLimiterFast, manejarOrden);
router.post('/obtenerPedido', authenticateToken, rateLimiterFast, obtenerPedido)
router.get('/obtenerEstadoPedido/:idpedido', authenticateToken, rateLimiterFast, obtenerEstadoPedido);
router.post('/obtenerOrden', authenticateToken, rateLimiterFast, obtenerOrden);
router.post('/guardarRelacion', authenticateToken, rateLimiterFast, guardarRelacion);
router.get('/obtenerProveedores', authenticateToken, rateLimiterFast, obtenerProveedores);
router.post('/actualizarEstadoItem', authenticateToken, rateLimiterFast, actualizarEstadoItem);
router.post('/obtenerCategoria', authenticateToken, rateLimiterFast, obtenerCategoria);


module.exports = router;
