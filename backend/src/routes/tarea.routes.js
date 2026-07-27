/**
 * Rutas de Tareas - MVP Coordinador Técnico
 * @swagger
 * /tareas:
 *   get:
 *     summary: Listar todas las tareas
 *     tags: [Tareas]
 *     responses:
 *       200:
 *         description: Lista de tareas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tarea'
 *   post:
 *     summary: Crear una nueva tarea
 *     tags: [Tareas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Tarea'
 *     responses:
 *       201:
 *         description: Tarea creada
 *       400:
 *         description: Error en los datos
 * 
 * /tareas/{id}:
 *   get:
 *     summary: Obtener una tarea por ID
 *     tags: [Tareas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tarea encontrada
 *       404:
 *         description: Tarea no encontrada
 *   put:
 *     summary: Actualizar una tarea
 *     tags: [Tareas]
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
 *             $ref: '#/components/schemas/Tarea'
 *     responses:
 *       200:
 *         description: Tarea actualizada
 *       404:
 *         description: Tarea no encontrada
 *   delete:
 *     summary: Eliminar una tarea
 *     tags: [Tareas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tarea eliminada
 *       404:
 *         description: Tarea no encontrada
 * 
 * /tareas/{id}/asignar:
 *   put:
 *     summary: Asignar técnico a una tarea
 *     tags: [Tareas]
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
 *             type: object
 *             properties:
 *               id_tecnico:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Técnico asignado
 * 
 * /tareas/{id}/iniciar:
 *   put:
 *     summary: Iniciar una tarea
 *     tags: [Tareas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tarea iniciada
 * 
 * /tareas/{id}/finalizar:
 *   put:
 *     summary: Finalizar una tarea
 *     tags: [Tareas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tarea finalizada
 * 
 * /tareas/{id}/reprogramar:
 *   put:
 *     summary: Reprogramar una tarea
 *     tags: [Tareas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tarea reprogramada
 * 
 * /tareas/{id}/no-cumplir:
 *   put:
 *     summary: Marcar tarea como no cumplida
 *     tags: [Tareas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tarea marcada como no cumplida
 * 
 * /tareas/{id}/historial:
 *   get:
 *     summary: Obtener historial de una tarea
 *     tags: [Tareas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Historial de la tarea
 * 
 * /tareas/filtro/estado/{estado}:
 *   get:
 *     summary: Listar tareas por estado
 *     tags: [Tareas]
 *     parameters:
 *       - in: path
 *         name: estado
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de tareas por estado
 * 
 * /tareas/filtro/tecnico/{id}:
 *   get:
 *     summary: Listar tareas por técnico
 *     tags: [Tareas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de tareas del técnico
 * 
 * /tareas/filtro/fecha/{fecha}:
 *   get:
 *     summary: Listar tareas por fecha
 *     tags: [Tareas]
 *     parameters:
 *       - in: path
 *         name: fecha
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de tareas por fecha
 * 
 * /tareas/filtro/facturables:
 *   get:
 *     summary: Listar tareas facturables
 *     tags: [Tareas]
 *     responses:
 *       200:
 *         description: Lista de tareas facturables
 */

const express = require('express');
const router = express.Router();
const tareaController = require('../controllers/tarea.controller');

// Rutas CRUD
router.post('/', tareaController.crearTarea);
router.get('/', tareaController.listarTareas);
router.get('/:id', tareaController.obtenerTarea);
router.put('/:id', tareaController.actualizarTarea);
router.delete('/:id', tareaController.eliminarTarea);

// Acciones específicas
router.put('/:id/asignar', tareaController.asignarTecnico);
router.put('/:id/iniciar', tareaController.iniciarTarea);
router.put('/:id/finalizar', tareaController.finalizarTarea);
router.put('/:id/reprogramar', tareaController.reprogramarTarea);
router.put('/:id/no-cumplir', tareaController.noCumplirTarea);
router.get('/:id/historial', tareaController.obtenerHistorial);

// Filtros
router.get('/filtro/estado/:estado', tareaController.tareasPorEstado);
router.get('/filtro/tecnico/:id', tareaController.tareasPorTecnico);
router.get('/filtro/fecha/:fecha', tareaController.tareasPorFecha);
router.get('/filtro/facturables', tareaController.tareasFacturables);

module.exports = router;