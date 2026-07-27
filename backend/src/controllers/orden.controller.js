/**
 * Controlador de Órdenes - MVP Coordinador Técnico v2.0
 * Entidad principal del sistema
 * 
 * refactorizado para usar:
 * - Repositories para acceso a datos
 * - State Machine para validación de estados
 * - Logger para logs estructurados
 */

const { PrismaClient } = require('@prisma/client');
const prisma = require('../db');
const { logger } = require('../utils/logger');
const { ordenStateMachine } = require('../services/estadoMachine.service');
const { asyncHandler } = require('../middleware/errorHandler.middleware');

// ==================== UTILIDADES ====================

// Generar número de orden automático
const generarNumeroOrden = async () => {
  const año = new Date().getFullYear();
  const ultimo = await prisma.orden.findFirst({
    orderBy: { id: 'desc' }
  });
  const numero = ultimo ? ultimo.id + 1 : 1;
  return `ORD-${año}-${numero.toString().padStart(4, '0')}`;
};

// ==================== CRUD BÁSICO ====================

// Tipos de trabajo que son automáticamente facturables
const TIPOS_FACTURABLES = ['visita_tecnica', 'implementacion', 'proyecto'];

// Crear nueva orden
const crearOrden = async (req, res, next) => {
  try {
    logger.info('crearOrden', 'Creando nueva orden', { body: req.body });
    
    const {
      id_cliente,
      id_local,
      tipo_trabajo,
      prioridad,
      descripcion,
      fecha_programada,
      cantidad_tecnicos,
      horas_estimadas,
      facturable
    } = req.body;

    const numero_orden = await generarNumeroOrden();
    
    // Auto-facturable según tipo de trabajo
    const esFacturable = TIPOS_FACTURABLES.includes(tipo_trabajo) || facturable === true;

    const orden = await prisma.orden.create({
      data: {
        numero_orden,
        id_cliente: parseInt(id_cliente),
        id_local: parseInt(id_local),
        tipo_trabajo: tipo_trabajo || 'visita_tecnica',
        prioridad: prioridad || 'media',
        descripcion,
        fecha_programada: fecha_programada ? new Date(fecha_programada + 'T12:00:00.000Z') : null,
        cantidad_tecnicos: cantidad_tecnicos || 1,
        horas_estimadas: horas_estimadas || 1,
        facturable: esFacturable
      }
    });

    // Registrar en historial
    await prisma.historialOrden.create({
      data: {
        id_orden: orden.id,
        accion: 'creado',
        estado_nuevo: 'pendiente',
        motivo: 'Orden creada',
        usuario: req.body.usuario || 'sistema'
      }
    });

    res.status(201).json(orden);
  } catch (error) {
    logger.error('crearOrden', 'Error al crear orden', { error: error.message });
    res.status(500).json({ error: 'Error al crear la orden' });
  }
};

// Listar todas las órdenes con filtros
const listarOrdenes = async (req, res) => {
  try {
    const { estado, prioridad, id_cliente, fecha_inicio, fecha_fin, facturable, estado_facturacion } = req.query;
    
    const where = {};
    if (estado) where.estado = estado;
    if (prioridad) where.prioridad = prioridad;
    if (id_cliente) where.id_cliente = parseInt(id_cliente);
    if (facturable !== undefined) where.facturable = facturable === 'true';
    if (estado_facturacion) where.estado_facturacion = estado_facturacion;
    if (fecha_inicio || fecha_fin) {
      where.fecha_programada = {};
      if (fecha_inicio) where.fecha_programada.gte = new Date(fecha_inicio);
      if (fecha_fin) where.fecha_programada.lte = new Date(fecha_fin);
    }

    const ordenes = await prisma.orden.findMany({
      where,
      include: {
        cliente: true,
        local: true,
        asignaciones: {
          include: { tecnico: true }
        }
      },
      orderBy: { fecha_programada: 'asc' }
    });

    res.json({ success: true, data: ordenes });
  } catch (error) {
    logger.error('listarOrdenes', 'Error al listar órdenes', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al listar órdenes' });
  }
};

// Obtener orden por ID
const obtenerOrden = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const orden = await prisma.orden.findUnique({
      where: { id: parseInt(id) },
      include: {
        cliente: true,
        local: true,
        historial: { orderBy: { fecha_cambio: 'desc' } },
        asignaciones: {
          include: { tecnico: true },
          orderBy: { fecha_asignacion: 'asc' }
        },
        registrosDiario: {
          include: { tecnico: true },
          orderBy: { fecha: 'desc' }
        },
        horasTecnico: {
          include: { tecnico: true },
          orderBy: { fecha: 'desc' }
        }
      }
    });

    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    res.json({ success: true, data: orden });
  } catch (error) {
    console.error('Error obteniendo orden:', error);
    res.status(500).json({ error: 'Error al obtener la orden' });
  }
};

