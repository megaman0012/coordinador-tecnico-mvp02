/**
 * Controlador de Asignaciones - MVP Coordinador Técnico v2.0
 * Gestión de planificación diaria de técnicos
 * 
 * refactorizado para usar:
 * - State Machine para validación de estados
 * - Logger para logs estructurados
 * - Manejo de errores uniforme
 */

const { PrismaClient } = require('@prisma/client');
const prisma = require('../db');
const { logger } = require('../utils/logger');
const { asignacionStateMachine, ordenStateMachine } = require('../services/estadoMachine.service');

// ==================== CRUD BÁSICO ====================

// Función para calcular horas entre dos horarios
const calcularHoras = (horaInicio, horaFin) => {
  if (!horaInicio || !horaFin) return 0;
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFin.split(':').map(Number);
  return (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
};

// Crear asignación
const crearAsignacion = async (req, res) => {
  try {
    logger.info('crearAsignacion', 'Creando asignación', { body: req.body });
    
    const {
      id_orden,
      id_tecnico,
      fecha_asignacion,
      hora_inicio_programada,
      hora_fin_programada
    } = req.body;

    // Obtener la orden para validar límite de horas técnicas
    const orden = await prisma.orden.findUnique({
      where: { id: parseInt(id_orden) }
    });

    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    // Calcular límite de horas técnicas permitidas
    const limiteHorasTecnicas = orden.cantidad_tecnicos * orden.horas_estimadas;

    // Obtener asignaciones actuales de la orden
    const asignacionesActuales = await prisma.asignacion.findMany({
      where: { id_orden: parseInt(id_orden) }
    });

    // Calcular horas ya asignadas
    let horasAsignadas = 0;
    for (const asig of asignacionesActuales) {
      horasAsignadas += calcularHoras(asig.hora_inicio_programada, asig.hora_fin_programada);
    }

    // Calcular horas de la nueva asignación
    const horasNuevaAsignacion = calcularHoras(hora_inicio_programada, hora_fin_programada);

    // Validar que no exceda el límite
    if (horasAsignadas + horasNuevaAsignacion > limiteHorasTecnicas) {
      return res.status(400).json({ 
        success: false, 
        message: `No se puede asignar. Límite: ${limiteHorasTecnicas} horas técnicas (${orden.cantidad_tecnicos} técnicos × ${orden.horas_estimadas} horas). Ya asignadas: ${horasAsignadas} horas.`
      });
    }

    // Usar fecha con hora fija para evitar problemas de timezone (UTC vs local)
    const fechaAsignacionDate = new Date(fecha_asignacion + 'T12:00:00.000Z');
    
    const asignacion = await prisma.asignacion.create({
      data: {
        id_orden: parseInt(id_orden),
        id_tecnico: parseInt(id_tecnico),
        fecha_asignacion: fechaAsignacionDate,
        hora_inicio_programada,
        hora_fin_programada
      }
    });

    // Si la orden estaba pendiente, actualizarla a asignada
    if (orden.estado === 'pendiente') {
      await prisma.orden.update({
        where: { id: parseInt(id_orden) },
        data: { estado: 'asignada' }
      });
    }

    logger.info('crearAsignacion', 'Asignación creada', { asignacionId: asignacion.id });
    res.status(201).json({ success: true, data: asignacion });
  } catch (error) {
    logger.error('crearAsignacion', 'Error al crear asignación', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al crear la asignación' });
  }
};

// Listar asignaciones con filtros
const listarAsignaciones = async (req, res) => {
  try {
    const { id_tecnico, id_orden, fecha_inicio, fecha_fin, estado } = req.query;
    
    const where = {};
    if (id_tecnico) where.id_tecnico = parseInt(id_tecnico);
    if (id_orden) where.id_orden = parseInt(id_orden);
    if (estado) where.estado = estado;
    if (fecha_inicio || fecha_fin) {
      where.fecha_asignacion = {};
      if (fecha_inicio) where.fecha_asignacion.gte = new Date(fecha_inicio);
      if (fecha_fin) where.fecha_asignacion.lte = new Date(fecha_fin);
    }

    const asignaciones = await prisma.asignacion.findMany({
      where,
      include: {
        orden: {
          include: { cliente: true, local: true }
        },
        tecnico: true,
        registrosDiario: true
      },
      orderBy: { fecha_asignacion: 'asc' }
    });

    res.json({ success: true, data: asignaciones });
  } catch (error) {
    console.error('Error listando asignaciones:', error);
    res.status(500).json({ success: false, message: 'Error al listar asignaciones' });
  }
};

// Obtener asignación por ID
const obtenerAsignacion = async (req, res) => {
  try {
    const { id } = req.params;
    const asignacion = await prisma.asignacion.findUnique({
      where: { id: parseInt(id) },
      include: {
        orden: {
          include: { cliente: true, local: true }
        },
        tecnico: true,
        registrosDiario: {
          include: { tecnico: true }
        }
      }
    });

    if (!asignacion) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    res.json({ success: true, data: asignacion });
  } catch (error) {
    console.error('Error obteniendo asignación:', error);
    res.status(500).json({ error: 'Error al obtener la asignación' });
  }
};

// Actualizar asignación
const actualizarAsignacion = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const asignacion = await prisma.asignacion.update({
      where: { id: parseInt(id) },
      data: {
        ...data,
        id_orden: data.id_orden ? parseInt(data.id_orden) : undefined,
        id_tecnico: data.id_tecnico ? parseInt(data.id_tecnico) : undefined,
        fecha_asignacion: data.fecha_asignacion ? new Date(data.fecha_asignacion) : undefined
      }
    });

    res.json(asignacion);
  } catch (error) {
    console.error('Error actualizando asignación:', error);
    res.status(500).json({ error: 'Error al actualizar la asignación' });
  }
};

