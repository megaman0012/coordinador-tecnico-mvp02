/**
 * Controlador de Usuarios - MVP Coordinador Técnico
 * Gestión de usuarios del sistema
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = require('../db');

// Listar usuarios
const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      include: { tecnico: true },
      orderBy: { username: 'asc' }
    });
    res.json({ success: true, data: usuarios });
  } catch (error) {
    console.error('Error listando usuarios:', error);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

// Obtener usuario por ID
const obtenerUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(id) },
      include: { tecnico: true }
    });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: usuario });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

// Crear usuario
const crearUsuario = async (req, res) => {
  try {
    const { username, password, rol, id_tecnico } = req.body;

    // Verificar si existe
    const existente = await prisma.usuario.findUnique({ where: { username } });
    if (existente) {
      return res.status(400).json({ error: 'Usuario ya existe' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        username,
        password: hashedPassword,
        rol: rol || 'tecnico',
        id_tecnico: id_tecnico ? parseInt(id_tecnico) : null
      },
      include: { tecnico: true }
    });

    res.status(201).json({ success: true, data: usuario });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

// Actualizar usuario
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, rol, id_tecnico, estado } = req.body;

    // Verificar si el usuario existe
    const existente = await prisma.usuario.findUnique({ where: { id: parseInt(id) } });
    if (!existente) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar si el nuevo username ya existe (si cambió)
    if (username && username !== existente.username) {
      const usernameExists = await prisma.usuario.findUnique({ where: { username } });
      if (usernameExists) {
        return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
      }
    }

    const usuario = await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: {
        username: username || undefined,
        rol: rol || undefined,
        id_tecnico: id_tecnico !== undefined ? (id_tecnico ? parseInt(id_tecnico) : null) : undefined,
        estado: estado || undefined
      },
      include: { tecnico: true }
    });

    res.json({ success: true, data: usuario });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// Eliminar usuario
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.usuario.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

// Cambiar contraseña
const cambiarPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { passwordActual, passwordNuevo } = req.body;

    // Verificar si el usuario existe
    const usuario = await prisma.usuario.findUnique({ where: { id: parseInt(id) } });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual (si se proporciona)
    if (passwordActual) {
      const validPassword = await bcrypt.compare(passwordActual, usuario.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Contraseña actual incorrecta' });
      }
    }

    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(passwordNuevo, 10);

    await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
};

// Cambiar mi propia contraseña (sin verificar la actual)
const cambiarMiPassword = async (req, res) => {
  try {
    const { passwordNuevo } = req.body;
    const usuarioId = req.user.id;

    const hashedPassword = await bcrypt.hash(passwordNuevo, 10);

    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
};

// Resetear contraseña de otro usuario (solo admin)
const resetearPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevaPassword } = req.body;

    // Verificar que el usuario actual es admin
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo el administrador puede resetear contraseñas' });
    }

    // Verificar si el usuario a resetear existe
    const usuario = await prisma.usuario.findUnique({ where: { id: parseInt(id) } });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Encriptar nueva contraseña (por defecto "123456" o la proporcionada)
    const passwordParaReset = nuevaPassword || '123456';
    const hashedPassword = await bcrypt.hash(passwordParaReset, 10);

    await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: { password: hashedPassword }
    });

    res.json({ message: `Contraseña reseteada correctamente. Nueva contraseña: ${passwordParaReset}` });
  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    res.status(500).json({ error: 'Error al resetear contraseña' });
  }
};

module.exports = {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  cambiarPassword,
  cambiarMiPassword,
  resetearPassword
};