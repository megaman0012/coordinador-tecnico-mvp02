/**
 * Rutas de Técnicos - MVP Coordinador Técnico
 * @swagger
 * /tecnicos:
 *   get:
 *     summary: Listar todos los técnicos
 *     tags: [Técnicos]
 *     responses:
 *       200:
 *         description: Lista de técnicos
 *   post:
 *     summary: Crear un nuevo técnico
 *     tags: [Técnicos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Tecnico'
 *     responses:
 *       201:
 *         description: Técnico creado
 * /tecnicos/{id}:
 *   get:
 *     summary: Obtener un técnico por ID
 *     tags: [Técnicos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Técnico encontrado
 *   put:
 *     summary: Actualizar un técnico
 *     tags: [Técnicos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Técnico actualizado
 *   delete:
 *     summary: Eliminar un técnico
 *     tags: [Técnicos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Técnico eliminado
 */

const express = require('express');
const router = express.Router();
const tecnicoController = require('../controllers/tecnico.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.post('/', authenticate, requireRole('admin', 'coordinador'), tecnicoController.crearTecnico);
router.get('/', authenticate, tecnicoController.listarTecnicos);
router.get('/:id', authenticate, tecnicoController.obtenerTecnico);
router.put('/:id', authenticate, requireRole('admin', 'coordinador'), tecnicoController.actualizarTecnico);
router.delete('/:id', authenticate, requireRole('admin'), tecnicoController.eliminarTecnico);

module.exports = router;