// Actualizar orden
const actualizarOrden = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    logger.info('actualizarOrden', 'Actualizando orden', { id, data });

    // Obtener estado actual
    const ordenActual = await prisma.orden.findUnique({
      where: { id: parseInt(id) }
    });

    if (!ordenActual) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    // VALIDACIÓN: Si hay cambio de estado, verificar con State Machine
    if (data.estado && data.estado !== ordenActual.estado) {
      const validacion = ordenStateMachine.validarTransicion(ordenActual.estado, data.estado);
      if (!validacion.valido) {
        logger.warn('actualizarOrden', 'Transición de estado inválida', { 
          estadoActual: ordenActual.estado, 
          nuevoEstado: data.estado 
        });
        return res.status(400).json({ 
          success: false, 
          message: validacion.message 
        });
      }
      
      logger.info('actualizarOrden', 'Cambio de estado validado', {
        ordenId: id,
        de: ordenActual.estado,
        a: data.estado
      });
    }

    // Preparar datos para actualizar
    const updateData = { ...data };
    
    // Convertir campos numéricos si son strings
    if (data.id_cliente !== undefined) {
      updateData.id_cliente = typeof data.id_cliente === 'string' ? parseInt(data.id_cliente) : data.id_cliente;
    }
    if (data.id_local !== undefined) {
      updateData.id_local = typeof data.id_local === 'string' ? parseInt(data.id_local) : data.id_local;
    }
    if (data.cantidad_tecnicos !== undefined) {
      updateData.cantidad_tecnicos = typeof data.cantidad_tecnicos === 'string' ? parseInt(data.cantidad_tecnicos) : data.cantidad_tecnicos;
    }
    if (data.horas_estimadas !== undefined) {
      updateData.horas_estimadas = typeof data.horas_estimadas === 'string' ? parseInt(data.horas_estimadas) : data.horas_estimadas;
    }
    
    // Convertir fecha_programada a Date si es string
    if (data.fecha_programada !== undefined) {
      if (data.fecha_programada === '' || data.fecha_programada === null) {
        updateData.fecha_programada = null;
      } else if (typeof data.fecha_programada === 'string') {
        updateData.fecha_programada = new Date(data.fecha_programada + 'T12:00:00.000Z');
      }
    }

    const orden = await prisma.orden.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Registrar cambio si hubo cambio de estado
    if (data.estado && data.estado !== ordenActual.estado) {
      await prisma.historialOrden.create({
        data: {
          id_orden: orden.id,
          accion: 'actualizado',
          estado_anterior: ordenActual.estado,
          estado_nuevo: data.estado,
          motivo: data.motivo || 'Actualización de orden',
          usuario: data.usuario || 'sistema'
        }
      });
    }

    res.json({ success: true, data: orden });
  } catch (error) {
    logger.error('actualizarOrden', 'Error al actualizar orden', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al actualizar la orden' });
  }
};

