const { Router } = require('express');
const router = Router();

const rateLimiterStrict = require('../models/rateLimiterStrict'); // 1 solicitud por minuto
const rateLimiterFast = require('../models/rateLimiterFast'); // 100 solicitudes por segundo
const authenticateToken = require('../models/authMiddleware');

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
const { actualizarItems } = require('../controllers/compras/actualizarItems');
const { obtenerUsuario } = require('../controllers/compras/obtenerUsuario');
const { obtenerDependencias } = require('../controllers/compras/obtenerDependencias');
const { actualizarUsuario } = require('../controllers/compras/actualizarUsuario');
const { guardarProveedor } = require('../controllers/compras/guardarProveedor');
const { generarOrdenCompra } = require('../controllers/compras/generarOrdenCompra');
const { generarOrdenSalida } = require('../controllers/compras/generarOrdenSalida');
const { actualizarFacturaPedido } = require('../controllers/compras/actualizarFacturaPedido');
const { obtenerAprobado } = require('../controllers/compras/obtenerAprobado');
const { actualizarEstadoPedido } = require('../controllers/compras/actualizarEstadoPedido');
const { actualizarEstadoCategoria } = require('../controllers/compras/actualizarEstadoCategoria');
const { actualizarEstadoProveedor } = require('../controllers/compras/actualizarEstadoProveedor');

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
router.post('/actualizarItems', authenticateToken, rateLimiterFast, actualizarItems);
router.post('/obtenerUsuario', authenticateToken, rateLimiterFast, obtenerUsuario);
router.get('/obtenerDependencias', authenticateToken, rateLimiterFast, obtenerDependencias);
router.post('/actualizarUsuario', authenticateToken, rateLimiterFast, actualizarUsuario);
router.post('/guardarProveedor', authenticateToken, rateLimiterFast, guardarProveedor);
router.post('/generarOrdenCompra', authenticateToken, rateLimiterFast, generarOrdenCompra);
router.post('/generarOrdenSalida', authenticateToken, rateLimiterFast, generarOrdenSalida);
router.post('/actualizarFacturaPedido', authenticateToken, rateLimiterFast, actualizarFacturaPedido);
router.get('/obtenerAprobado', authenticateToken, rateLimiterFast, obtenerAprobado);
router.post('/actualizarEstadoPedido', authenticateToken, rateLimiterFast, actualizarEstadoPedido);
router.post('/actualizarEstadoCategoria', authenticateToken, rateLimiterFast, actualizarEstadoCategoria);
router.post('/actualizarEstadoProveedor', authenticateToken, rateLimiterFast, actualizarEstadoProveedor);

module.exports = router;
