/**
 * Controlador de Inventario - MVP Coordinador Técnico
 * Sistema centralizado de inventario técnico
 */

const prisma = require('../db');
const inventarioPlantillaService = require('../services/inventario-plantilla.service');
const XLSX = require('xlsx');

// Logger simple
const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
};

// ==================== GET ALL ====================
const getInventario = async (req, res) => {
  try {
    const { 
      cliente, 
      ciudad, 
      tipo_sistema, 
      estado_operativo, 
      provincia,
      id_externo 
    } = req.query;

    const where = {};
    
    if (cliente) where.cliente = cliente;
    if (ciudad) where.ciudad = ciudad;
    if (tipo_sistema) where.tipo_sistema = tipo_sistema;
    if (estado_operativo) where.estado_operativo = estado_operativo;
    if (provincia) where.provincia = provincia;
    if (id_externo) where.id_externo = id_externo;

    const inventario = await prisma.inventario.findMany({
      where,
      orderBy: { nombre_local: 'asc' }
    });

    res.json({ success: true, data: inventario });
  } catch (error) {
    console.error('Error getInventario:', error);
    res.status(500).json({ error: 'Error al obtener inventario' });
  }
};

// ==================== GET BY ID EXTERNO ====================
const getInventarioByLocal = async (req, res) => {
  try {
    const { id_externo } = req.params;

    const inventario = await prisma.inventario.findMany({
      where: { id_externo }
    });

    if (inventario.length === 0) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }

    res.json({ success: true, data: inventario });
  } catch (error) {
    console.error('Error getInventarioByLocal:', error);
    res.status(500).json({ error: 'Error al obtener inventario del local' });
  }
};

// ==================== GET ONE ====================
const getInventarioById = async (req, res) => {
  try {
    const { id } = req.params;

    const inventario = await prisma.inventario.findUnique({
      where: { id: parseInt(id) }
    });

    if (!inventario) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    res.json({ success: true, data: inventario });
  } catch (error) {
    console.error('Error getInventarioById:', error);
    res.status(500).json({ error: 'Error al obtener registro' });
  }
};

// ==================== CREATE ====================
const createInventario = async (req, res) => {
  try {
    const data = req.body;

    // Validar campos requeridos
    if (!data.id_externo || !data.nombre_local) {
      return res.status(400).json({ error: 'id_externo y nombre_local son requeridos' });
    }

    // Validar tipo_sistema requerido
    if (!data.tipo_sistema) {
      return res.status(400).json({ error: 'tipo_sistema es requerido' });
    }

    // Validar categoria requerido
    if (!data.categoria) {
      return res.status(400).json({ error: 'categoria es requerida' });
    }

    const inventario = await prisma.inventario.create({
      data: {
        id_externo: data.id_externo || "",
        tipo_local: data.tipo_local || "",
        nombre_local: data.nombre_local || "",
        cliente: data.cliente || "LOTERIA NACIONAL",
        provincia: data.provincia,
        ciudad: data.ciudad,
        tipo_monitoreo: data.tipo_monitoreo,
        estado_operativo: data.estado_operativo,
        fecha_implementacion: data.fecha_implementacion ? new Date(data.fecha_implementacion) : null,
        fecha_cierre: data.fecha_cierre ? new Date(data.fecha_cierre) : null,
        observacion: data.observacion,
        direccion: data.direccion,
        gps: data.gps,
        horario_apertura: data.horario_apertura,
        horario_cierre: data.horario_cierre,
        ip_1: data.ip_1,
        ip_2: data.ip_2,
        ip_3: data.ip_3,
        contacto: data.contacto,
        correo: data.correo,
        tipo_sistema: data.tipo_sistema,
        categoria: data.categoria,
        cantidad: data.cantidad || 0,
        marca: data.marca,
        detalle: data.detalle || {}
      }
    });

    res.status(201).json({ success: true, data: inventario });
  } catch (error) {
    console.error('Error createInventario:', error);
    
    // Manejar error de duplicado (P2002 = violation de unique constraint)
    if (error.code === 'P2002') {
      return res.status(422).json({ 
        error: 'Ya existe un registro con estos datos',
        detalle: `El componente con ID externo "${data.id_externo}", sistema "${data.tipo_sistema}" y categoría "${data.categoria}" ya existe. Use la opción Editar para actualizarlo.`
      });
    }
    
    res.status(500).json({ error: 'Error al crear registro: ' + error.message });
  }
};

