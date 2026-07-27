/**
 * Rutas de Asignaciones - MVP Coordinador Técnico v2.0
 * @swagger
 * /asignaciones:
 *   get:
 *     summary: Listar todas las asignaciones
 *     tags: [Asignaciones]
 *     responses:
 *       200:
 *         description: Lista de asignaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Asignacion'
 *   post:
 *     summary: Crear una nueva asignación
 *     tags: [Asignaciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Asignacion'
 *     responses:
 *       201:
 *         description: Asignación creada
 *       400:
 *         description: Error en los datos
 * 
 * /asignaciones/{id}:
 *   get:
 *     summary: Obtener una asignación por ID
 *     tags: [Asignaciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asignación encontrada
 *       404:
 *         description: Asignación no encontrada
 *   put:
 *     summary: Actualizar una asignación
 *     tags: [Asignaciones]
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
 *             $ref: '#/components/schemas/Asignacion'
 *     responses:
 *       200:
 *         description: Asignación actualizada
 *       404:
 *         description: Asignación no encontrada
 *   delete:
 *     summary: Eliminar una asignación
 *     tags: [Asignaciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asignación eliminada
 *       404:
 *         description: Asignación no encontrada
 * 
 * /asignaciones/{id}/completar:
 *   put:
 *     summary: Completar una asignación
 *     tags: [Asignaciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asignación completada
 * 
 * /asignaciones/{id}/reprogramar:
 *   put:
 *     summary: Reprogramar una asignación
 *     tags: [Asignaciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asignación reprogramada
 * 
 * /asignaciones/{id}/no-cumplir:
 *   put:
 *     summary: Marcar asignación como no cumplida
 *     tags: [Asignaciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asignación marcada como no cumplida
 * 
 * /asignaciones/agenda/dia/{fecha}:
 *   get:
 *     summary: Obtener agenda del día
 *     tags: [Asignaciones]
 *     parameters:
 *       - in: path
 *         name: fecha
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agenda del día
 * 
 * /asignaciones/agenda/tecnico/{id}:
 *   get:
 *     summary: Obtener agenda de un técnico
 *     tags: [Asignaciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Agenda del técnico
 * 
 * /asignaciones/carga/trabajo:
 *   get:
 *     summary: Obtener carga de trabajo
 *     tags: [Asignaciones]
 *     responses:
 *       200:
 *         description: Carga de trabajo de técnicos
 * 
 * /asignaciones/multiples:
 *   post:
 *     summary: Crear múltiples asignaciones
 *     tags: [Asignaciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/Asignacion'
 *     responses:
 *       201:
 *         description: Asignaciones creadas
 */

const express = require('express');
const router = express.Router();
const asignacionController = require('../controllers/asignacion.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

// CRUD - Solo admin y coordinador pueden crear/eliminar
router.post('/', authenticate, requireRole('admin', 'coordinador'), asignacionController.crearAsignacion);
router.get('/', authenticate, asignacionController.listarAsignaciones);
router.get('/:id', authenticate, asignacionController.obtenerAsignacion);
router.put('/:id', authenticate, requireRole('admin', 'coordinador'), asignacionController.actualizarAsignacion);
router.delete('/:id', authenticate, requireRole('admin'), asignacionController.eliminarAsignacion);

// Acciones
router.put('/:id/completar', authenticate, asignacionController.completarAsignacion);
router.put('/:id/reprogramar', authenticate, requireRole('admin', 'coordinador'), asignacionController.reprogramarAsignacion);
router.put('/:id/no-cumplir', authenticate, requireRole('admin', 'coordinador'), asignacionController.noCumplirAsignacion);

// Consultas especiales
router.get('/agenda/dia/:fecha', authenticate, asignacionController.agendaDia);
router.get('/agenda/tecnico/:id', authenticate, asignacionController.agendaTecnico);
router.get('/carga/trabajo', authenticate, asignacionController.cargaTrabajo);

// Creación masiva
router.post('/multiples', authenticate, requireRole('admin', 'coordinador'), asignacionController.crearAsignacionesMultiples);

module.exports = router;