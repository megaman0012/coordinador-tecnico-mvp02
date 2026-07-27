/**
 * Controlador de Registro Diario - MVP Coordinador Técnico v2.0
 * Seguimiento por día de cada técnico
 */

const { PrismaClient } = require('@prisma/client');
const prisma = require('../db');

// ==================== UTILIDADES ====================

// Calcular si es fin de semana
const esFinSemana = (fecha) => {
  const dia = new Date(fecha).getDay();
  return dia === 0 || dia === 6;
};

// Calcular horas entre dos tiempos (formato HH:MM)
const calcularHoras = (horaInicio, horaFin) => {
  if (!horaInicio || !horaFin) return 0;
  const inicio = new Date(`2000-01-01 ${horaInicio}`);
  const fin = new Date(`2000-01-01 ${horaFin}`);
  return (fin - inicio) / (1000 * 60 * 60);
};

// ==================== CRUD BÁSICO ====================

// Crear registro diario
const crearRegistroDiario = async (req, res) => {
  try {
    const {
      id_asignacion,
      id_orden,
      id_tecnico,
      fecha,
      hora_llegada,
      hora_salida,
      hora_inicio_trabajo,
      hora_fin_trabajo,
      observaciones,
      evidencia_url
    } = req.body;

    const tecnico = await prisma.tecnico.findUnique({
      where: { id: parseInt(id_tecnico) }
    });

    const jornada = tecnico?.jornada_horaria || 8;
    const fechaDate = new Date(fecha);
    const esFS = esFinSemana(fechaDate);

    // Calcular horas trabajadas
    let horasNormales = 0;
    let horasExtras = 0;
    
    if (hora_inicio_trabajo && hora_fin_trabajo) {
      const horasTrabajo = calcularHoras(hora_inicio_trabajo, hora_fin_trabajo);
      const totalHoras = horasTrabajo;

      if (esFS) {
        // Fin de semana: todo es extra
        horasNormales = 0;
        horasExtras = totalHoras;
      } else {
        // Día laborable: calcular normales y extras
        horasNormales = Math.min(totalHoras, jornada);
        horasExtras = Math.max(0, totalHoras - jornada);
      }
    }

    const registro = await prisma.registroDiario.create({
      data: {
        id_asignacion: id_asignacion ? parseInt(id_asignacion) : null,
        id_orden: parseInt(id_orden),
        id_tecnico: parseInt(id_tecnico),
        fecha: new Date(fecha),
        hora_llegada,
        hora_salida,
        hora_inicio_trabajo,
        hora_fin_trabajo,
        horas_normales: horasNormales,
        horas_extras: horasExtras,
        es_fin_semana: esFS,
        observaciones,
        evidencia_url,
        estado_dia: 'completado'
      }
    });

    // Generar horas de técnico automáticamente
    await generarHorasTecnico(registro);

    res.status(201).json(registro);
  } catch (error) {
    console.error('Error creando registro diario:', error);
    res.status(500).json({ error: 'Error al crear el registro diario' });
  }
};

// Generar horas de técnico desde registro diario
const generarHorasTecnico = async (registro) => {
  try {
    // Hora normal
    if (registro.horas_normales > 0) {
      await prisma.horaTecnico.create({
        data: {
          id_tecnico: registro.id_tecnico,
          id_orden: registro.id_orden,
          fecha: registro.fecha,
          hora_inicio: registro.hora_inicio_trabajo || registro.hora_llegada || '00:00',
          hora_fin: registro.hora_fin_trabajo || registro.hora_salida || '00:00',
          horas_trabajadas: registro.horas_normales,
          tipo: 'normal',
          es_fin_semana: false
        }
      });
    }

    // Hora extra
    if (registro.horas_extras > 0) {
      await prisma.horaTecnico.create({
        data: {
          id_tecnico: registro.id_tecnico,
          id_orden: registro.id_orden,
          fecha: registro.fecha,
          hora_inicio: registro.hora_inicio_trabajo || registro.hora_llegada || '00:00',
          hora_fin: registro.hora_fin_trabajo || registro.hora_salida || '00:00',
          horas_trabajadas: registro.horas_extras,
          tipo: 'extra',
          es_fin_semana: registro.es_fin_semana
        }
      });
    }
  } catch (error) {
    console.error('Error generando horas de técnico:', error);
  }
};