// Eliminar orden
const eliminarOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const idOrden = parseInt(id);
    
    // Verificar si tiene asignaciones asociadas
    const asignaciones = await prisma.asignacion.findMany({ where: { id_orden: idOrden } });
    if (asignaciones.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar. La orden tiene asignaciones asociadas. Elimine las asignaciones primero.' });
    }
    
    // Verificar si tiene factura asociada
    const factura = await prisma.factura.findUnique({ where: { id_orden: idOrden } });
    if (factura) {
      return res.status(400).json({ error: 'No se puede eliminar. La orden tiene una factura asociada. Elimine la factura primero.' });
    }
    
    await prisma.orden.delete({ where: { id: idOrden } });
    res.json({ message: 'Orden eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando orden:', error);
    res.status(500).json({ error: 'Error al eliminar la orden: ' + error.message });
  }
};

// ==================== ACCIONES ESPECÍFICAS ====================

// Iniciar orden
const iniciarOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario } = req.body;

    const ordenActual = await prisma.orden.findUnique({
      where: { id: parseInt(id) }
    });

    if (!ordenActual) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // VALIDACIÓN: Verificar transición con State Machine
    const validacion = ordenStateMachine.validarTransicion(ordenActual.estado, 'en_proceso');
    if (!validacion.valido) {
      logger.warn('iniciarOrden', 'Transición de estado inválida', {
        estadoActual: ordenActual.estado,
        nuevoEstado: 'en_proceso'
      });
      return res.status(400).json({
        success: false,
        message: validacion.message
      });
    }

    const orden = await prisma.orden.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'en_proceso',
        fecha_inicio: new Date()
      }
    });

    await prisma.historialOrden.create({
      data: {
        id_orden: orden.id,
        accion: 'iniciado',
        estado_anterior: ordenActual.estado,
        estado_nuevo: 'en_proceso',
        motivo: 'Orden iniciada',
        usuario: usuario || 'sistema'
      }
    });

    res.json(orden);
  } catch (error) {
    console.error('Error iniciando orden:', error);
    res.status(500).json({ error: 'Error al iniciar la orden' });
  }
};

// Completar orden
const completarOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolucion, observaciones, evidencia_url, informe_adjunto, estado_informe, usuario } = req.body;

    const ordenActual = await prisma.orden.findUnique({
      where: { id: parseInt(id) }
    });

    if (!ordenActual) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // VALIDACIÓN: Verificar transición con State Machine
    const validacion = ordenStateMachine.validarTransicion(ordenActual.estado, 'completada');
    if (!validacion.valido) {
      logger.warn('completarOrden', 'Transición de estado inválida', {
        estadoActual: ordenActual.estado,
        nuevoEstado: 'completada'
      });
      return res.status(400).json({
        success: false,
        message: validacion.message
      });
    }

    // Auto-marcar como facturable si es correctivo o instalación
    const tipoAutoFacturable = ['correctivo', 'instalacion'].includes(ordenActual.tipo_trabajo);

    const orden = await prisma.orden.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'completada',
        fecha_fin: new Date(),
        fecha_resolucion: new Date(),
        resolucion,
        observaciones,
        evidencia_url,
        informe_adjunto: informe_adjunto || false,
        estado_informe: estado_informe || 'pendiente',
        facturable: tipoAutoFacturable || ordenActual.facturable
      }
    });

    await prisma.historialOrden.create({
      data: {
        id_orden: orden.id,
        accion: 'completada',
        estado_anterior: ordenActual.estado,
        estado_nuevo: 'completada',
        motivo: resolucion || 'Orden completada',
        usuario: usuario || 'sistema'
      }
    });

    res.json(orden);
  } catch (error) {
    console.error('Error completando orden:', error);
    res.status(500).json({ error: 'Error al completar la orden' });
  }
};