// Eliminar asignación
const eliminarAsignacion = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.asignacion.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Asignación eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando asignación:', error);
    res.status(500).json({ error: 'Error al eliminar la asignación' });
  }
};

// ==================== ACCIONES ESPECÍFICAS ====================

// Completar asignación
const completarAsignacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario } = req.body;

    logger.info('completarAsignacion', 'Completando asignación', { asignacionId: id });

    // Obtener la asignación primero para saber la orden
    const asignacionActual = await prisma.asignacion.findUnique({
      where: { id: parseInt(id) }
    });

    if (!asignacionActual) {
      return res.status(404).json({ success: false, message: 'Asignación no encontrada' });
    }

    // VALIDACIÓN: Verificar transición de estado
    const validacion = asignacionStateMachine.validarTransicion(asignacionActual.estado, 'completada');
    if (!validacion.valido) {
      logger.warn('completarAsignacion', 'Transición inválida', { estadoActual: asignacionActual.estado });
      return res.status(400).json({ success: false, message: validacion.message });
    }

    const asignacion = await prisma.asignacion.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'completada',
        fecha_asignacion_real: new Date()
      }
    });

    // Verificar si la última asignación está completada
    const ultimaAsignacion = await prisma.asignacion.findFirst({
      where: { id_orden: asignacionActual.id_orden },
      orderBy: { fecha_asignacion: 'desc' }
    });

    // Si la última asignación es la que se completa, marcar orden como completada
    if (ultimaAsignacion && ultimaAsignacion.id === asignacion.id && ultimaAsignacion.estado === 'completada') {
      // OBTENER el estado actual de la orden para validar la transición
      const ordenActual = await prisma.orden.findUnique({
        where: { id: asignacionActual.id_orden }
      });

      if (ordenActual) {
        // VALIDACIÓN: Verificar transición de la orden con State Machine
        const validacionOrden = ordenStateMachine.validarTransicion(ordenActual.estado, 'completada');
        if (!validacionOrden.valido) {
          logger.warn('completarAsignacion', 'Transición de orden inválida', {
            estadoActual: ordenActual.estado,
            nuevoEstado: 'completada'
          });
          // La asignación se marca completada, pero la orden no cambia de estado
          logger.warn('completarAsignacion', 'Asignación completada pero orden no puede pasar a completada', {
            message: validacionOrden.message
          });
        } else {
          // Solo actualizar si la transición es válida
          await prisma.orden.update({
            where: { id: asignacionActual.id_orden },
            data: { estado: 'completada' }
          });
          
          // Registrar en historial de la orden
          await prisma.historialOrden.create({
            data: {
              id_orden: asignacionActual.id_orden,
              accion: 'completada',
              estado_anterior: ordenActual.estado,
              estado_nuevo: 'completada',
              motivo: 'Todas las asignaciones completadas',
              usuario: usuario || 'sistema'
            }
          });
        }
      }
    }

    logger.info('completarAsignacion', 'Asignación completada', { asignacionId: id });
    res.json({ success: true, data: asignacion });
  } catch (error) {
    logger.error('completarAsignacion', 'Error al completar asignación', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al completar la asignación' });
  }
};

// Reprogramar asignación
const reprogramarAsignacion = async (req, res) => {
  try {
    logger.info('reprogramarAsignacion', 'Reprogramando asignación', { asignacionId: req.params.id });
    
    const { id } = req.params;
    const { fecha_asignacion, hora_inicio_programada, hora_fin_programada, motivo_reprogramacion } = req.body;

    // Validar transición de estado
    const asignacionActual = await prisma.asignacion.findUnique({ where: { id: parseInt(id) } });
    if (!asignacionActual) {
      return res.status(404).json({ success: false, message: 'Asignación no encontrada' });
    }
    
    const validacion = asignacionStateMachine.validarTransicion(asignacionActual.estado, 'reprogramado');
    if (!validacion.valido) {
      return res.status(400).json({ success: false, message: validacion.message });
    }

    // Usar fecha con hora fija para evitar problemas de timezone
    const fechaAsignacionDate = new Date(fecha_asignacion + 'T12:00:00.000Z');
    
    const asignacion = await prisma.asignacion.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'reprogramado',
        fecha_asignacion: fechaAsignacionDate,
        hora_inicio_programada,
        hora_fin_programada,
        motivo_reprogramacion
      }
    });

    logger.info('reprogramarAsignacion', 'Asignación reprogramada', { asignacionId: id });
    res.json({ success: true, data: asignacion });
  } catch (error) {
    logger.error('reprogramarAsignacion', 'Error al reprogramar asignación', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al reprogramar la asignación' });
  }
};

