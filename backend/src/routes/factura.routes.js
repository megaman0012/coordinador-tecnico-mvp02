/**
 * Rutas de Facturas - MVP Coordinador Técnico v3.0
 * @swagger
 * /facturas:
 *   get:
 *     summary: Listar todas las facturas
 *     tags: [Facturas]
 *     responses:
 *       200:
 *         description: Lista de facturas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Factura'
 *   post:
 *     summary: Crear una nueva factura
 *     tags: [Facturas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Factura'
 *     responses:
 *       201:
 *         description: Factura creada
 *       400:
 *         description: Error en los datos
 * 
 * /facturas/{id}:
 *   get:
 *     summary: Obtener una factura por ID
 *     tags: [Facturas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Factura encontrada
 *       404:
 *         description: Factura no encontrada
 *   put:
 *     summary: Actualizar una factura
 *     tags: [Facturas]
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
 *             $ref: '#/components/schemas/Factura'
 *     responses:
 *       200:
 *         description: Factura actualizada
 *       404:
 *         description: Factura no encontrada
 *   delete:
 *     summary: Eliminar una factura
 *     tags: [Facturas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Factura eliminada
 *       404:
 *         description: Factura no encontrada
 * 
 * /facturas/{id}/planificar:
 *   put:
 *     summary: Planificar facturación
 *     tags: [Facturas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Facturación planificada
 * 
 * /facturas/{id}/iniciar:
 *   put:
 *     summary: Iniciar facturación
 *     tags: [Facturas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Facturación iniciada
 * 
 * /facturas/{id}/finalizar:
 *   put:
 *     summary: Finalizar facturación
 *     tags: [Facturas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Facturación finalizada
 * 
 * /facturas/{id}/pagar:
 *   put:
 *     summary: Registrar pago de factura
 *     tags: [Facturas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pago registrado
 * 
 * /facturas/pendientes/lista:
 *   get:
 *     summary: Listar facturas pendientes
 *     tags: [Facturas]
 *     responses:
 *       200:
 *         description: Lista de facturas pendientes
 * 
 * /facturas/vencidas/lista:
 *     summary: Listar facturas vencidas
 *     tags: [Facturas]
 *     responses:
 *       200:
 *         description: Lista de facturas vencidas
 * 
 * /facturas/resumen/estadisticas:
 *   get:
 *     summary: Obtener estadísticas de facturación
 *     tags: [Facturas]
 *     responses:
 *       200:
 *         description: Estadísticas de facturación
 * 
 * /facturas/auto/generar:
 *   post:
 *     summary: Generar facturas automáticamente
 *     tags: [Facturas]
 *     responses:
 *       201:
 *         description: Facturas generadas automáticamente
 */

const express = require('express');
const router = express.Router();
const facturaController = require('../controllers/factura.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

// ==================== RUTAS ESPECÍFICAS (importante: orden afecta match) ====================

// Historial - debe estar ANTES que /:id para evitar que se capture como :id
router.get('/:id/historial', authenticate, facturaController.obtenerHistorial);

// Workflow de Facturación
router.put('/:id/planificar', authenticate, requireRole('admin', 'coordinador'), facturaController.planificarFacturacion);
router.put('/:id/iniciar', authenticate, requireRole('admin', 'coordinador'), facturaController.iniciarFacturacion);
router.put('/:id/finalizar', authenticate, requireRole('admin', 'coordinador'), facturaController.finalizarFacturacion);
router.put('/:id/pagar', authenticate, requireRole('admin', 'coordinador'), facturaController.registrarPago);

// Consultas Especiales
router.get('/pendientes/lista', authenticate, facturaController.facturasPendientes);
router.get('/vencidas/lista', authenticate, facturaController.facturasVencidas);
router.get('/resumen/estadisticas', authenticate, facturaController.resumenFacturacion);

// Automatizaciones
router.post('/auto/generar', authenticate, requireRole('admin', 'coordinador'), facturaController.generarFacturasAuto);

// ==================== CRUD Básico ====================

router.post('/', authenticate, requireRole('admin', 'coordinador'), facturaController.crearFactura);
router.get('/', authenticate, facturaController.listarFacturas);
router.get('/:id', authenticate, facturaController.obtenerFactura);
router.put('/:id', authenticate, requireRole('admin', 'coordinador'), facturaController.actualizarFactura);
router.delete('/:id', authenticate, requireRole('admin'), facturaController.eliminarFactura);

module.exports = router;