// Listar registros diarios
const listarRegistrosDiarios = async (req, res) => {
  try {
    const { id_tecnico, id_orden, fecha_inicio, fecha_fin, estado_dia } = req.query;
    
    const where = {};
    if (id_tecnico) where.id_tecnico = parseInt(id_tecnico);
    if (id_orden) where.id_orden = parseInt(id_orden);
    if (estado_dia) where.estado_dia = estado_dia;
    if (fecha_inicio || fecha_fin) {
      where.fecha = {};
      if (fecha_inicio) where.fecha.gte = new Date(fecha_inicio);
      if (fecha_fin) where.fecha.lte = new Date(fecha_fin);
    }

    const registros = await prisma.registroDiario.findMany({
      where,
      include: {
        orden: { include: { cliente: true, local: true } },
        tecnico: true,
        asignacion: true
      },
      orderBy: { fecha: 'desc' }
    });

    res.json(registros);
  } catch (error) {
    console.error('Error listando registros diarios:', error);
    res.status(500).json({ error: 'Error al listar registros diarios' });
  }
};

// Obtener registro diario por ID
const obtenerRegistroDiario = async (req, res) => {
  try {
    const { id } = req.params;
    const registro = await prisma.registroDiario.findUnique({
      where: { id: parseInt(id) },
      include: {
        orden: { include: { cliente: true, local: true } },
        tecnico: true,
        asignacion: true
      }
    });

    if (!registro) {
      return res.status(404).json({ error: 'Registro diario no encontrado' });
    }

    res.json(registro);
  } catch (error) {
    console.error('Error obteniendo registro diario:', error);
    res.status(500).json({ error: 'Error al obtener el registro diario' });
  }
};

// Actualizar registro diario
const actualizarRegistroDiario = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Si hay cambios en horas, recalcular
    if (data.hora_inicio_trabajo || data.hora_fin_trabajo) {
      const actual = await prisma.registroDiario.findUnique({
        where: { id: parseInt(id) },
        include: { tecnico: true }
      });

      const jornada = actual.tecnico?.jornada_horaria || 8;
      const horaInicio = data.hora_inicio_trabajo || actual.hora_inicio_trabajo;
      const horaFin = data.hora_fin_trabajo || actual.hora_fin_trabajo;

      if (horaInicio && horaFin) {
        const horasTrabajo = calcularHoras(horaInicio, horaFin);
        const totalHoras = horasTrabajo;

        if (actual.es_fin_semana) {
          data.horas_normales = 0;
          data.horas_extras = totalHoras;
        } else {
          data.horas_normales = Math.min(totalHoras, jornada);
          data.horas_extras = Math.max(0, totalHoras - jornada);
        }
      }
    }

    const registro = await prisma.registroDiario.update({
      where: { id: parseInt(id) },
      data: {
        ...data,
        id_orden: data.id_orden ? parseInt(data.id_orden) : undefined,
        id_tecnico: data.id_tecnico ? parseInt(data.id_tecnico) : undefined,
        fecha: data.fecha ? new Date(data.fecha) : undefined
      }
    });

    res.json(registro);
  } catch (error) {
    console.error('Error actualizando registro diario:', error);
    res.status(500).json({ error: 'Error al actualizar el registro diario' });
  }
};

// Eliminar registro diario
const eliminarRegistroDiario = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Eliminar horas de técnico relacionadas
    await prisma.horaTecnico.deleteMany({
      where: {
        id_orden: (await prisma.registroDiario.findUnique({ where: { id: parseInt(id) } }))?.id_orden,
        fecha: (await prisma.registroDiario.findUnique({ where: { id: parseInt(id) } }))?.fecha
      }
    });

    await prisma.registroDiario.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Registro diario eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando registro diario:', error);
    res.status(500).json({ error: 'Error al eliminar el registro diario' });
  }
};

