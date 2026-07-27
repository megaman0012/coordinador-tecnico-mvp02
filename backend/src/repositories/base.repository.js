/**
 * Capa de Repositorios - Ordm
 * Sistema Coordinador Técnico MVP v3.0
 * 
 * Esta capa centraliza todas las consultas a Prisma.
 * Los controllers deben usar estos repositorios en lugar de consultas directas.
 */

const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient();

// ==================== REPOSITORIO DE ÓRDENES ====================

const ordenRepository = {
  /**
   * Obtener todas las órdenes con filtros
   */
  findAll: async (filtros = {}) => {
    try {
      return await prisma.orden.findMany({
        where: filtros,
        include: {
          cliente: true,
          local: true,
          asignaciones: {
            include: { tecnico: true }
          }
        },
        orderBy: { fecha_creacion: 'desc' }
      });
    } catch (error) {
      logger.error('ordenRepository.findAll', 'Error consultando órdenes', { filtros, error: error.message });
      throw error;
    }
  },

  /**
   * Obtener una orden por ID
   */
  findById: async (id) => {
    try {
      return await prisma.orden.findUnique({
        where: { id },
        include: {
          cliente: true,
          local: true,
          asignaciones: { include: { tecnico: true } },
          factura: true,
          informes: true,
          historial: true
        }
      });
    } catch (error) {
      logger.error('ordenRepository.findById', `Error consultando orden ${id}`, { error: error.message });
      throw error;
    }
  },

  /**
   * Crear una orden
   */
  create: async (data) => {
    try {
      return await prisma.orden.create({
        data: {
          ...data,
          numero_orden: data.numero_orden || await generarNumeroOrden()
        },
        include: {
          cliente: true,
          local: true
        }
      });
    } catch (error) {
      logger.error('ordenRepository.create', 'Error creando orden', { data, error: error.message });
      throw error;
    }
  },

  /**
   * Actualizar una orden
   */
  update: async (id, data) => {
    try {
      return await prisma.orden.update({
        where: { id },
        data,
        include: {
          cliente: true,
          local: true
        }
      });
    } catch (error) {
      logger.error('ordenRepository.update', `Error actualizando orden ${id}`, { data, error: error.message });
      throw error;
    }
  },

  /**
   * Eliminar una orden
   */
  delete: async (id) => {
    try {
      return await prisma.orden.delete({ where: { id } });
    } catch (error) {
      logger.error('ordenRepository.delete', `Error eliminando orden ${id}`, { error: error.message });
      throw error;
    }
  },

  /**
   * Obtener órdenes atrasadas
   */
  findAtrasadas: async () => {
    try {
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);
      return await prisma.orden.findMany({
        where: {
          estado: { in: ['pendiente', 'en_proceso', 'reprogramada'] },
          fecha_programada: { lt: hoy }
        },
        include: { cliente: true, local: true },
        orderBy: { fecha_programada: 'asc' }
      });
    } catch (error) {
      logger.error('ordenRepository.findAtrasadas', 'Error consultando órdenes atrasadas', { error: error.message });
      throw error;
    }
  },

  /**
   * Obtener órdenes facturables pendientes
   */
  findFacturablesPendientes: async () => {
    try {
      return await prisma.orden.findMany({
        where: {
          facturable: true,
          estado: 'completada'
        },
        include: { cliente: true, local: true },
        orderBy: { fecha_programada: 'desc' }
      });
    } catch (error) {
      logger.error('ordenRepository.findFacturablesPendientes', 'Error', { error: error.message });
      throw error;
    }
  }
};

// ==================== REPOSITORIO DE CLIENTES ====================

