/**
 * Rutas de Representantes - MVP Coordinador Técnico
 * @swagger
 * /representantes:
 *   get:
 *     summary: Listar todos los representantes
 *     tags: [Representantes]
 *     responses:
 *       200:
 *         description: Lista de representantes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Representante'
 *   post:
 *     summary: Crear un nuevo representante
 *     tags: [Representantes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Representante'
 *     responses:
 *       201:
 *         description: Representante creado
 *       400:
 *         description: Error en los datos
 * 
 * /representantes/{id}:
 *   get:
 *     summary: Obtener un representante por ID
 *     tags: [Representantes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Representante encontrado
 *       404:
 *         description: Representante no encontrado
 *   put:
 *     summary: Actualizar un representante
 *     tags: [Representantes]
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
 *             $ref: '#/components/schemas/Representante'
 *     responses:
 *       200:
 *         description: Representante actualizado
 *       404:
 *         description: Representante no encontrado
 *   delete:
 *     summary: Eliminar un representante
 *     tags: [Representantes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Representante eliminado
 *       404:
 *         description: Representante no encontrado
 */

const express = require('express');
const router = express.Router();
const representanteController = require('../controllers/representante.controller');

// Rutas CRUD
router.get('/', representanteController.listarRepresentantes);
router.get('/:id', representanteController.obtenerRepresentante);
router.post('/', representanteController.crearRepresentante);
router.put('/:id', representanteController.actualizarRepresentante);
router.delete('/:id', representanteController.eliminarRepresentante);

module.exports = router;