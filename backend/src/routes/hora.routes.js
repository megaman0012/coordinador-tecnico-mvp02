/**
 * Rutas de Control de Horas - MVP Coordinador Técnico
 * @swagger
 * /horas:
 *   get:
 *     summary: Listar todas las horas registradas
 *     tags: [Horas]
 *     responses:
 *       200:
 *         description: Lista de horas registradas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Hora'
 *   post:
 *     summary: Registrar una nueva hora
 *     tags: [Horas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Hora'
 *     responses:
 *       201:
 *         description: Hora registrada
 *       400:
 *         description: Error en los datos
 * 
 * /horas/{id}:
 *   put:
 *     summary: Actualizar una hora registrada
 *     tags: [Horas]
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
 *             $ref: '#/components/schemas/Hora'
 *     responses:
 *       200:
 *         description: Hora actualizada
 *       404:
 *         description: Hora no encontrada
 *   delete:
 *     summary: Eliminar una hora registrada
 *     tags: [Horas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Hora eliminada
 *       404:
 *         description: Hora no encontrada
 * 
 * /horas/tecnico/{id}:
 *   get:
 *     summary: Obtener horas de un técnico
 *     tags: [Horas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Horas del técnico
 * 
 * /horas/resumen/diario:
 *   get:
 *     summary: Obtener resumen diario de horas
 *     tags: [Horas]
 *     responses:
 *       200:
 *         description: Resumen diario
 * 
 * /horas/resumen/semanal:
 *   get:
 *     summary: Obtener resumen semanal de horas
 *     tags: [Horas]
 *     responses:
 *       200:
 *         description: Resumen semanal
 * 
 * /horas/resumen/mensual:
 *   get:
 *     summary: Obtener resumen mensual de horas
 *     tags: [Horas]
 *     responses:
 *       200:
 *         description: Resumen mensual
 * 
 * /horas/validar-jornada:
 *   get:
 *     summary: Validar jornada de trabajo
 *     tags: [Horas]
 *     responses:
 *       200:
 *         description: Validación de jornada
 */

const express = require('express');
const router = express.Router();
const horaController = require('../controllers/hora.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

// Rutas originales
router.post('/', authenticate, horaController.crearHora);
router.get('/', authenticate, horaController.listarHoras);
router.get('/tecnico/:id', authenticate, horaController.horasPorTecnico);
router.get('/resumen/diario', authenticate, horaController.resumenDiario);
router.get('/resumen/semanal', authenticate, horaController.resumenSemanal);
router.get('/resumen/mensual', authenticate, horaController.resumenMensual);
router.get('/resumen/custom', authenticate, horaController.resumenCustom);
router.get('/validar-jornada', authenticate, horaController.validarJornada);
router.put('/:id', authenticate, horaController.actualizarHora);
router.delete('/:id', authenticate, requireRole('admin', 'coordinador'), horaController.eliminarHora);

// Rutas para jornadas grupales (nuevo)
router.post('/jornada-grupo', authenticate, requireRole('admin', 'coordinador'), horaController.crearJornadaGrupo);
router.get('/jornadas', authenticate, horaController.listarJornadas);
router.get('/jornada/:id', authenticate, horaController.obtenerJornada);
router.put('/jornada/:id', authenticate, requireRole('admin', 'coordinador'), horaController.actualizarJornada);
router.delete('/jornada/:id', authenticate, requireRole('admin', 'coordinador'), horaController.eliminarJornada);

module.exports = router;