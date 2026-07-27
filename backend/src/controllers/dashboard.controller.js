/**
 * Controlador de Dashboard - MVP Coordinador Técnico
 * Maneja los KPIs y métricas del sistema
 * 
 * NOTA: RegistroDiario es la fuente de verdad para horas trabajadas.
 * horaTecnico se mantiene solo por compatibilidad histórica.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = require('../db');
const { logger } = require('../utils/logger');

// ==================== UTILIDADES ====================

// Obtener todos los KPIs principales
const obtenerKPIs = async (req, res) => {
  try {
    logger.info('obtenerKPIs', 'Obteniendo KPIs del dashboard');
    
    const { mes, año } = req.query;
    
    // Fechas para el período
    const fecha = new Date();
    const añoNum = año ? parseInt(año) : fecha.getFullYear();
    const mesNum = mes ? parseInt(mes) - 1 : fecha.getMonth();
    const inicio = new Date(añoNum, mesNum, 1);
    const fin = new Date(añoNum, mesNum + 1, 0, 23, 59, 59, 999);

    // Total de órdenes por estado
    const ordenesPorEstado = await prisma.orden.groupBy({
      by: ['estado'],
      _count: { id: true }
    });

    // Órdenes por estado (contador)
    const ordenesPendientes = await prisma.orden.count({
      where: { estado: 'pendiente' }
    });
    const ordenesEnProceso = await prisma.orden.count({
      where: { estado: 'en_proceso' }
    });
    const ordenesCompletadas = await prisma.orden.count({
      where: { estado: 'completada' }
    });
    const ordenesNoCumplidas = await prisma.orden.count({
      where: { estado: 'no_cumplida' }
    });
    const ordenesTotal = await prisma.orden.count();

    // ========== USO DE REGISTRODIARIO (FUENTE DE VERDAD) ==========
    // Horas extras del período (usando RegistroDiario)
    const horasExtras = await prisma.registroDiario.aggregate({
      where: {
        es_fin_semana: false,
        horas_extras: { gt: 0 },
        fecha: { gte: inicio, lte: fin }
      },
      _sum: { horas_extras: true }
    });

    // Horas trabajadas en el período (usando RegistroDiario)
    const horasMes = await prisma.registroDiario.aggregate({
      where: {
        fecha: { gte: inicio, lte: fin },
        estado_dia: { in: ['completado', 'en_proceso'] }
      },
      _sum: { horas_normales: true },
      _sum: { horas_extras: true }
    });

    // Técnicos más cargados (con más órdenes asignadas)
    const tecnicosConOrdenes = await prisma.asignacion.groupBy({
      by: ['id_tecnico'],
      _count: { id: true }
    });

    const tecnicosCargados = await Promise.all(
      tecnicosConOrdenes.map(async (t) => {
        const tecnico = await prisma.tecnico.findUnique({
          where: { id: t.id_tecnico }
        });
        return {
          id: t.id_tecnico,
          nombre: tecnico?.nombre || 'Sin asignar',
          tareas_asignadas: t._count.id
        };
      })
    );

    // Órdenes facturables pendientes
    const facturablesPendientes = await prisma.orden.count({
      where: {
        facturable: true,
        estado: 'completada',
        estado_facturacion: { in: ['no_iniciada', 'planificada'] }
      }
    });

    // Facturación
    const facturasPendientes = await prisma.factura.count({
      where: { estado: { in: ['no_iniciada', 'planificada', 'en_proceso'] } }
    });
    const facturasPagadas = await prisma.factura.count({
      where: { estado: 'pagada' }
    });
    const montoFacturado = await prisma.factura.aggregate({
      where: { estado: { in: ['finalizada', 'pagada'] } },
      _sum: { monto: true }
    });
    const montoCobrado = await prisma.factura.aggregate({
      where: { estado: 'pagada' },
      _sum: { monto_pagado: true }
    });

    // Técnicos activos
    const tecnicosActivos = await prisma.tecnico.count({
      where: { estado: 'activo' }
    });

    // Órdenes atrasadas
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    const ordenesAtrasadas = await prisma.orden.count({
      where: {
        estado: { in: ['pendiente', 'en_proceso', 'reprogramada'] },
        fecha_programada: { lt: hoy }
      }
    });

    // Total órdenes creadas en el período
    const ordenesPeriodo = await prisma.orden.count({
      where: {
        createdAt: { gte: inicio, lte: fin }
      }
    });

    res.json({
      success: true,
      data: {
        ordenes: {
          total: ordenesTotal,
          pendientes: ordenesPendientes,
          enProceso: ordenesEnProceso,
          completadas: ordenesCompletadas,
          atrasadas: ordenesAtrasadas
        },
        tecnicos: {
          activos: tecnicosActivos
        },
        horas: {
          // RegistroDiario: suma de normales + extras
          mes: (horasMes._sum.horas_normales || 0) + (horasMes._sum.horas_extras || 0),
          normales: horasMes._sum.horas_normales || 0,
          extras: horasMes._sum.horas_extras || 0
        },
        facturacion: {
          pendientes: facturablesPendientes,
          pagadas: facturasPagadas,
          montoFacturado: montoFacturado._sum.monto || 0,
          montoCobrado: montoCobrado._sum.monto_pagado || 0
        },
        tareas_por_estado: ordenesPorEstado.reduce((acc, t) => {
          acc[t.estado] = t._count.id;
          return acc;
        }, {}),
        tareas_cumplidas: ordenesCompletadas,
        tareas_no_cumplidas: ordenesNoCumplidas,
        horas_extras: horasExtras._sum.horas_extras || 0,
        tecnicos_mas_cargados: tecnicosCargados.sort((a, b) => b.tareas_asignadas - a.tareas_asignadas).slice(0, 5)
      },
      facturables_pendientes: facturablesPendientes,
      tareas_periodo: ordenesPeriodo,
      periodo: { mes: mesNum + 1, año: añoNum }
    });
  } catch (error) {
    console.error('Error obteniendo KPIs:', error);
    res.status(500).json({ error: 'Error al obtener KPIs' });
  }
};

// ==================== ÓRDENES POR ESTADO ====================

const tareasPorEstado = async (req, res) => {
  try {
    const ordenes = await prisma.orden.groupBy({
      by: ['estado'],
      _count: { id: true }
    });

    const resultado = ordenes.map(t => ({
      estado: t.estado,
      cantidad: t._count.id
    }));

    res.json({ success: true, data: resultado });
  } catch (error) {
    logger.error('tareasPorEstado', 'Error al obtener tareas por estado', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al obtener tareas por estado' });
  }
};

// ==================== ÓRDENES CUMPLIDAS VS NO CUMPLIDAS ====================

const tareasCumplimiento = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    const where = {};
    if (fecha_inicio || fecha_fin) {
      where.fecha_fin = {};
      if (fecha_inicio) where.fecha_fin.gte = new Date(fecha_inicio);
      if (fecha_fin) where.fecha_fin.lte = new Date(fecha_fin);
    }

    const cumplidas = await prisma.orden.count({
      where: { ...where, estado: 'completada' }
    });

    const noCumplidas = await prisma.orden.count({
      where: { ...where, estado: 'no_cumplida' }
    });

    const reprogramadas = await prisma.orden.count({
      where: { ...where, estado: 'reprogramada' }
    });

    const pendientes = await prisma.orden.count({
      where: { estado: { in: ['pendiente', 'en_proceso'] } }
    });

    res.json({
      success: true,
      data: {
        cumplidas,
        no_cumplidas: noCumplidas,
        reprogramadas,
        pendientes,
        total: cumplidas + noCumplidas + reprogramadas + pendientes,
        porcentaje_cumplimiento: (cumplidas / (cumplidas + noCumplidas) * 100) || 0
      }
    });
  } catch (error) {
    logger.error('tareasCumplimiento', 'Error al obtener cumplimiento', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al obtener cumplimiento' });
  }
};

// ==================== HORAS EXTRAS ====================

const horasExtras = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    const where = { tipo: 'extra' };
    if (fecha_inicio || fecha_fin) {
      where.fecha = {};
      if (fecha_inicio) where.fecha.gte = new Date(fecha_inicio);
      if (fecha_fin) where.fecha.lte = new Date(fecha_fin);
    }

    const horas = await prisma.horaTecnico.findMany({
      where,
      include: { tecnico: true },
      orderBy: { fecha: 'desc' }
    });

    const total = horas.reduce((sum, h) => sum + h.horas_trabajadas, 0);

    // Agrupar por técnico
    const porTecnico = {};
    horas.forEach(h => {
      if (!porTecnico[h.id_tecnico]) {
        porTecnico[h.id_tecnico] = {
          tecnico: h.tecnico,
          total_horas: 0
        };
      }
      porTecnico[h.id_tecnico].total_horas += h.horas_trabajadas;
    });

    res.json({
      success: true,
      data: {
        total,
        por_tecnico: Object.values(porTecnico),
        detalle: horas
      }
    });
  } catch (error) {
    logger.error('horasExtras', 'Error al obtener horas extras', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al obtener horas extras' });
  }
};

// ==================== TÉCNICOS MÁS CARGADOS ====================

const tecnicosMasCargados = async (req, res) => {
  try {
    const { limite } = req.query;
    const top = parseInt(limite) || 5;

    const tecnicos = await prisma.tecnico.findMany({
      where: { estado: 'activo' },
      include: {
        asignaciones: {
          where: { estado: { in: ['pendiente', 'en_proceso', 'reprogramado'] } }
        }
      }
    });

    const conCarga = tecnicos.map(t => ({
      id: t.id,
      nombre: t.nombre,
      especialidad: t.especialidad,
      tareas_activas: t.asignaciones.length,
      horas_registradas_hoy: 0
    }));

    res.json({
      success: true,
      data: conCarga.sort((a, b) => b.tareas_activas - a.tareas_activas).slice(0, top)
    });
  } catch (error) {
    logger.error('tecnicosMasCargados', 'Error al obtener técnicos cargados', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al obtener técnicos cargados' });
  }
};

// ==================== FACTURABLES PENDIENTES ====================

const facturablesPendientes = async (req, res) => {
  try {
    const ordenes = await prisma.orden.findMany({
      where: {
        facturable: true,
        estado: 'completada',
        estado_facturacion: { in: ['no_iniciada', 'planificada'] }
      },
      include: {
        cliente: true,
        local: true
      },
      orderBy: { fecha_fin: 'desc' }
    });

    res.json({ success: true, data: ordenes });
  } catch (error) {
    logger.error('facturablesPendientes', 'Error al obtener facturables', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al obtener facturables' });
  }
};

// ==================== ÓRDENES RECIENTES ====================

const tareasRecientes = async (req, res) => {
  try {
    const { limite } = req.query;
    const top = parseInt(limite) || 10;

    const ordenes = await prisma.orden.findMany({
      take: top,
      include: {
        cliente: true,
        local: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ success: true, data: ordenes });
  } catch (error) {
    logger.error('tareasRecientes', 'Error al obtener tareas recientes', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al obtener tareas recientes' });
  }
};

// Resumen de órdenes por cliente
const resumenPorCliente = async (req, res) => {
  try {
    // Obtener todos los clientes con sus locales
    const clientes = await prisma.cliente.findMany({
      where: { estado: 'activo' },
      include: {
        ordenes: {
          include: {
            local: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    // Calcular resumen por cliente
    const resumen = clientes.map(cliente => {
      const ordenes = cliente.ordenes;
      return {
        id: cliente.id,
        nombre: cliente.nombre,
        ruc: cliente.ruc,
        total: ordenes.length,
        pendientes: ordenes.filter(o => o.estado === 'pendiente').length,
        asignadas: ordenes.filter(o => o.estado === 'asignada').length,
        enProceso: ordenes.filter(o => o.estado === 'en_proceso').length,
        completadas: ordenes.filter(o => o.estado === 'completada').length,
        noCumplidas: ordenes.filter(o => o.estado === 'no_cumplida').length,
        reprogramadas: ordenes.filter(o => o.estado === 'reprogramada').length,
        facturadas: ordenes.filter(o => o.estado === 'facturada').length
      };
    });

    res.json({ success: true, data: resumen });
  } catch (error) {
    logger.error('resumenPorCliente', 'Error al obtener resumen por cliente', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al obtener resumen por cliente' });
  }
};

module.exports = {
  obtenerKPIs,
  tareasPorEstado,
  tareasCumplimiento,
  horasExtras,
  tecnicosMasCargados,
  facturablesPendientes,
  tareasRecientes,
  resumenPorCliente
};