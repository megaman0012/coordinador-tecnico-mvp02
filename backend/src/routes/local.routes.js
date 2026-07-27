/**
 * Rutas de Locales - MVP Coordinador Técnico
 * @swagger
 * /locales:
 *   get:
 *     summary: Listar todos los locales
 *     tags: [Locales]
 *     responses:
 *       200:
 *         description: Lista de locales
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Local'
 *   post:
 *     summary: Crear un nuevo local
 *     tags: [Locales]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Local'
 *     responses:
 *       201:
 *         description: Local creado
 *       400:
 *         description: Error en los datos
 * 
 * /locales/{id}:
 *   get:
 *     summary: Obtener un local por ID
 *     tags: [Locales]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Local encontrado
 *       404:
 *         description: Local no encontrado
 *   put:
 *     summary: Actualizar un local
 *     tags: [Locales]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Local'
 *     responses:
 *       200:
 *         description: Local actualizado
 *       404:
 *         description: Local no encontrado
 *   delete:
 *     summary: Eliminar un local
 *     tags: [Locales]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Local eliminado
 *       404:
 *         description: Local no encontrado
 */

const express = require('express');
const router = express.Router();
const localController = require('../controllers/local.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const multer = require('multer');

// Configuración de multer para uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

router.post('/', authenticate, requireRole('admin', 'coordinador'), localController.crearLocal);
router.get('/', authenticate, localController.listarLocales);
router.get('/exportar', authenticate, requireRole('admin', 'coordinador'), localController.exportarLocales);
router.post('/importar', authenticate, requireRole('admin', 'coordinador'), upload.single('archivo'), localController.importarLocales);
router.get('/:id', authenticate, localController.obtenerLocal);
router.put('/:id', authenticate, requireRole('admin', 'coordinador'), localController.actualizarLocal);
router.delete('/:id', authenticate, requireRole('admin'), localController.eliminarLocal);

module.exports = router;