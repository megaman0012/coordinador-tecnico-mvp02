/**
 * Controlador de Técnicos - MVP Coordinador Técnico
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { logger } = require('../utils/logger');

// Crear técnico
const crearTecnico = async (req, res) => {
  try {
    const { nombre, cedula, telefono, email, especialidad, jornada_horaria, crear_usuario } = req.body;

    // Validar campos obligatorios
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    // Validar que si se ingresa cédula, no esté vacía
    if (cedula !== undefined && cedula !== null && cedula.trim() === '') {
      return res.status(400).json({ error: 'La cédula no puede estar vacía' });
    }

    // Verificar si la cédula ya existe (si se proporciona)
    if (cedula && cedula.trim() !== '') {
      const existente = await prisma.tecnico.findFirst({
        where: { cedula: cedula.trim() }
      });
      if (existente) {
        return res.status(400).json({ error: 'Ya existe un técnico con esta cédula' });
      }
    }

    // Crear técnico dentro de transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Crear el técnico
      const tecnico = await tx.tecnico.create({
        data: { 
          nombre: nombre.trim(), 
          cedula: cedula?.trim() || null, 
          telefono, 
          email, 
          especialidad, 
          jornada_horaria: jornada_horaria || 8 
        }
      });

      let usuarioCreado = null;

      // 2. Si crear_usuario es true, crear usuario automáticamente
      if (crear_usuario) {
        // Generar username: usar cédula (sin espacios) o nombre
        let username = (cedula?.trim() || nombre.trim().toLowerCase().replace(/\s+/g, '.'));
        
        // Verificar si el username ya existe
        let usernameExistente = await tx.usuario.findUnique({
          where: { username }
        });

        if (usernameExistente) {
          // Agregar sufijo numérico
          let sufijo = 1;
          username = `${username}${sufijo}`;
          while (await tx.usuario.findUnique({ where: { username } })) {
            sufijo++;
            username = `${username.replace(/\d+$/, '')}${sufijo}`;
          }
        }

        // Password por defecto
        const passwordDefault = 'tec123456';
        const hashedPassword = await bcrypt.hash(passwordDefault, 10);

        usuarioCreado = await tx.usuario.create({
          data: {
            username,
            password: hashedPassword,
            rol: 'tecnico',
            id_tecnico: tecnico.id
          }
        });
      }

      return { tecnico, usuario: usuarioCreado };
    });

    res.status(201).json({
      ...resultado.tecnico,
      usuario_creado: resultado.usuario
    });
  } catch (error) {
    console.error('Error creando técnico:', error);
    
    // Manejar error de restricción única de Prisma
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un técnico con esta cédula' });
    }
    
    res.status(500).json({ error: 'Error al crear técnico' });
  }
};

// Listar técnicos
const listarTecnicos = async (req, res) => {
  try {
    const { estado, especialidad } = req.query;
    const where = {};
    if (estado) where.estado = estado;
    if (especialidad) where.especialidad = especialidad;

    const tecnicos = await prisma.tecnico.findMany({
      where,
      orderBy: { nombre: 'asc' }
    });
    res.json({ success: true, data: tecnicos });
  } catch (error) {
    logger.error('listarTecnicos', 'Error listando técnicos', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al listar técnicos' });
  }
};

// Obtener técnico
const obtenerTecnico = async (req, res) => {
  try {
    const { id } = req.params;
    const tecnico = await prisma.tecnico.findUnique({
      where: { id: parseInt(id) },
      include: { tareas: true, registroHoras: true }
    });
    if (!tecnico) return res.status(404).json({ error: 'Técnico no encontrado' });
    res.json({ success: true, data: tecnico });
  } catch (error) {
    console.error('Error obteniendo técnico:', error);
    res.status(500).json({ error: 'Error al obtener técnico' });
  }
};

// Actualizar técnico
const actualizarTecnico = async (req, res) => {
  try {
    const { id } = req.params;
    const tecnico = await prisma.tecnico.update({
      where: { id: parseInt(id) },
      data: req.body
    });
    res.json({ success: true, data: tecnico });
  } catch (error) {
    console.error('Error actualizando técnico:', error);
    res.status(500).json({ error: 'Error al actualizar técnico' });
  }
};

// Eliminar técnico
const eliminarTecnico = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.tecnico.update({
      where: { id: parseInt(id) },
      data: { estado: 'inactivo' }
    });
    res.json({ message: 'Técnico desactivado' });
  } catch (error) {
    console.error('Error eliminando técnico:', error);
    res.status(500).json({ error: 'Error al eliminar técnico' });
  }
};

module.exports = { crearTecnico, listarTecnicos, obtenerTecnico, actualizarTecnico, eliminarTecnico };