const { Router } = require('express');
const router = Router();

const rateLimiterStrict = require('../models/rateLimiterStrict'); // 1 solicitud por minuto
const rateLimiterFast = require('../models/rateLimiterFast'); // 100 solicitudes por segundo

const { postUsuario, logout } = require('../controllers/index');

router.post('/postUsuario', rateLimiterFast, postUsuario);
router.post('/logout', rateLimiterFast, logout);

module.exports = router;
