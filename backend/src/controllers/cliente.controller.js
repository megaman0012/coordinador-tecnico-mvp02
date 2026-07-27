/**
 * Controlador de Clientes - MVP Coordinador Técnico
 */

const { PrismaClient } = require('@prisma/client');
const prisma = require('../db');

// Crear cliente
const crearCliente = async (req, res) => {
  try {
    console.log('📥 POST /api/clientes - Body recibido:', req.body);
    
    const { nombre, ruc, telefono, email, direccion } = req.body;
    const cliente = await prisma.cliente.create({
      data: { nombre, ruc, telefono, email, direccion }
    });
    res.status(201).json(cliente);
  } catch (error) {
    console.error('Error creando cliente:', error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
};

// Listar clientes
const listarClientes = async (req, res) => {
  try {
    const { estado } = req.query;
    const clientes = await prisma.cliente.findMany({
      where: estado ? { estado } : {},
      orderBy: { nombre: 'asc' }
    });
    res.json({ success: true, data: clientes });
  } catch (error) {
    console.error('Error listando clientes:', error);
    res.status(500).json({ error: 'Error al listar clientes' });
  }
};

// Obtener cliente
const obtenerCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await prisma.cliente.findUnique({
      where: { id: parseInt(id) },
      include: { locales: true }
    });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ success: true, data: cliente });
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
};

// Actualizar cliente
const actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, ruc, telefono, email, direccion } = req.body;
    
    const cliente = await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: { nombre, ruc, telefono, email, direccion }
    });
    res.json(cliente);
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

// Eliminar cliente
const eliminarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: { estado: 'inactivo' }
    });
    res.json({ message: 'Cliente desactivado' });
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
};

module.exports = { crearCliente, listarClientes, obtenerCliente, actualizarCliente, eliminarCliente };