// ==================== UPDATE ====================
const updateInventario = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const inventario = await prisma.inventario.update({
      where: { id: parseInt(id) },
      data: {
        ...(data.id_externo && { id_externo: data.id_externo }),
        ...(data.tipo_local && { tipo_local: data.tipo_local }),
        ...(data.nombre_local && { nombre_local: data.nombre_local }),
        ...(data.cliente && { cliente: data.cliente }),
        ...(data.provincia !== undefined && { provincia: data.provincia }),
        ...(data.ciudad !== undefined && { ciudad: data.ciudad }),
        ...(data.tipo_monitoreo !== undefined && { tipo_monitoreo: data.tipo_monitoreo }),
        ...(data.estado_operativo !== undefined && { estado_operativo: data.estado_operativo }),
        ...(data.fecha_implementacion && { fecha_implementacion: new Date(data.fecha_implementacion) }),
        ...(data.fecha_cierre && { fecha_cierre: new Date(data.fecha_cierre) }),
        ...(data.observacion !== undefined && { observacion: data.observacion }),
        ...(data.direccion !== undefined && { direccion: data.direccion }),
        ...(data.gps !== undefined && { gps: data.gps }),
        ...(data.horario_apertura !== undefined && { horario_apertura: data.horario_apertura }),
        ...(data.horario_cierre !== undefined && { horario_cierre: data.horario_cierre }),
        ...(data.ip_1 !== undefined && { ip_1: data.ip_1 }),
        ...(data.ip_2 !== undefined && { ip_2: data.ip_2 }),
        ...(data.ip_3 !== undefined && { ip_3: data.ip_3 }),
        ...(data.contacto !== undefined && { contacto: data.contacto }),
        ...(data.correo !== undefined && { correo: data.correo }),
        ...(data.tipo_sistema !== undefined && { tipo_sistema: data.tipo_sistema }),
        ...(data.categoria !== undefined && { categoria: data.categoria }),
        ...(data.cantidad !== undefined && { cantidad: data.cantidad }),
        ...(data.marca !== undefined && { marca: data.marca }),
        ...(data.detalle !== undefined && { detalle: data.detalle })
      }
    });

    res.json({ success: true, data: inventario });
  } catch (error) {
    console.error('Error updateInventario:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    
    res.status(500).json({ error: 'Error al actualizar registro' });
  }
};

// ==================== DELETE ====================
const deleteInventario = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.inventario.delete({
      where: { id: parseInt(id) }
    });

    res.json({ success: true, message: 'Registro eliminado correctamente' });
  } catch (error) {
    console.error('Error deleteInventario:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    
    res.status(500).json({ error: 'Error al eliminar registro' });
  }
};

// ==================== RESUMEN AGRUPADO POR LOCAL ====================
const getResumen = async (req, res) => {
  try {
    // Obtener todos los registros
    const inventario = await prisma.inventario.findMany({
      orderBy: { nombre_local: 'asc' }
    });

    // Agrupar por local (id_externo + nombre_local)
    const localesMap = new Map();

    inventario.forEach(item => {
      const key = item.id_externo || item.nombre_local;
      
      if (!localesMap.has(key)) {
        localesMap.set(key, {
          id_externo: item.id_externo,
          nombre: item.nombre_local,
          cliente: item.cliente,
          provincia: item.provincia,
          ciudad: item.ciudad,
          tipo_monitoreo: item.tipo_monitoreo,
          estado_operativo: item.estado_operativo,
          cctv: false,
          alarma: false,
          acceso: false,
          humo: false,
          componentes: 0
        });
      }

      const local = localesMap.get(key);

      // Marcar sistemas presentes
      if (item.tipo_sistema === 'CCTV') local.cctv = true;
      if (item.tipo_sistema === 'ALARMA') local.alarma = true;
      if (item.tipo_sistema === 'ACCESO') local.acceso = true;
      if (item.tipo_sistema === 'HUMO') local.humo = true;
      
      local.componentes++;
    });

    const resumen = Array.from(localesMap.values());

    res.json({ success: true, data: resumen });
  } catch (error) {
    console.error('Error getResumen:', error);
    res.status(500).json({ error: 'Error al generar resumen' });
  }
};

const inventarioImportService = require('../services/inventario-import.service');

// ==================== IMPORTAR EXCEL ====================
const importarInventario = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
    }

    // Validar tipo de archivo
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ];

    if (!allowedMimes.includes(req.file.mimetype) && !req.file.originalname.match(/\.xlsx?$/)) {
      return res.status(400).json({ error: 'El archivo debe ser un Excel (.xlsx o .xls)' });
    }

    log.info('Iniciando importación de inventario desde plantilla...');
    const resultado = await inventarioPlantillaService.importarDesdePlantilla(req.file.buffer);

    res.json({
      success: resultado.success,
      message: resultado.success ? 'Importación completada' : 'Importación con errores',
      data: {
        insertados: resultado.insertados,
        duplicados: resultado.duplicados,
        errores: resultado.errores,
        logs: resultado.logs,
      }
    });
  } catch (error) {
    log.error('Error en importarInventario:', error);
    res.status(500).json({ error: 'Error al procesar el archivo' });
  }
};

// ==================== DESCARGAR PLANTILLA ====================
const descargarPlantilla = async (req, res) => {
  try {
    console.log('[PLANTILLA] Generando workbook...');
    const workbook = inventarioPlantillaService.generarPlantilla();
    
    console.log('[PLANTILLA] Generando buffer...');
    const buffer = await workbook.xlsx.writeBuffer();
    console.log('[PLANTILLA] Buffer length:', buffer.length);
    
    // Headers para descarga
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_inventario.xlsx');
    res.setHeader('Content-Length', buffer.length);
    
    // Usar end para binary data
    res.end(buffer);
  } catch (error) {
    console.error('[PLANTILLA] Error completo:', error);
    log.error('Error al generar plantilla:', error.message || error);
    res.status(500).json({ error: 'Error al generar la plantilla: ' + (error.message || 'unknown') });
  }
};

module.exports = {
  getInventario,
  getInventarioById,
  getInventarioByLocal,
  createInventario,
  updateInventario,
  deleteInventario,
  getResumen,
  importarInventario,
  descargarPlantilla
};