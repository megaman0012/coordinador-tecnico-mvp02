/**
 * Controlador de Ausencias - Días libres, permisos, vacaciones
 */

const { PrismaClient } = require('@prisma/client');
const prisma = require('../db');

// ==================== TIPOS DE AUSENCIA ====================
const TIPOS_AUSENCIA = [
  'dia_libre',
  'permiso_medico',
  'vacacion',
  'feriado',
  'compensatorio'
];

const LABELS_AUSENCIA = {
  dia_libre: 'Día libre',
  permiso_medico: 'Permiso médico',
  vacacion: 'Vacaciones',
  feriado: 'Feriado',
  compensatorio: 'Día compensatorio'
};

// ==================== CREAR AUSENCIA ====================
const crearAusencia = async (req, res) => {
  try {
    const { id_tecnico, tipo, fecha_inicio, fecha_fin, descripcion, foto_url } = req.body;

    // Validaciones
    if (!id_tecnico) {
      return res.status(400).json({ error: 'Debe especificar el técnico' });
    }
    if (!tipo || !TIPOS_AUSENCIA.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de ausencia inválido' });
    }
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'Debe especificar fecha de inicio y fin' });
    }

    // Validar que fecha fin sea >= fecha inicio
    if (new Date(fecha_fin) < new Date(fecha_inicio)) {
      return res.status(400).json({ error: 'La fecha fin debe ser mayor o igual a la fecha inicio' });
    }

    // Para permiso médico, requiere foto
    if (tipo === 'permiso_medico' && !foto_url) {
      return res.status(400).json({ error: 'Debe adjuntar foto del certificado médico' });
    }

    // Crear ausencia - convertir fechas a formato DateTime ISO-8601
    const ausencia = await prisma.ausencia.create({
      data: {
        id_tecnico: parseInt(id_tecnico),
        tipo,
        fecha_inicio: new Date(fecha_inicio + 'T00:00:00.000Z'), // Convertir a DateTime ISO
        fecha_fin: new Date(fecha_fin + 'T00:00:00.000Z'), // Convertir a DateTime ISO
        descripcion: descripcion || null,
        foto_url: foto_url || null,
        estado: 'pendiente' // requiere aprobación para permisos y vacaciones
      },
      include: {
        tecnico: { select: { id: true, nombre: true } }
      }
    });

    res.status(201).json(ausencia);
  } catch (error) {
    console.error('Error creando ausencia:', error);
    res.status(500).json({ error: 'Error al crear ausencia' });
  }
};

// ==================== LISTAR AUSENCIAS ====================
const listarAusencias = async (req, res) => {
  try {
    const { id_tecnico, tipo, estado, fecha_inicio, fecha_fin } = req.query;
    const where = {};

    if (id_tecnico) where.id_tecnico = parseInt(id_tecnico);
    if (tipo) where.tipo = tipo;
    if (estado) where.estado = estado;

    if (fecha_inicio || fecha_fin) {
      where.fecha_inicio = {};
      if (fecha_inicio) where.fecha_inicio.gte = fecha_inicio;
      if (fecha_fin) where.fecha_inicio.lte = fecha_fin;
    }

    const ausencias = await prisma.ausencia.findMany({
      where,
      include: {
        tecnico: { select: { id: true, nombre: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Agregar labels
    const ausenciasConLabel = ausencias.map(a => ({
      ...a,
      label: LABELS_AUSENCIA[a.tipo]
    }));

    res.json(ausenciasConLabel);
  } catch (error) {
    console.error('Error listando ausencias:', error);
    res.status(500).json({ error: 'Error al listar ausencias' });
  }
};

// ==================== APROBAR AUSENCIA ====================
const aprobarAusencia = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;
    const userRol = req.user?.rol;

    // Solo coordinator o admin pueden aprobar
    if (userRol !== 'coordinador' && userRol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para aprobar ausencias' });
    }

    const ausencia = await prisma.ausencia.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'aprobado',
        observaciones: observaciones || null
      },
      include: {
        tecnico: { select: { id: true, nombre: true } }
      }
    });

    res.json(ausencia);
  } catch (error) {
    console.error('Error aprobando ausencia:', error);
    res.status(500).json({ error: 'Error al aprobar ausencia' });
  }
};

// ==================== RECHAZAR AUSENCIA ====================
const rechazarAusencia = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;
    const userRol = req.user?.rol;

    // Solo coordinator o admin pueden rechazar
    if (userRol !== 'coordinador' && userRol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para rechazar ausencias' });
    }

    if (!observaciones) {
      return res.status(400).json({ error: 'Debe especificar el motivo del rechazo' });
    }

    const ausencia = await prisma.ausencia.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'rechazado',
        observaciones
      },
      include: {
        tecnico: { select: { id: true, nombre: true } }
      }
    });

    res.json(ausencia);
  } catch (error) {
    console.error('Error rechazando ausencia:', error);
    res.status(500).json({ error: 'Error al rechazar ausencia' });
  }
};

// ==================== OBTENER PENDIENTES ====================
const obtenerPendientes = async (req, res) => {
  try {
    const ausencias = await prisma.ausencia.findMany({
      where: { estado: 'pendiente' },
      include: {
        tecnico: { select: { id: true, nombre: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const conLabel = ausencias.map(a => ({
      ...a,
      label: LABELS_AUSENCIA[a.tipo]
    }));

    res.json(conLabel);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
};

// ==================== OBTENER TIPOS ====================
const obtenerTipos = async (req, res) => {
  try {
    const tipos = TIPOS_AUSENCIA.map(t => ({
      value: t,
      label: LABELS_AUSENCIA[t]
    }));
    res.json(tipos);
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
};

// ==================== ELIMINAR AUSENCIA ====================
const eliminarAusencia = async (req, res) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id);
    
    console.log('Eliminando ausencia ID:', id, 'Parsed:', parsedId);
    
    if (!id || isNaN(parsedId)) {
      return res.status(400).json({ error: 'ID de ausencia inválido' });
    }
    
    // Verificar que existe antes de eliminar
    const existencia = await prisma.ausencia.findUnique({ where: { id: parsedId } });
    if (!existencia) {
      console.log('Ausencia no encontrada:', parsedId);
      return res.status(404).json({ error: 'Ausencia no encontrada' });
    }
    
    await prisma.ausencia.delete({ where: { id: parsedId } });
    console.log('Ausencia eliminada:', parsedId);
    res.json({ message: 'Ausencia eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando ausencia:', error);
    res.status(500).json({ error: 'Error al eliminar la ausencia', details: error.message });
  }
};

module.exports = {
  crearAusencia,
  listarAusencias,
  aprobarAusencia,
  rechazarAusencia,
  obtenerPendientes,
  obtenerTipos,
  eliminarAusencia,
  LABELS_AUSENCIA
};
