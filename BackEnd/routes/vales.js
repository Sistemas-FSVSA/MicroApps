const { Router } = require('express');
const router = Router();
const { consultaEncargados } = require('../controllers/vales/consultaEncargado');
const { placaEncargado } = require('../controllers/vales/placaEncargado');
const { guardarVale } = require('../controllers/vales/guardarVale');
const { consultarVales } = require('../controllers/vales/consultarVales');
const { consultaCategorias } = require('../controllers/vales/consultaCategorias');
const { obtenerCategorias } = require('../controllers/vales/obtenerCategorias');
const { generarReporte } = require('../controllers/vales/generarReporte');
const { registrarEncargado } = require('../controllers/vales/registrarEncargado');
const authenticateToken = require('../models/authMiddleware');

router.post('/consultaEncargados', consultaEncargados);
router.get('/obtenerCategorias', obtenerCategorias);
router.post('/placaEncargado', placaEncargado);
router.post('/guardarVale', guardarVale);
router.post('/consultarVales', consultarVales);
router.post('/consultaCategorias', consultaCategorias);
router.post('/generarReporte', generarReporte);
router.post('/registrarEncargado', registrarEncargado);


module.exports = router;
