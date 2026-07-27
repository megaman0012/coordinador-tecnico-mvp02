/**
 * Rutas de Usuarios - MVP Coordinador Técnico
 * @swagger
 * /usuarios:
 *   get:
 *     summary: Listar todos los usuarios
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 *   post:
 *     summary: Crear un nuevo usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Usuario'
 *     responses:
 *       201:
 *         description: Usuario creado
 *       400:
 *         description: Error en los datos
 * 
 * /usuarios/{id}:
 *   get:
 *     summary: Obtener un usuario por ID
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       404:
 *         description: Usuario no encontrado
 *   put:
 *     summary: Actualizar un usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
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
 *             $ref: '#/components/schemas/Usuario'
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       404:
 *         description: Usuario no encontrado
 *   delete:
 *     summary: Eliminar un usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario eliminado
 *       404:
 *         description: Usuario no encontrado
 * 
 * /usuarios/{id}/cambiar-password:
 *   put:
 *     summary: Cambiar contraseña de un usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
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
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña cambiada
 * 
 * /usuarios/cambiar-mi-password:
 *   post:
 *     summary: Cambiar mi propia contraseña
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password_actual:
 *                 type: string
 *               password_nuevo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña cambiada
 * 
 * /usuarios/resetear-password/{id}:
 *   post:
 *     summary: Resetear contraseña de un usuario (solo admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contraseña reseteada
 */

const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// CRUD - Solo admin puede crear y eliminar usuarios
router.get('/', requireRole('admin', 'coordinador'), usuarioController.listarUsuarios);
router.get('/:id', requireRole('admin', 'coordinador'), usuarioController.obtenerUsuario);
router.post('/', requireRole('admin'), usuarioController.crearUsuario);
router.put('/:id', requireRole('admin', 'coordinador'), usuarioController.actualizarUsuario);
router.delete('/:id', requireRole('admin'), usuarioController.eliminarUsuario);

// Cambiar contraseña
router.put('/:id/cambiar-password', requireRole('admin', 'coordinador'), usuarioController.cambiarPassword);
router.post('/cambiar-mi-password', usuarioController.cambiarMiPassword);

// Resetear contraseña (solo admin)
router.post('/resetear-password/:id', requireRole('admin'), usuarioController.resetearPassword);

module.exports = router;