const clienteRepository = {
  findAll: async (filtros = {}) => {
    try {
      return await prisma.cliente.findMany({
        where: filtros,
        include: { locales: true, representantes: true },
        orderBy: { nombre: 'asc' }
      });
    } catch (error) {
      logger.error('clienteRepository.findAll', 'Error', { filtros, error: error.message });
      throw error;
    }
  },

  findById: async (id) => {
    try {
      return await prisma.cliente.findUnique({
        where: { id },
        include: { locales: true, representantes: true }
      });
    } catch (error) {
      logger.error('clienteRepository.findById', `Error ${id}`, { error: error.message });
      throw error;
    }
  },

  create: async (data) => {
    try {
      return await prisma.cliente.create({ data, include: { locales: true } });
    } catch (error) {
      logger.error('clienteRepository.create', 'Error', { error: error.message });
      throw error;
    }
  },

  update: async (id, data) => {
    try {
      return await prisma.cliente.update({ where: { id }, data, include: { locales: true } });
    } catch (error) {
      logger.error('clienteRepository.update', `Error ${id}`, { error: error.message });
      throw error;
    }
  },

  delete: async (id) => {
    try {
      return await prisma.cliente.delete({ where: { id } });
    } catch (error) {
      logger.error('clienteRepository.delete', `Error ${id}`, { error: error.message });
      throw error;
    }
  }
};

// ==================== REPOSITORIO DE TÉCNICOS ====================

const tecnicoRepository = {
  findAll: async (filtros = {}) => {
    try {
      return await prisma.tecnico.findMany({
        where: filtros,
        include: { usuario: true },
        orderBy: { nombre: 'asc' }
      });
    } catch (error) {
      logger.error('tecnicoRepository.findAll', 'Error', { filtros, error: error.message });
      throw error;
    }
  },

  findById: async (id) => {
    try {
      return await prisma.tecnico.findUnique({
        where: { id },
        include: { 
          usuario: true,
          asignaciones: true,
          registrosDiario: true
        }
      });
    } catch (error) {
      logger.error('tecnicoRepository.findById', `Error ${id}`, { error: error.message });
      throw error;
    }
  },

  create: async (data) => {
    try {
      return await prisma.tecnico.create({ data });
    } catch (error) {
      logger.error('tecnicoRepository.create', 'Error', { error: error.message });
      throw error;
    }
  },

  update: async (id, data) => {
    try {
      return await prisma.tecnico.update({ where: { id }, data });
    } catch (error) {
      logger.error('tecnicoRepository.update', `Error ${id}`, { error: error.message });
      throw error;
    }
  },

  delete: async (id) => {
    try {
      return await prisma.tecnico.delete({ where: { id } });
    } catch (error) {
      logger.error('tecnicoRepository.delete', `Error ${id}`, { error: error.message });
      throw error;
    }
  }
};

// ==================== REPOSITORIO DE FACTURAS ====================

const facturaRepository = {
  findAll: async (filtros = {}) => {
    try {
      return await prisma.factura.findMany({
        where: filtros,
        include: { orden: { include: { cliente: true, local: true } } },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      logger.error('facturaRepository.findAll', 'Error', { filtros, error: error.message });
      throw error;
    }
  },

  findById: async (id) => {
    try {
      return await prisma.factura.findUnique({
        where: { id },
        include: { orden: { include: { cliente: true, local: true } } }
      });
    } catch (error) {
      logger.error('facturaRepository.findById', `Error ${id}`, { error: error.message });
      throw error;
    }
  },

  create: async (data) => {
    try {
      return await prisma.factura.create({ data });
    } catch (error) {
      logger.error('facturaRepository.create', 'Error', { error: error.message });
      throw error;
    }
  },

  update: async (id, data) => {
    try {
      return await prisma.factura.update({ where: { id }, data });
    } catch (error) {
      logger.error('facturaRepository.update', `Error ${id}`, { error: error.message });
      throw error;
    }
  },

  delete: async (id) => {
    try {
      return await prisma.factura.delete({ where: { id } });
    } catch (error) {
      logger.error('facturaRepository.delete', `Error ${id}`, { error: error.message });
      throw error;
    }
  }
};

// ==================== HELPER FUNCTIONS ====================

async function generarNumeroOrden() {
  const año = new Date().getFullYear();
  const ultimo = await prisma.orden.findFirst({
    orderBy: { id: 'desc' },
    where: { numero_orden: { startsWith: `ORD-${año}` } }
  });
  const numero = ultimo ? parseInt(ultimo.numero_orden.split('-')[2]) + 1 : 1;
  return `ORD-${año}-${numero.toString().padStart(4, '0')}`;
}

module.exports = {
  prisma,
  ordenRepository,
  clienteRepository,
  tecnicoRepository,
  facturaRepository
};