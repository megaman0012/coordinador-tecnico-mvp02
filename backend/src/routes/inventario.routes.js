/**
 * Rutas de Inventario - MVP Coordinador Técnico
 * Sistema centralizado de inventario técnico
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const inventarioController = require('../controllers/inventario.controller');

// Configuración de multer para archivos Excel
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.match(/\.xlsx?$/)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
  }
});

// ==================== RUTAS ====================

// GET /inventario/plantilla - Descargar plantilla Excel
router.get('/plantilla', inventarioController.descargarPlantilla);

// POST /inventario/importar - Importar desde Excel
router.post('/importar', upload.single('archivo'), inventarioController.importarInventario);

// GET /inventario/resumen - Resumen agrupado por local
router.get('/resumen', inventarioController.getResumen);

// GET /inventario - Listado completo
router.get('/', inventarioController.getInventario);

// GET /inventario/:id - Obtener por ID
router.get('/:id', inventarioController.getInventarioById);

// GET /inventario/local/:id_externo - Obtener todos los registros de un local
router.get('/local/:id_externo', inventarioController.getInventarioByLocal);

// POST /inventario - Crear registro
router.post('/', inventarioController.createInventario);

// PUT /inventario/:id - Actualizar
router.put('/:id', inventarioController.updateInventario);

// DELETE /inventario/:id - Eliminar
router.delete('/:id', inventarioController.deleteInventario);

module.exports = router;