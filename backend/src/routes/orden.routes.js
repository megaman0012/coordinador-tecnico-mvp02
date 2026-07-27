/**
 * Rutas de Órdenes - MVP Coordinador Técnico v2.0
 * @swagger
 * /ordenes:
 *   get:
 *     summary: Listar todas las órdenes
 *     tags: [Órdenes]
 *     responses:
 *       200:
 *         description: Lista de órdenes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Orden'
 *   post:
 *     summary: Crear una nueva orden
 *     tags: [Órdenes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Orden'
 *     responses:
 *       201:
 *         description: Orden creada
 *       400:
 *         description: Error en los datos
 * 
 * /ordenes/{id}:
 *   get:
 *     summary: Obtener una orden por ID
 *     tags: [Órdenes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden encontrada
 *       404:
 *         description: Orden no encontrada
 *   put:
 *     summary: Actualizar una orden
 *     tags: [Órdenes]
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
 *             $ref: '#/components/schemas/Orden'
 *     responses:
 *       200:
 *         description: Orden actualizada
 *       404:
 *         description: Orden no encontrada
 *   delete:
 *     summary: Eliminar una orden
 *     tags: [Órdenes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden eliminada
 *       404:
 *         description: Orden no encontrada
 * 
 * /ordenes/atrasadas:
 *   get:
 *     summary: Listar órdenes atrasadas
 *     tags: [Órdenes]
 *     responses:
 *       200:
 *         description: Lista de órdenes atrasadas
 * 
 * /ordenes/facturables-pendientes:
 *     summary: Listar órdenes facturables pendientes
 *     tags: [Órdenes]
 *     responses:
 *       200:
 *         description: Lista de órdenes facturables pendientes
 * 
 * /ordenes/facturables:
 *     summary: Listar órdenes facturables
 *     tags: [Órdenes]
 *     responses:
 *       200:
 *         description: Lista de órdenes facturables
 * 
 * /ordenes/estado/{estado}:
 *   get:
 *     summary: Listar órdenes por estado
 *     tags: [Órdenes]
 *     parameters:
 *       - in: path
 *         name: estado
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de órdenes por estado
 * 
 * /ordenes/{id}/iniciar:
 *   put:
 *     summary: Iniciar una orden
 *     tags: [Órdenes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden iniciada
 * 
 * /ordenes/{id}/completar:
 *   put:
 *     summary: Completar una orden
 *     tags: [Órdenes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden completada
 * 
 * /ordenes/{id}/reprogramar:
 *   put:
 *     summary: Reprogramar una orden
 *     tags: [Órdenes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden reprogramada
 * 
 * /ordenes/{id}/cancelar:
 *   put:
 *     summary: Cancelar una orden
 *     tags: [Órdenes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden cancelada
 * 
 * /ordenes/{id}/enviar-facturacion:
 *   put:
 *     summary: Enviar orden a facturación
 *     tags: [Órdenes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden enviada a facturación
 * 
 * /ordenes/{id}/actualizar-facturacion:
 *   put:
 *     summary: Actualizar estado de facturación
 *     tags: [Órdenes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado de facturación actualizado
 * 
 * /ordenes/{id}/historial:
 *   get:
 *     summary: Obtener historial de una orden
 *     tags: [Órdenes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Historial de la orden
 */

const express = require('express');
const router = express.Router();
const ordenController = require('../controllers/orden.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const multer = require('multer');

// Configuración de multer para archivos Excel
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const ext = require('path').extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
  }
});

// ==================== IMPORTACIÓN DESDE EXCEL ====================
// IMPORTANTE: Estas rutas deben estar ANTES de /:id para evitar conflictos

// POST /api/ordenes/importar/validar - Fase 1: Validar sin insertar
router.post(
  '/importar/validar',
  authenticate,
  requireRole('admin', 'coordinador'),
  upload.single('archivo'),
  ordenController.validarImportacion
);

// POST /api/ordenes/importar/ejecutar - Fase 2: Validar e insertar
router.post(
  '/importar/ejecutar',
  authenticate,
  requireRole('admin', 'coordinador'),
  upload.single('archivo'),
  ordenController.ejecutarImportacionOrden
);

// GET /api/ordenes/plantilla - Descargar plantilla con ejemplos
router.get(
  '/plantilla',
  ordenController.descargarPlantillaOrdenes
);

// ==================== CRUD Y DEMÁS RUTAS ====================

// Filtros (ANTES de /:id para evitar conflictos)
router.get('/atrasadas', authenticate, ordenController.ordenesAtrasadas);
router.get('/facturables-pendientes', authenticate, ordenController.ordenesFacturablesPendientes);
router.get('/facturables', authenticate, ordenController.ordenesFacturablesPendientes);
router.get('/estado/:estado', authenticate, ordenController.ordenesPorEstado);

// CRUD - Solo admin y coordinador pueden crear, editar y eliminar
router.post('/', authenticate, requireRole('admin', 'coordinador'), ordenController.crearOrden);
router.get('/', authenticate, ordenController.listarOrdenes);
router.get('/:id', authenticate, ordenController.obtenerOrden);
router.put('/:id', authenticate, requireRole('admin', 'coordinador'), ordenController.actualizarOrden);
router.delete('/:id', authenticate, requireRole('admin'), ordenController.eliminarOrden);

// Acciones - Todos pueden iniciar, pero solo admin/coordinador pueden completar/cancelar
router.put('/:id/iniciar', authenticate, ordenController.iniciarOrden);
router.put('/:id/completar', authenticate, requireRole('admin', 'coordinador'), ordenController.completarOrden);
router.put('/:id/reprogramar', authenticate, requireRole('admin', 'coordinador'), ordenController.reprogramarOrden);
router.put('/:id/cancelar', authenticate, requireRole('admin', 'coordinador'), ordenController.cancelarOrden);

// Facturación - Solo admin y coordinador
router.put('/:id/enviar-facturacion', authenticate, requireRole('admin', 'coordinador'), ordenController.enviarAFacturacion);
router.put('/:id/actualizar-facturacion', authenticate, requireRole('admin', 'coordinador'), ordenController.actualizarEstadoFacturacion);

// Historial
router.get('/:id/historial', authenticate, ordenController.obtenerHistorial);

module.exports = router;