// ==================== CONSULTAS ESPECIALES ====================

// Registros del día
const registrosDelDia = async (req, res) => {
  try {
    const { fecha } = req.params;
    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const registros = await prisma.registroDiario.findMany({
      where: {
        fecha: { gte: fechaInicio, lte: fechaFin }
      },
      include: {
        orden: { include: { cliente: true, local: true } },
        tecnico: true
      },
      orderBy: { hora_llegada: 'asc' }
    });

    res.json(registros);
  } catch (error) {
    console.error('Error obteniendo registros del día:', error);
    res.status(500).json({ error: 'Error al obtener registros del día' });
  }
};

// Registros por técnico
const registrosPorTecnico = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_inicio, fecha_fin } = req.query;

    const where = { id_tecnico: parseInt(id) };
    if (fecha_inicio || fecha_fin) {
      where.fecha = {};
      if (fecha_inicio) where.fecha.gte = new Date(fecha_inicio);
      if (fecha_fin) where.fecha.lte = new Date(fecha_fin);
    }

    const registros = await prisma.registroDiario.findMany({
      where,
      include: {
        orden: { include: { cliente: true, local: true } }
      },
      orderBy: { fecha: 'desc' }
    });

    res.json(registros);
  } catch (error) {
    console.error('Error obteniendo registros por técnico:', error);
    res.status(500).json({ error: 'Error al obtener registros por técnico' });
  }
};

// Resumen de horas por técnico
const resumenHorasTecnico = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_inicio, fecha_fin } = req.query;

    const where = { id_tecnico: parseInt(id) };
    if (fecha_inicio || fecha_fin) {
      where.fecha = {};
      if (fecha_inicio) where.fecha.gte = new Date(fecha_inicio);
      if (fecha_fin) where.fecha.lte = new Date(fecha_fin);
    }

    const registros = await prisma.registroDiario.findMany({ where });

    const resumen = {
      total_horas: 0,
      horas_normales: 0,
      horas_extras: 0,
      dias_trabajados: registros.length,
      fines_semana: registros.filter(r => r.es_fin_semana).length
    };

    registros.forEach(r => {
      resumen.total_horas += r.horas_normales + r.horas_extras;
      resumen.horas_normales += r.horas_normales;
      resumen.horas_extras += r.horas_extras;
    });

    res.json(resumen);
  } catch (error) {
    console.error('Error calculando resumen de horas:', error);
    res.status(500).json({ error: 'Error al calcular resumen de horas' });
  }
};

// ==================== DETECCIÓN DE NO CUMPLIDOS ====================

// Detectar asignaciones no cumplidas
const detectarNoCumplidos = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    // Buscar asignaciones de ayer que no tienen registro diario
    const asignaciones = await prisma.asignacion.findMany({
      where: {
        fecha_asignacion: {
          gte: ayer,
          lt: hoy
        },
        estado: 'pendiente'
      },
      include: {
        orden: true,
        tecnico: true
      }
    });

    const noCumplidos = [];
    for (const asignacion of asignaciones) {
      const tieneRegistro = await prisma.registroDiario.findFirst({
        where: {
          id_asignacion: asignacion.id,
          estado_dia: 'completado'
        }
      });

      if (!tieneRegistro) {
        noCumplidos.push(asignacion);
        
        // Marcar como no cumplido
        await prisma.asignacion.update({
          where: { id: asignacion.id },
          data: { estado: 'no_cumplido' }
        });
      }
    }

    res.json({ message: `${noCumplidos.length} asignaciones marcadas como no cumplidas`, noCumplidos });
  } catch (error) {
    console.error('Error detectando no cumplidos:', error);
    res.status(500).json({ error: 'Error al detectar no cumplidos' });
  }
};

module.exports = {
  crearRegistroDiario,
  listarRegistrosDiarios,
  obtenerRegistroDiario,
  actualizarRegistroDiario,
  eliminarRegistroDiario,
  registrosDelDia,
  registrosPorTecnico,
  resumenHorasTecnico,
  detectarNoCumplidos
};