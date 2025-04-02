const { Router } = require('express');
const router = Router();
const { getUsuarios, actualizarEstadoUsuario, BuscarUsuario, getPerfiles, crearUsuario, actualizarPasswordUsuario } = require('../controllers/gestionusuario');
const authenticateToken = require('../models/authMiddleware');

router.post('/crearUsuario',authenticateToken, crearUsuario);
router.post('/actualizarPasswordUsuario',  authenticateToken, actualizarPasswordUsuario);
router.get('/getUsuarios', authenticateToken, getUsuarios);
router.get('/getPerfiles', authenticateToken, getPerfiles);
router.put('/actualizarEstadoUsuario', authenticateToken, actualizarEstadoUsuario);
router.get('/buscarusuario/:documento', authenticateToken, BuscarUsuario);

module.exports = router;
