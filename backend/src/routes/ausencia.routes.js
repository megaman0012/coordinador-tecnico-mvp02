/**
 * Rutas de Ausencias - Días libres, permisos, vacaciones
 */

const express = require('express');
const router = express.Router();
const ausenciaController = require('../controllers/ausencia.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Rutas específicas primero (antes de /:id)
router.get('/pendientes', authenticate, ausenciaController.obtenerPendientes);
router.get('/tipos', authenticate, ausenciaController.obtenerTipos);

// Rutas con ID
router.delete('/:id', authenticate, ausenciaController.eliminarAusencia);
router.put('/:id/aprobar', authenticate, ausenciaController.aprobarAusencia);
router.put('/:id/rechazar', authenticate, ausenciaController.rechazarAusencia);

// Rutas CRUD básica
router.post('/', authenticate, ausenciaController.crearAusencia);
router.get('/', authenticate, ausenciaController.listarAusencias);

module.exports = router;