// Marcar como no cumplido
const noCumplirAsignacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const asignacion = await prisma.asignacion.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'no_cumplido',
        motivo_reprogramacion: motivo
      }
    });

    res.json(asignacion);
  } catch (error) {
    console.error('Error marcando asignación como no cumplida:', error);
    res.status(500).json({ error: 'Error al marcar asignación como no cumplida' });
  }
};

// ==================== CONSULTAS ESPECIALES ====================

// Obtener agenda del día
const agendaDia = async (req, res) => {
  try {
    const { fecha } = req.params;
    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const asignaciones = await prisma.asignacion.findMany({
      where: {
        fecha_asignacion: {
          gte: fechaInicio,
          lte: fechaFin
        }
      },
      include: {
        orden: {
          include: { cliente: true, local: true }
        },
        tecnico: true
      },
      orderBy: { hora_inicio_programada: 'asc' }
    });

    res.json({ success: true, data: asignaciones });
  } catch (error) {
    console.error('Error obteniendo agenda del día:', error);
    res.status(500).json({ success: false, message: 'Error al obtener agenda del día' });
  }
};

// Obtener agenda de técnico por rango de fechas
const agendaTecnico = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_inicio, fecha_fin } = req.query;

    const where = { id_tecnico: parseInt(id) };
    if (fecha_inicio || fecha_fin) {
      where.fecha_asignacion = {};
      if (fecha_inicio) where.fecha_asignacion.gte = new Date(fecha_inicio);
      if (fecha_fin) where.fecha_asignacion.lte = new Date(fecha_fin);
    }

    const asignaciones = await prisma.asignacion.findMany({
      where,
      include: {
        orden: {
          include: { cliente: true, local: true }
        }
      },
      orderBy: { fecha_asignacion: 'asc' }
    });

    res.json({ success: true, data: asignaciones });
  } catch (error) {
    console.error('Error obteniendo agenda de técnico:', error);
    res.status(500).json({ success: false, message: 'Error al obtener agenda de técnico' });
  }
};

// Carga de trabajo por técnico (semana actual)
const cargaTrabajo = async (req, res) => {
  try {
    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);

    const tecnicos = await prisma.tecnico.findMany({
      where: { estado: 'activo' },
      include: {
        asignaciones: {
          where: {
            fecha_asignacion: {
              gte: inicioSemana,
              lte: finSemana
            }
          },
          include: {
            orden: true
          }
        }
      }
    });

    const carga = tecnicos.map(t => ({
      tecnico: t,
      total_asignaciones: t.asignaciones.length,
      horas_programadas: t.asignaciones.reduce((acc, a) => {
        // Calcular horas programadas si hay hora inicio y fin
        if (a.hora_inicio_programada && a.hora_fin_programada) {
          const inicio = new Date(`2000-01-01 ${a.hora_inicio_programada}`);
          const fin = new Date(`2000-01-01 ${a.hora_fin_programada}`);
          return acc + (fin - inicio) / (1000 * 60 * 60);
        }
        return acc + t.jornada_horaria;
      }, 0)
    }));

    res.json(carga);
  } catch (error) {
    console.error('Error calculando carga de trabajo:', error);
    res.status(500).json({ error: 'Error al calcular carga de trabajo' });
  }
};

// ==================== CREACIÓN MASIVA ====================

// Crear múltiples asignaciones (para tarea multi-día)
const crearAsignacionesMultiples = async (req, res) => {
  try {
    const { asignaciones } = req.body; // Array de objetos con datos de asignación

    const creadas = await prisma.asignacion.createMany({
      data: asignaciones.map(a => ({
        id_orden: parseInt(a.id_orden),
        id_tecnico: parseInt(a.id_tecnico),
        fecha_asignacion: new Date(a.fecha_asignacion),
        hora_inicio_programada: a.hora_inicio_programada,
        hora_fin_programada: a.hora_fin_programada
      }))
    });

    res.status(201).json({ message: `${creadas.count} asignaciones creadas` });
  } catch (error) {
    console.error('Error creando asignaciones múltiples:', error);
    res.status(500).json({ error: 'Error al crear asignaciones múltiples' });
  }
};

module.exports = {
  crearAsignacion,
  listarAsignaciones,
  obtenerAsignacion,
  actualizarAsignacion,
  eliminarAsignacion,
  completarAsignacion,
  reprogramarAsignacion,
  noCumplirAsignacion,
  agendaDia,
  agendaTecnico,
  cargaTrabajo,
  crearAsignacionesMultiples
};