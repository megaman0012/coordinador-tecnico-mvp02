/**
 * Controlador de Representantes - MVP Coordinador Técnico
 * Gestión de representantes de clientes
 */

const { PrismaClient } = require('@prisma/client');
const prisma = require('../db');

// Listar representantes
const listarRepresentantes = async (req, res) => {
  try {
    const { id_cliente, estado } = req.query;
    const where = {};
    if (id_cliente) where.id_cliente = parseInt(id_cliente);
    if (estado) where.estado = estado;

    const representantes = await prisma.representante.findMany({
      where,
      include: { cliente: true },
      orderBy: { nombre: 'asc' }
    });
    res.json({ success: true, data: representantes });
  } catch (error) {
    console.error('Error listando representantes:', error);
    res.status(500).json({ error: 'Error al listar representantes' });
  }
};

// Obtener representante por ID
const obtenerRepresentante = async (req, res) => {
  try {
    const { id } = req.params;
    const representante = await prisma.representante.findUnique({
      where: { id: parseInt(id) },
      include: { cliente: true }
    });
    if (!representante) {
      return res.status(404).json({ error: 'Representante no encontrado' });
    }
    res.json(representante);
  } catch (error) {
    console.error('Error obteniendo representante:', error);
    res.status(500).json({ error: 'Error al obtener representante' });
  }
};

// Crear representante
const crearRepresentante = async (req, res) => {
  try {
    const { id_cliente, nombre, telefono, email, cargo, principal } = req.body;

    // Validar campos obligatorios
    if (!id_cliente) {
      return res.status(400).json({ error: 'El cliente es obligatorio' });
    }
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: parseInt(id_cliente) }
    });
    if (!cliente) {
      return res.status(400).json({ error: 'Cliente no encontrado' });
    }

    // Si es principal, quitar principal de otros representantes
    if (principal) {
      await prisma.representante.updateMany({
        where: { id_cliente: parseInt(id_cliente), principal: true },
        data: { principal: false }
      });
    }

    const representante = await prisma.representante.create({
      data: {
        id_cliente: parseInt(id_cliente),
        nombre: nombre.trim(),
        telefono,
        email,
        cargo,
        principal: principal || false
      },
      include: { cliente: true }
    });

    res.status(201).json(representante);
  } catch (error) {
    console.error('Error creando representante:', error);
    res.status(500).json({ error: 'Error al crear representante' });
  }
};

// Actualizar representante
const actualizarRepresentante = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, email, cargo, principal, estado } = req.body;

    // Verificar si existe
    const existente = await prisma.representante.findUnique({
      where: { id: parseInt(id) }
    });
    if (!existente) {
      return res.status(404).json({ error: 'Representante no encontrado' });
    }

    // Si es principal, quitar principal de otros representantes del mismo cliente
    if (principal && !existente.principal) {
      await prisma.representante.updateMany({
        where: { id_cliente: existente.id_cliente, principal: true },
        data: { principal: false }
      });
    }

    const representante = await prisma.representante.update({
      where: { id: parseInt(id) },
      data: {
        nombre: nombre?.trim() || undefined,
        telefono,
        email,
        cargo,
        principal: principal !== undefined ? principal : undefined,
        estado: estado || undefined
      },
      include: { cliente: true }
    });

    res.json(representante);
  } catch (error) {
    console.error('Error actualizando representante:', error);
    res.status(500).json({ error: 'Error al actualizar representante' });
  }
};

// Eliminar representante (dar de baja)
const eliminarRepresentante = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si existe
    const existente = await prisma.representante.findUnique({
      where: { id: parseInt(id) }
    });
    if (!existente) {
      return res.status(404).json({ error: 'Representante no encontrado' });
    }

    // Cambiar estado a inactivo en vez de eliminar
    await prisma.representante.update({
      where: { id: parseInt(id) },
      data: { estado: 'inactivo' }
    });

    res.json({ message: 'Representante dado de baja correctamente' });
  } catch (error) {
    console.error('Error eliminando representante:', error);
    res.status(500).json({ error: 'Error al eliminar representante' });
  }
};

module.exports = {
  listarRepresentantes,
  obtenerRepresentante,
  crearRepresentante,
  actualizarRepresentante,
  eliminarRepresentante
};