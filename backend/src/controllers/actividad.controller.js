/**
 * Controlador de Actividades - Registro de Bitácora
 * Sistema de registro de actividades con fotos
 */

const { PrismaClient } = require('@prisma/client');
const prisma = require('../db');
const { v4: uuidv4 } = require('uuid');

// ==================== TIPOS DE EVENTOS ====================
const TIPOS_EVENTO = [
  'inicio_jornada',
  'ingreso_local',
  'salida_local',
  'inicio_comida',
  'fin_comida',
  'viaje_inicio',
  'viaje_fin',
  'fin_jornada',
  'otro'
];

const LABELS_EVENTO = {
  inicio_jornada: 'Inicio de jornada',
  salida_oficina: 'Salida de oficina',
  ingreso_terminal: 'Ingreso a terminal',
  salida_terminal: 'Salida de terminal',
  viaje_inicio: 'Inicio de viaje',
  viaje_fin: 'Fin de viaje',
  ingreso_local: 'Ingreso a local',
  salida_local: 'Salida de local',
  inicio_comida: 'Inicio de comida',
  fin_comida: 'Fin de comida',
  ingreso_cena: 'Inicio de cena',
  fin_cena: 'Fin de cena',
  fin_jornada: 'Fin de jornada',
  otro: 'Otro'
};

// ==================== CREAR EVENTO ====================
const crearEvento = async (req, res) => {
  try {
    const { id_tecnico, tipo_evento, descripcion, foto_url, jornada_continua, es_manual, fecha_hora, motivo_manual, justificacion } = req.body;

    // Validaciones
    if (!id_tecnico) {
      return res.status(400).json({ error: 'Debe especificar el técnico' });
    }
    if (!tipo_evento || !TIPOS_EVENTO.includes(tipo_evento)) {
      return res.status(400).json({ error: 'Tipo de evento inválido' });
    }

    // Usar hora actual del sistema o la proporcionada si es manual
    let fechaHora = new Date();
    let estado = 'pendiente';
    
    if (es_manual && fecha_hora) {
      fechaHora = new Date(fecha_hora);
      estado = 'pendiente_aprobacion'; // Requiere aprobación del coordinador
    }

    // Buscar o crear jornada para hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    let jornada = await prisma.jornada.findFirst({
      where: {
        id_tecnico: parseInt(id_tecnico),
        fecha: { gte: hoy, lt: manana }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Si es jornada continua, buscar la jornada padre
    if (jornada_continua && jornada) {
      // Usar la misma jornada
    } else if (!jornada && tipo_evento === 'inicio_jornada') {
      // Crear nueva jornada
      jornada = await prisma.jornada.create({
        data: {
          id_tecnico: parseInt(id_tecnico),
          fecha: hoy,
          hora_inicio: new Date(),
          estado: 'abierta'
        }
      });
    }

    // Crear el evento
    const evento = await prisma.registroEvento.create({
      data: {
        id_tecnico: parseInt(id_tecnico),
        tipo_evento,
        descripcion: descripcion || null,
        foto_url: foto_url || null,
        jornada_id: jornada?.id || null,
        fecha_hora: fechaHora,
        estado: estado,
        // Agregar campos de registro manual si aplica
        ...(es_manual && {
          descripcion: `${descripcion || ''}\n\n[REGISTRO MANUAL]\nMotivo: ${motivo_manual || 'N/A'}\nJustificación: ${justificacion || 'N/A'}`.trim()
        })
      },
      include: {
        tecnico: { select: { id: true, nombre: true } }
      }
    });

    // Si es fin de jornada, cerrar la jornada
    if (tipo_evento === 'fin_jornada' && jornada) {
      const eventos = await prisma.registroEvento.findMany({
        where: { jornada_id: jornada.id },
        orderBy: { fecha_hora: 'asc' }
      });

      const horaInicio = eventos[0]?.fecha_hora;
      const horaFin = eventos[eventos.length - 1]?.fecha_hora;

      // Calcular totales
      const totalHoras = horaFin && horaInicio 
        ? (new Date(horaFin) - new Date(horaInicio)) / (1000 * 60 * 60) 
        : 0;

      // Calcular pausas
      const eventosPausa = eventos.filter(e => 
        ['inicio_comida', 'fin_comida'].includes(e.tipo_evento)
      );
      let totalPausas = 0;
      for (let i = 0; i < eventosPausa.length; i += 2) {
        if (eventosPausa[i + 1]) {
          totalPausas += (new Date(eventosPausa[i + 1].fecha_hora) - new Date(eventosPausa[i].fecha_hora)) / (1000 * 60 * 60);
        }
      }

      // Horas trabajadas = total - pausas
      const horasTrabajo = Math.max(0, totalHoras - totalPausas);

      // Obtener jornada del técnico
      const tecnico = await prisma.tecnico.findUnique({
        where: { id: parseInt(id_tecnico) }
      });
      const jornadaNormal = tecnico?.jornada_horaria || 8;
      const horasExtras = Math.max(0, horasTrabajo - jornadaNormal);

      await prisma.jornada.update({
        where: { id: jornada.id },
        data: {
          hora_fin: horaFin,
          estado: 'cerrada',
          total_horas: totalHoras,
          horas_trabajo: horasTrabajo,
          horas_extras: horasExtras,
          total_pausas: totalPausas
        }
      });
    }

    res.status(201).json(evento);
  } catch (error) {
    console.error('Error creando evento:', error);
    res.status(500).json({ error: 'Error al crear evento' });
  }
};

// ==================== LISTAR EVENTOS ====================
const listarEventos = async (req, res) => {
  try {
    const { id_tecnico, fecha, jornada_id, estado } = req.query;
    const where = {};

    if (id_tecnico) where.id_tecnico = parseInt(id_tecnico);
    if (jornada_id) where.jornada_id = parseInt(jornada_id);
    if (estado) where.estado = estado;

    // Filtrar por fecha si se especifica
    if (fecha) {
      const fechaDate = new Date(fecha);
      const fechaSig = new Date(fechaDate);
      fechaSig.setDate(fechaSig.getDate() + 1);
      where.fecha_hora = { gte: fechaDate, lt: fechaSig };
    }

    const eventos = await prisma.registroEvento.findMany({
      where,
      include: {
        tecnico: { select: { id: true, nombre: true } }
      },
      orderBy: { fecha_hora: 'desc' }
    });

    // Agregar labels
    const eventosConLabel = eventos.map(e => ({
      ...e,
      label: LABELS_EVENTO[e.tipo_evento] || e.tipo_evento
    }));

    res.json(eventosConLabel);
  } catch (error) {
    console.error('Error listando eventos:', error);
    res.status(500).json({ error: 'Error al listar eventos' });
  }
};

// ==================== LISTAR JORNADAS ====================
const listarJornadas = async (req, res) => {
  try {
    const { id_tecnico, fecha_inicio, fecha_fin, estado } = req.query;
    const where = {};

    if (id_tecnico) where.id_tecnico = parseInt(id_tecnico);
    if (estado) where.estado = estado;

    if (fecha_inicio || fecha_fin) {
      where.fecha = {};
      if (fecha_inicio) where.fecha.gte = new Date(fecha_inicio);
      if (fecha_fin) where.fecha.lte = new Date(fecha_fin);
    }

    const jornadas = await prisma.jornada.findMany({
      where,
      include: {
        tecnico: { select: { id: true, nombre: true } },
        eventos: { orderBy: { fecha_hora: 'asc' } }
      },
      orderBy: { fecha: 'desc' }
    });

    res.json(jornadas);
  } catch (error) {
    console.error('Error listando jornadas:', error);
    res.status(500).json({ error: 'Error al listar jornadas' });
  }
};

// ==================== APROBAR / OBSERVAR EVENTO ====================
const aprobarEvento = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    const evento = await prisma.registroEvento.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'aprobado',
        observaciones_coordinador: observaciones || null
      },
      include: {
        tecnico: { select: { id: true, nombre: true } }
      }
    });

    res.json(evento);
  } catch (error) {
    console.error('Error aprobando evento:', error);
    res.status(500).json({ error: 'Error al aprobar evento' });
  }
};

