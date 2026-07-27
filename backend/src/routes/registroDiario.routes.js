/**
 * Rutas de Registro Diario - MVP Coordinador Técnico
 * @swagger
 * /registros-diarios:
 *   get:
 *     summary: Listar todos los registros diarios
 *     tags: [Registro Diario]
 *     responses:
 *       200:
 *         description: Lista de registros diarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RegistroDiario'
 *   post:
 *     summary: Crear un nuevo registro diario
 *     tags: [Registro Diario]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistroDiario'
 *     responses:
 *       201:
 *         description: Registro diario creado
 *       400:
 *         description: Error en los datos
 * 
 * /registros-diarios/{id}:
 *   get:
 *     summary: Obtener un registro diario por ID
 *     tags: [Registro Diario]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Registro diario encontrado
 *       404:
 *         description: Registro diario no encontrado
 *   put:
 *     summary: Actualizar un registro diario
 *     tags: [Registro Diario]
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
 *             $ref: '#/components/schemas/RegistroDiario'
 *     responses:
 *       200:
 *         description: Registro diario actualizado
 *       404:
 *         description: Registro diario no encontrado
 *   delete:
 *     summary: Eliminar un registro diario
 *     tags: [Registro Diario]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Registro diario eliminado
 *       404:
 *         description: Registro diario no encontrado
 * 
 * /registros-diarios/dia/{fecha}:
 *   get:
 *     summary: Obtener registros del día
 *     tags: [Registro Diario]
 *     parameters:
 *       - in: path
 *         name: fecha
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Registros del día
 * 
 * /registros-diarios/tecnico/{id}:
 *   get:
 *     summary: Obtener registros por técnico
 *     tags: [Registro Diario]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Registros del técnico
 * 
 * /registros-diarios/tecnico/{id}/resumen:
 *   get:
 *     summary: Obtener resumen de horas de un técnico
 *     tags: [Registro Diario]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Resumen de horas del técnico
 * 
 * /registros-diarios/detectar-no-cumplidos:
 *   post:
 *     summary: Detectar registros no cumplidos
 *     tags: [Registro Diario]
 *     responses:
 *       200:
 *         description: Registros no cumplidos detectados
 */

const express = require('express');
const router = express.Router();
const registroDiarioController = require('../controllers/registroDiario.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

// CRUD Básico
router.post('/', authenticate, registroDiarioController.crearRegistroDiario);
router.get('/', authenticate, registroDiarioController.listarRegistrosDiarios);
router.get('/:id', authenticate, registroDiarioController.obtenerRegistroDiario);
router.put('/:id', authenticate, registroDiarioController.actualizarRegistroDiario);
router.delete('/:id', authenticate, requireRole('admin', 'coordinador'), registroDiarioController.eliminarRegistroDiario);

// Consultas especiales
router.get('/dia/:fecha', authenticate, registroDiarioController.registrosDelDia);
router.get('/tecnico/:id', authenticate, registroDiarioController.registrosPorTecnico);
router.get('/tecnico/:id/resumen', authenticate, registroDiarioController.resumenHorasTecnico);
router.post('/detectar-no-cumplidos', authenticate, requireRole('admin', 'coordinador'), registroDiarioController.detectarNoCumplidos);

module.exports = router;