/**
 * Rutas del Dashboard - MVP Coordinador Técnico
 * @swagger
 * /dashboard/kpis:
 *   get:
 *     summary: Obtener KPIs del dashboard
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: KPIs del sistema
 * 
 * /dashboard/tareas-estado:
 *   get:
 *     summary: Obtener tareas por estado
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Distribución de tareas por estado
 * 
 * /dashboard/tareas-cumplimiento:
 *   get:
 *     summary: Obtener porcentaje de cumplimiento de tareas
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Porcentaje de cumplimiento
 * 
 * /dashboard/horas-extras:
 *   get:
 *     summary: Obtener información de horas extras
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Horas extras registradas
 * 
 * /dashboard/tecnicos-carga:
 *   get:
 *     summary: Obtener técnicos con más carga de trabajo
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Técnicos más cargados
 * 
 * /dashboard/facturables-pendientes:
 *   get:
 *     summary: Obtener tareas facturables pendientes
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Lista de facturables pendientes
 * 
 * /dashboard/tareas-recientes:
 *   get:
 *     summary: Obtener tareas recientes
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Lista de tareas recientes
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/kpis', authenticate, dashboardController.obtenerKPIs);
router.get('/tareas-estado', authenticate, dashboardController.tareasPorEstado);
router.get('/tareas-cumplimiento', authenticate, dashboardController.tareasCumplimiento);
router.get('/horas-extras', authenticate, dashboardController.horasExtras);
router.get('/tecnicos-carga', authenticate, dashboardController.tecnicosMasCargados);
router.get('/facturables-pendientes', authenticate, dashboardController.facturablesPendientes);
router.get('/tareas-recientes', authenticate, dashboardController.tareasRecientes);
router.get('/resumen-cliente', authenticate, dashboardController.resumenPorCliente);

module.exports = router;