// Reprogramar orden
const reprogramarOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_programada, hora_programada, motivo, usuario } = req.body;

    const ordenActual = await prisma.orden.findUnique({
      where: { id: parseInt(id) }
    });

    if (!ordenActual) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // VALIDACIÓN: Verificar transición con State Machine
    const validacion = ordenStateMachine.validarTransicion(ordenActual.estado, 'reprogramada');
    if (!validacion.valido) {
      logger.warn('reprogramarOrden', 'Transición de estado inválida', {
        estadoActual: ordenActual.estado,
        nuevoEstado: 'reprogramada'
      });
      return res.status(400).json({
        success: false,
        message: validacion.message
      });
    }

    const orden = await prisma.orden.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'reprogramada',
        fecha_programada: new Date(fecha_programada),
        hora_programada
      }
    });

    await prisma.historialOrden.create({
      data: {
        id_orden: orden.id,
        accion: 'reprogramado',
        estado_anterior: ordenActual.estado,
        estado_nuevo: 'reprogramada',
        motivo: motivo || 'Reprogramación de orden',
        usuario: usuario || 'sistema'
      }
    });

    res.json(orden);
  } catch (error) {
    console.error('Error reprogramando orden:', error);
    res.status(500).json({ error: 'Error al reprogramar la orden' });
  }
};

// Cancelar orden
const cancelarOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, usuario } = req.body;

    const ordenActual = await prisma.orden.findUnique({
      where: { id: parseInt(id) }
    });

    if (!ordenActual) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // VALIDACIÓN: Verificar transición con State Machine
    const validacion = ordenStateMachine.validarTransicion(ordenActual.estado, 'no_cumplida');
    if (!validacion.valido) {
      logger.warn('cancelarOrden', 'Transición de estado inválida', {
        estadoActual: ordenActual.estado,
        nuevoEstado: 'no_cumplida'
      });
      return res.status(400).json({
        success: false,
        message: validacion.message
      });
    }

    const orden = await prisma.orden.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'no_cumplida',
        fecha_fin: new Date()
      }
    });

    await prisma.historialOrden.create({
      data: {
        id_orden: orden.id,
        accion: 'cancelado',
        estado_anterior: ordenActual.estado,
        estado_nuevo: 'no_cumplida',
        motivo: motivo || 'Orden cancelada',
        usuario: usuario || 'sistema'
      }
    });

    res.json(orden);
  } catch (error) {
    console.error('Error cancelando orden:', error);
    res.status(500).json({ error: 'Error al cancelar la orden' });
  }
};

// ==================== FACTURACIÓN ====================

// Enviar a facturación
const enviarAFacturacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario } = req.body;

    const orden = await prisma.orden.findUnique({
      where: { id: parseInt(id) }
    });

    // Validar que tenga informe aprobado
    if (!orden.informe_adjunto) {
      return res.status(400).json({ error: 'Debe adjuntar informe antes de enviar a facturación' });
    }
    if (orden.estado_informe !== 'aprobado') {
      return res.status(400).json({ error: 'El informe debe estar aprobado para facturar' });
    }

    const ordenActualizada = await prisma.orden.update({
      where: { id: parseInt(id) },
      data: {
        estado_facturacion: 'planificada',
        fecha_envio_facturacion: new Date()
      }
    });

    await prisma.historialOrden.create({
      data: {
        id_orden: orden.id,
        accion: 'enviado_facturacion',
        estado_nuevo: 'planificada',
        motivo: 'Orden enviada a facturación',
        usuario: usuario || 'sistema'
      }
    });

    res.json(ordenActualizada);
  } catch (error) {
    console.error('Error enviando a facturación:', error);
    res.status(500).json({ error: 'Error al enviar a facturación' });
  }
};

// Actualizar estado de facturación
const actualizarEstadoFacturacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_facturacion, numero_factura, usuario } = req.body;

    const orden = await prisma.orden.update({
      where: { id: parseInt(id) },
      data: {
        estado_facturacion,
        numero_factura
      }
    });

    await prisma.historialOrden.create({
      data: {
        id_orden: orden.id,
        accion: 'cambio_facturacion',
        estado_nuevo: estado_facturacion,
        motivo: `Estado facturación: ${estado_facturacion}`,
        usuario: usuario || 'sistema'
      }
    });

    res.json(orden);
  } catch (error) {
    console.error('Error actualizando facturación:', error);
    res.status(500).json({ error: 'Error al actualizar facturación' });
  }
};

