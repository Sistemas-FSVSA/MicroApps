const { Router } = require('express');
const router = Router();
const { getMunicipios, getTramites, getResponsable, manejarPlanilla, obtenerPlanillaUsuario } = require('../controllers/gestionplanilla');
const authenticateToken = require('../models/authMiddleware');

router.get('/getResponsable', authenticateToken, getResponsable);
router.get('/getMunicipios', authenticateToken, getMunicipios);
router.get('/getTramites', authenticateToken, getTramites);
router.post('/manejarPlanilla', authenticateToken, manejarPlanilla);
router.get('/obtenerPlanillaUsuario/:idusuario',authenticateToken, obtenerPlanillaUsuario);

module.exports = router;
