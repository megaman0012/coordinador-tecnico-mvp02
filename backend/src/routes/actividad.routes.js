/**
 * Rutas de Actividades - Registro de Bitácora
 */

const express = require('express');
const router = express.Router();
const actividadController = require('../controllers/actividad.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Rutas de eventos
router.post('/', authenticate, actividadController.crearEvento);
router.get('/', authenticate, actividadController.listarEventos);
router.get('/tipos', authenticate, actividadController.obtenerTiposEvento);

// Rutas de jornadas
router.get('/jornadas', authenticate, actividadController.listarJornadas);

// Aprobar/observar eventos
router.put('/:id/aprobar', authenticate, actividadController.aprobarEvento);
router.put('/:id/observar', authenticate, actividadController.observarEvento);

// Aprobar/observar jornadas
router.put('/jornadas/:id/aprobar', authenticate, actividadController.aprobarJornada);
router.put('/jornadas/:id/observar', authenticate, actividadController.observarJornada);

// Obtener pendientes (para coordinador)
router.get('/pendientes', authenticate, actividadController.obtenerPendientes);

module.exports = router;
