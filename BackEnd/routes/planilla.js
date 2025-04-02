const { Router } = require('express');
const router = Router();
const { getPlanilla, cerrarPlanilla, getPlanillas, aprobarPlanilla, rechazarPlanilla, getPlanillasFiltro, pagarPlanillasPorFechas } = require('../controllers/planilla');
const authenticateToken = require('../models/authMiddleware');

router.get('/getPlanilla/:idusuario', authenticateToken, getPlanilla);
router.get('/getPlanillas', authenticateToken, getPlanillas);
router.get('/getPlanillasFiltro', authenticateToken, getPlanillasFiltro);
router.post('/aprobarPlanilla/:idplanilla', authenticateToken, aprobarPlanilla);
router.post('/rechazarPlanilla/:idplanilla', authenticateToken, rechazarPlanilla);
router.post('/cerrarPlanilla/:idplanilla', authenticateToken, cerrarPlanilla);
router.post('/pagarPlanillasPorFechas', authenticateToken, pagarPlanillasPorFechas);


module.exports = router;
