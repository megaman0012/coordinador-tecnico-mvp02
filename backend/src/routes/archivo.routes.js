/**
 * Rutas de Archivos - Upload de imágenes y PDFs
 */

const express = require('express');
const router = express.Router();
const archivoController = require('../controllers/archivo.controller');
const { authenticate } = require('../middleware/auth.middleware');

// POST /api/archivos - Subir archivo
router.post('/', authenticate, archivoController.uploadArchivo, archivoController.subirArchivo);

// DELETE /api/archivos/:filename - Eliminar archivo
router.delete('/:filename', authenticate, archivoController.eliminarArchivo);

module.exports = router;