// ==================== FILTROS ====================

// Órdenes por estado
const ordenesPorEstado = async (req, res) => {
  try {
    const { estado } = req.params;
    const ordenes = await prisma.orden.findMany({
      where: { estado },
      include: { cliente: true, local: true },
      orderBy: { fecha_programada: 'asc' }
    });
    res.json(ordenes);
  } catch (error) {
    console.error('Error filtrando ordenes:', error);
    res.status(500).json({ error: 'Error al filtrar ordenes' });
  }
};

// Órdenes atrasadas
const ordenesAtrasadas = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    const ordenes = await prisma.orden.findMany({
      where: {
        estado: { in: ['pendiente', 'en_proceso', 'reprogramado'] },
        fecha_programada: { lt: hoy }
      },
      include: { cliente: true, local: true },
      orderBy: { fecha_programada: 'asc' }
    });
    res.json({ success: true, data: ordenes });
  } catch (error) {
    logger.error('ordenesAtrasadas', 'Error obteniendo ordenes atrasadas', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al obtener ordenes atrasadas' });
  }
};

// Órdenes facturables pendientes (para crear facturas)
const ordenesFacturablesPendientes = async (req, res) => {
  try {
    const ordenes = await prisma.orden.findMany({
      where: {
        // Solo órdenes completadas
        estado: 'completada',
        // Excluir órdenes que ya tienen factura
        factura: null
      },
      include: { 
        cliente: true, 
        local: true,
        // Incluir asignaciones para calcular fechas
        asignaciones: {
          select: { fecha_asignacion: true }
        },
        // Incluir informes para descargar (todos los campos necesarios para Word)
        informes: {
          where: { estado: 'aprobado' },
          include: {
            tecnico: true,
            // Incluir la orden dentro del informe para el Word
            orden: {
              include: {
                cliente: {
                  include: {
                    representantes: true
                  }
                },
                local: true
              }
            }
          }
        }
      },
      orderBy: { fecha_programada: 'desc' }
    });
    
    // Filtrar en memoria para mostrar info de informe
    const ordenesConInfo = ordenes.map(orden => ({
      ...orden,
      descripcion: orden.descripcion,
      // Calcular fechas del proyecto desde asignaciones
      fecha_inicio_proyecto: orden.asignaciones?.length > 0 
        ? new Date(Math.min(...orden.asignaciones.map(a => new Date(a.fecha_asignacion).getTime()))).toISOString()
        : null,
      fecha_fin_proyecto: orden.asignaciones?.length > 0
        ? new Date(Math.max(...orden.asignaciones.map(a => new Date(a.fecha_asignacion).getTime()))).toISOString()
        : null,
      informe_aprobado: orden.estado_informe === 'aprobado',
      // Info del informe (incluir todos los campos para generar Word)
      tiene_informe: orden.informes?.length > 0,
      informe: orden.informes?.[0] || null
    }));
    
    res.json({ success: true, data: ordenesConInfo });
  } catch (error) {
    logger.error('ordenesFacturablesPendientes', 'Error obteniendo ordenes facturables', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al obtener ordenes facturables' });
  }
};

// Obtener historial de orden
const obtenerHistorial = async (req, res) => {
  try {
    const { id } = req.params;
    const historial = await prisma.historialOrden.findMany({
      where: { id_orden: parseInt(id) },
      orderBy: { fecha_cambio: 'desc' }
    });
    res.json(historial);
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

// ==================== IMPORTACIÓN DESDE EXCEL ====================

const multer = require('multer');
const path = require('path');
const ExcelJS = require('exceljs');
const { validarExcel, ejecutarImportacion } = require('../services/importOrdenes.service');

// Configuración de multer para uploads de Excel
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
  }
});

// Validar importación de Excel (FASE 1 - NO inserta datos)
const validarImportacion = async (req, res) => {
  try {
    logger.info('validarImportacion', 'Iniciando validación de Excel');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ningún archivo'
      });
    }

    const buffer = req.file.buffer;
    const resultado = await validarExcel(buffer);

    res.json(resultado);

  } catch (error) {
    logger.error('validarImportacion', 'Error en validación', { error: error.message });
    res.status(500).json({
      success: false,
      message: `Error al validar archivo: ${error.message}`
    });
  }
};

