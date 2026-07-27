/**
 * Controlador de Tareas - MVP Coordinador Técnico
 * Maneja toda la lógica de negocio para la gestión de tareas
 */

const { PrismaClient } = require('@prisma/client');
const prisma = require('../db');

// ==================== CRUD BÁSICO ====================

// Crear nueva tarea
const crearTarea = async (req, res) => {
  try {
    const {
      id_cliente,
      id_local,
      id_tecnico,
      tipo_trabajo,
      prioridad,
      descripcion,
      fecha_programada,
      hora_programada,
      facturable
    } = req.body;

    const tarea = await prisma.tarea.create({
      data: {
        id_cliente: parseInt(id_cliente),
        id_local: parseInt(id_local),
        id_tecnico: id_tecnico ? parseInt(id_tecnico) : null,
        tipo_trabajo,
        prioridad,
        descripcion,
        fecha_programada: fecha_programada ? new Date(fecha_programada) : null,
        hora_programada,
        facturable: facturable || false
      }
    });

    // Registrar en historial
    await prisma.historialTarea.create({
      data: {
        id_tarea: tarea.id,
        accion: 'creado',
        estado_nuevo: 'pendiente',
        motivo: 'Tarea creada',
        usuario: req.body.usuario || 'sistema'
      }
    });

    res.status(201).json(tarea);
  } catch (error) {
    console.error('Error creando tarea:', error);
    res.status(500).json({ error: 'Error al crear la tarea' });
  }
};

// Listar todas las tareas con filtros
const listarTareas = async (req, res) => {
  try {
    const { estado, prioridad, id_tecnico, fecha_inicio, fecha_fin } = req.query;
    
    const where = {};
    if (estado) where.estado = estado;
    if (prioridad) where.prioridad = prioridad;
    if (id_tecnico) where.id_tecnico = parseInt(id_tecnico);
    if (fecha_inicio || fecha_fin) {
      where.fecha_programada = {};
      if (fecha_inicio) where.fecha_programada.gte = new Date(fecha_inicio);
      if (fecha_fin) where.fecha_programada.lte = new Date(fecha_fin);
    }

    const tareas = await prisma.tarea.findMany({
      where,
      include: {
        cliente: true,
        local: true,
        tecnico: true
      },
      orderBy: { fecha_programada: 'asc' }
    });

    res.json(tareas);
  } catch (error) {
    console.error('Error listando tareas:', error);
    res.status(500).json({ error: 'Error al listar tareas' });
  }
};

// Obtener tarea por ID
const obtenerTarea = async (req, res) => {
  try {
    const { id } = req.params;
    const tarea = await prisma.tarea.findUnique({
      where: { id: parseInt(id) },
      include: {
        cliente: true,
        local: true,
        tecnico: true,
        historial: { orderBy: { fecha_cambio: 'desc' } },
        registroHoras: true
      }
    });

    if (!tarea) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    res.json(tarea);
  } catch (error) {
    console.error('Error obteniendo tarea:', error);
    res.status(500).json({ error: 'Error al obtener la tarea' });
  }
};

// Actualizar tarea
const actualizarTarea = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Obtener estado actual
    const tareaActual = await prisma.tarea.findUnique({
      where: { id: parseInt(id) }
    });

    const tarea = await prisma.tarea.update({
      where: { id: parseInt(id) },
      data: {
        ...data,
        id_cliente: data.id_cliente ? parseInt(data.id_cliente) : undefined,
        id_local: data.id_local ? parseInt(data.id_local) : undefined,
        id_tecnico: data.id_tecnico ? parseInt(data.id_tecnico) : undefined
      }
    });

    // Registrar cambio si hubo cambio de estado
    if (data.estado && data.estado !== tareaActual.estado) {
      await prisma.historialTarea.create({
        data: {
          id_tarea: tarea.id,
          accion: 'actualizado',
          estado_anterior: tareaActual.estado,
          estado_nuevo: data.estado,
          motivo: data.motivo || 'Actualización de tarea',
          usuario: data.usuario || 'sistema'
        }
      });
    }

    res.json(tarea);
  } catch (error) {
    console.error('Error actualizando tarea:', error);
    res.status(500).json({ error: 'Error al actualizar la tarea' });
  }
};

// Eliminar tarea
const eliminarTarea = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.tarea.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Tarea eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando tarea:', error);
    res.status(500).json({ error: 'Error al eliminar la tarea' });
  }
};

// ==================== ACCIONES ESPECÍFICAS ====================

// Asignar técnico a tarea
const asignarTecnico = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_tecnico, usuario } = req.body;

    const tareaActual = await prisma.tarea.findUnique({
      where: { id: parseInt(id) }
    });

    const tarea = await prisma.tarea.update({
      where: { id: parseInt(id) },
      data: { id_tecnico: parseInt(id_tecnico) }
    });

    await prisma.historialTarea.create({
      data: {
        id_tarea: tarea.id,
        accion: 'asignado',
        estado_nuevo: tarea.estado,
        motivo: `Técnico asignado: ${id_tecnico}`,
        usuario: usuario || 'sistema'
      }
    });

    res.json(tarea);
  } catch (error) {
    console.error('Error asignando técnico:', error);
    res.status(500).json({ error: 'Error al asignar técnico' });
  }
};

// Iniciar tarea
const iniciarTarea = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario } = req.body;

    const tarea = await prisma.tarea.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'en_proceso',
        fecha_inicio: new Date()
      }
    });

    await prisma.historialTarea.create({
      data: {
        id_tarea: tarea.id,
        accion: 'iniciado',
        estado_anterior: 'pendiente',
        estado_nuevo: 'en_proceso',
        motivo: 'Tarea iniciada',
        usuario: usuario || 'sistema'
      }
    });

    res.json(tarea);
  } catch (error) {
    console.error('Error iniciando tarea:', error);
    res.status(500).json({ error: 'Error al iniciar la tarea' });
  }
};