const observarEvento = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    if (!observaciones) {
      return res.status(400).json({ error: 'Debe especificar las observaciones' });
    }

    const evento = await prisma.registroEvento.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'observacion',
        observaciones_coordinador: observaciones
      },
      include: {
        tecnico: { select: { id: true, nombre: true } }
      }
    });

    res.json(evento);
  } catch (error) {
    console.error('Error observando evento:', error);
    res.status(500).json({ error: 'Error al observar evento' });
  }
};

// ==================== APROBAR / OBSERVAR JORNADA ====================
const aprobarJornada = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    const jornada = await prisma.jornada.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'cerrada',
        observaciones: observaciones || null
      }
    });

    // También aprobar todos los eventos de la jornada
    await prisma.registroEvento.updateMany({
      where: { jornada_id: jornada.id },
      data: { estado: 'aprobado' }
    });

    res.json(jornada);
  } catch (error) {
    console.error('Error aprobando jornada:', error);
    res.status(500).json({ error: 'Error al aprobar jornada' });
  }
};

const observarJornada = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    if (!observaciones) {
      return res.status(400).json({ error: 'Debe especificar las observaciones' });
    }

    const jornada = await prisma.jornada.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'observacion',
        observaciones
      }
    });

    res.json(jornada);
  } catch (error) {
    console.error('Error observando jornada:', error);
    res.status(500).json({ error: 'Error al observar jornada' });
  }
};

// ==================== OBTENER EVENTOS PENDIENTES ====================
const obtenerPendientes = async (req, res) => {
  try {
    const jornadas = await prisma.jornada.findMany({
      where: {
        estado: { in: ['abierta', 'cerrada'] }
      },
      include: {
        tecnico: { select: { id: true, nombre: true } },
        eventos: {
          where: { estado: 'pendiente' },
          orderBy: { fecha_hora: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(jornadas);
  } catch (error) {
    console.error('Error obteniendo pendientes:', error);
    res.status(500).json({ error: 'Error al obtener pendientes' });
  }
};

// ==================== OBTENER TIPOS DE EVENTO ====================
const obtenerTiposEvento = async (req, res) => {
  try {
    const tipos = TIPOS_EVENTO.map(t => ({
      value: t,
      label: LABELS_EVENTO[t]
    }));
    res.json(tipos);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
};

module.exports = {
  crearEvento,
  listarEventos,
  listarJornadas,
  aprobarEvento,
  observarEvento,
  aprobarJornada,
  observarJornada,
  obtenerPendientes,
  obtenerTiposEvento,
  LABELS_EVENTO
};