// Ejecutar importación de Excel (FASE 2 - Inserta datos)
const ejecutarImportacionOrden = async (req, res) => {
  try {
    logger.info('ejecutarImportacionOrden', 'Iniciando ejecución de importación');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ningún archivo'
      });
    }

    const buffer = req.file.buffer;
    const resultado = await ejecutarImportacion(buffer);

    res.json(resultado);

  } catch (error) {
    logger.error('ejecutarImportacionOrden', 'Error en ejecución', { error: error.message });
    res.status(500).json({
      success: false,
      message: `Error al importar datos: ${error.message}`
    });
  }
};

// ==================== DESCARGAR PLANTILLA ====================
const descargarPlantillaOrdenes = async (req, res) => {
  try {
    logger.info('descargarPlantillaOrdenes', 'Generando plantilla de órdenes');
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Coordinador Técnico';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Órdenes');

    // Definir columnas con ejemplos
    worksheet.columns = [
      { header: 'numero_orden', key: 'numero_orden', width: 18 },
      { header: 'id_cliente', key: 'id_cliente', width: 12 },
      { header: 'id_local', key: 'id_local', width: 12 },
      { header: 'tipo_trabajo', key: 'tipo_trabajo', width: 18 },
      { header: 'prioridad', key: 'prioridad', width: 12 },
      { header: 'descripcion', key: 'descripcion', width: 40 },
      { header: 'cantidad_tecnicos', key: 'cantidad_tecnicos', width: 15 },
      { header: 'horas_estimadas', key: 'horas_estimadas', width: 15 },
      { header: 'estado', key: 'estado', width: 15 },
    ];

    // Fila de ejemplo 1
    worksheet.addRow({
      numero_orden: 'ORD-2026-0001',
      id_cliente: 1,
      id_local: 1,
      tipo_trabajo: 'visita_tecnica',
      prioridad: 'media',
      descripcion: 'Mantenimiento preventivo de equipos de seguridad',
      cantidad_tecnicos: 1,
      horas_estimadas: 4,
      estado: 'pendiente'
    });

    // Fila de ejemplo 2
    worksheet.addRow({
      numero_orden: 'ORD-2026-0002',
      id_cliente: 1,
      id_local: 1,
      tipo_trabajo: 'implementacion',
      prioridad: 'alta',
      descripcion: 'Instalación de nuevo sistema CCTV',
      cantidad_tecnicos: 2,
      horas_estimadas: 8,
      estado: 'pendiente'
    });

    // Fila de ejemplo 3
    worksheet.addRow({
      numero_orden: 'ORD-2026-0003',
      id_cliente: 2,
      id_local: 2,
      tipo_trabajo: 'correctivo',
      prioridad: 'urgente',
      descripcion: 'Reparación de alarma defectuosa',
      cantidad_tecnicos: 1,
      horas_estimadas: 2,
      estado: 'pendiente'
    });

    // Estilar header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_ordenes.xlsx');
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);

  } catch (error) {
    logger.error('descargarPlantillaOrdenes', 'Error', { error: error.message });
    res.status(500).json({ error: 'Error al generar la plantilla' });
  }
};

// Exportar middleware de upload
const uploadExcel = upload.single('archivo');

module.exports = {
  crearOrden,
  listarOrdenes,
  obtenerOrden,
  actualizarOrden,
  eliminarOrden,
  iniciarOrden,
  completarOrden,
  reprogramarOrden,
  cancelarOrden,
  enviarAFacturacion,
  actualizarEstadoFacturacion,
  ordenesPorEstado,
  ordenesAtrasadas,
  ordenesFacturablesPendientes,
  obtenerHistorial,
  validarImportacion,
  ejecutarImportacionOrden,
  descargarPlantillaOrdenes,
  uploadExcel
};