// Finalizar tarea
const finalizarTarea = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones, evidencia_url, informe_adjunto, estado_informe, usuario } = req.body;

    const tareaActual = await prisma.tarea.findUnique({
      where: { id: parseInt(id) }
    });

    const tarea = await prisma.tarea.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'finalizado',
        fecha_fin: new Date(),
        observaciones,
        evidencia_url,
        informe_adjunto: informe_adjunto || false,
        estado_informe: estado_informe || 'pendiente'
      }
    });

    await prisma.historialTarea.create({
      data: {
        id_tarea: tarea.id,
        accion: 'finalizado',
        estado_anterior: tareaActual.estado,
        estado_nuevo: 'finalizado',
        motivo: observaciones || 'Tarea completada',
        usuario: usuario || 'sistema'
      }
    });

    res.json(tarea);
  } catch (error) {
    console.error('Error finalizando tarea:', error);
    res.status(500).json({ error: 'Error al finalizar la tarea' });
  }
};

// Reprogramar tarea
const reprogramarTarea = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_programada, hora_programada, motivo, usuario } = req.body;

    const tareaActual = await prisma.tarea.findUnique({
      where: { id: parseInt(id) }
    });

    const tarea = await prisma.tarea.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'reprogramado',
        fecha_programada: new Date(fecha_programada),
        hora_programada
      }
    });

    await prisma.historialTarea.create({
      data: {
        id_tarea: tarea.id,
        accion: 'reprogramado',
        estado_anterior: tareaActual.estado,
        estado_nuevo: 'reprogramado',
        motivo: motivo || 'Reprogramación de tarea',
        usuario: usuario || 'sistema'
      }
    });

    res.json(tarea);
  } catch (error) {
    console.error('Error reprogramando tarea:', error);
    res.status(500).json({ error: 'Error al reprogramar la tarea' });
  }
};

// No cumplir tarea
const noCumplirTarea = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, usuario } = req.body;

    const tareaActual = await prisma.tarea.findUnique({
      where: { id: parseInt(id) }
    });

    const tarea = await prisma.tarea.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'no_cumplido',
        fecha_fin: new Date()
      }
    });

    await prisma.historialTarea.create({
      data: {
        id_tarea: tarea.id,
        accion: 'no_cumplido',
        estado_anterior: tareaActual.estado,
        estado_nuevo: 'no_cumplido',
        motivo: motivo || 'Tarea no cumplida',
        usuario: usuario || 'sistema'
      }
    });

    res.json(tarea);
  } catch (error) {
    console.error('Error marcando tarea como no cumplida:', error);
    res.status(500).json({ error: 'Error al marcar tarea como no cumplida' });
  }
};

// Obtener historial de tarea
const obtenerHistorial = async (req, res) => {
  try {
    const { id } = req.params;
    const historial = await prisma.historialTarea.findMany({
      where: { id_tarea: parseInt(id) },
      orderBy: { fecha_cambio: 'desc' }
    });
    res.json(historial);
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

// ==================== FILTROS ====================

// Tareas por estado
const tareasPorEstado = async (req, res) => {
  try {
    const { estado } = req.params;
    const tareas = await prisma.tarea.findMany({
      where: { estado },
      include: { cliente: true, local: true, tecnico: true },
      orderBy: { fecha_programada: 'asc' }
    });
    res.json(tareas);
  } catch (error) {
    console.error('Error filtrando tareas:', error);
    res.status(500).json({ error: 'Error al filtrar tareas' });
  }
};

// Tareas por técnico
const tareasPorTecnico = async (req, res) => {
  try {
    const { id } = req.params;
    const tareas = await prisma.tarea.findMany({
      where: { id_tecnico: parseInt(id) },
      include: { cliente: true, local: true },
      orderBy: { fecha_programada: 'asc' }
    });
    res.json(tareas);
  } catch (error) {
    console.error('Error filtrando tareas:', error);
    res.status(500).json({ error: 'Error al filtrar tareas' });
  }
};

// Tareas por fecha
const tareasPorFecha = async (req, res) => {
  try {
    const { fecha } = req.params;
    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const tareas = await prisma.tarea.findMany({
      where: {
        fecha_programada: {
          gte: fechaInicio,
          lte: fechaFin
        }
      },
      include: { cliente: true, local: true, tecnico: true }
    });
    res.json(tareas);
  } catch (error) {
    console.error('Error filtrando tareas:', error);
    res.status(500).json({ error: 'Error al filtrar tareas' });
  }
};

// Tareas facturables
const tareasFacturables = async (req, res) => {
  try {
    const { estado_informe } = req.query;
    const where = { facturable: true };
    if (estado_informe) where.estado_informe = estado_informe;

    const tareas = await prisma.tarea.findMany({
      where,
      include: { cliente: true, local: true, tecnico: true },
      orderBy: { fecha_fin: 'desc' }
    });
    res.json(tareas);
  } catch (error) {
    console.error('Error filtrando tareas facturables:', error);
    res.status(500).json({ error: 'Error al filtrar tareas facturables' });
  }
};

module.exports = {
  crearTarea,
  listarTareas,
  obtenerTarea,
  actualizarTarea,
  eliminarTarea,
  asignarTecnico,
  iniciarTarea,
  finalizarTarea,
  reprogramarTarea,
  noCumplirTarea,
  obtenerHistorial,
  tareasPorEstado,
  tareasPorTecnico,
  tareasPorFecha,
  tareasFacturables
};