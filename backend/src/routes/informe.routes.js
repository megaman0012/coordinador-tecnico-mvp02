/**
 * Rutas de Informes Técnicos - MVP Coordinador Técnico
 * @swagger
 * /informes:
 *   get:
 *     summary: Listar todos los informes técnicos
 *     tags: [Informes]
 *     responses:
 *       200:
 *         description: Lista de informes técnicos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Informe'
 *   post:
 *     summary: Crear un nuevo informe técnico
 *     tags: [Informes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Informe'
 *     responses:
 *       201:
 *         description: Informe creado
 *       400:
 *         description: Error en los datos
 * 
 * /informes/{id}:
 *   get:
 *     summary: Obtener un informe por ID
 *     tags: [Informes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Informe encontrado
 *       404:
 *         description: Informe no encontrado
 *   put:
 *     summary: Actualizar un informe técnico
 *     tags: [Informes]
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
 *             $ref: '#/components/schemas/Informe'
 *     responses:
 *       200:
 *         description: Informe actualizado
 *       404:
 *         description: Informe no encontrado
 *   delete:
 *     summary: Eliminar un informe técnico
 *     tags: [Informes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Informe eliminado
 *       404:
 *         description: Informe no encontrado
 * 
 * /informes/completar-con-informe:
 *   post:
 *     summary: Completar asignación con informe
 *     tags: [Informes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_asignacion:
 *                 type: integer
 *               informe:
 *                 type: object
 *     responses:
 *       201:
 *         description: Asignación completada con informe
 * 
 * /informes/orden/{id_orden}:
 *   get:
 *     summary: Obtener informes por orden
 *     tags: [Informes]
 *     parameters:
 *       - in: path
 *         name: id_orden
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Informes de la orden
 * 
 * /informes/tecnico/{id_tecnico}:
 *   get:
 *     summary: Obtener informes por técnico
 *     tags: [Informes]
 *     parameters:
 *       - in: path
 *         name: id_tecnico
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Informes del técnico
 * 
 * /informes/{id}/estado:
 *   put:
 *     summary: Actualizar estado de informe
 *     tags: [Informes]
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
 *               estado:
 *                 type: string
 *     responses:
 *       200:
 *         description: Estado de informe actualizado
 */

const express = require('express');
const router = express.Router();
const informeController = require('../controllers/informe.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

// CRUD
router.post('/', authenticate, informeController.crearInforme);
router.get('/', authenticate, informeController.listarInformes);
router.get('/:id', authenticate, informeController.obtenerInforme);
router.put('/:id', authenticate, informeController.actualizarInforme);
router.delete('/:id', authenticate, requireRole('admin', 'coordinador'), informeController.eliminarInforme);

// Endpoint especial: Completar asignación con informe
router.post('/completar-con-informe', authenticate, informeController.completarConInforme);

// Consultas especiales
router.get('/orden/:id_orden', authenticate, informeController.informesPorOrden);
router.get('/tecnico/:id_tecnico', authenticate, informeController.informesPorTecnico);
router.put('/:id/estado', authenticate, requireRole('admin', 'coordinador'), informeController.actualizarEstadoInforme);

// Rutas para técnicos
router.get('/mis-informes', authenticate, requireRole('tecnico'), informeController.informesDelTecnico);
router.put('/:id/reenviar', authenticate, requireRole('tecnico'), informeController.actualizarEstadoInformeTecnico);

module.exports = router;