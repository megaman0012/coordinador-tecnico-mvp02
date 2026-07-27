/**
 * Controlador de Facturas - MVP Coordinador Técnico v3.1
 * Control de facturación con workflow de validación cliente
 * 
 * Workflow actualizado:
 * - no_iniciada → validacion_cliente → aprobada_cliente → finalizada → pagada
 * 
 * Lógica de creación:
 * - Valida que orden.informe_aprobado === true
 * - Calcula fechas proyecto desde asignaciones
 * - Si tiene_oc = true → estado = 'finalizada'
 * - Si tiene_oc = false → estado = 'validacion_cliente'
 */

const { PrismaClient } = require('@prisma/client');
const prisma = require('../db');
const { logger } = require('../utils/logger');
const { facturaStateMachine } = require('../services/estadoMachine.service');

// ==================== UTILIDADES ====================

// Generar número de factura automático
const generarNumeroFactura = async () => {
  const año = new Date().getFullYear();
  const ultimo = await prisma.factura.findFirst({
    orderBy: { id: 'desc' }
  });
  const numero = ultimo ? ultimo.id + 1 : 1;
  return `FAC-${año}-${numero.toString().padStart(5, '0')}`;
};

// Registrar cambio en historial de factura
const registrarHistorial = async (id_factura, estado_anterior, estado_nuevo, observaciones = null, usuario = null) => {
  try {
    await prisma.historialFactura.create({
      data: {
        id_factura,
        estado_anterior,
        estado_nuevo,
        observaciones,
        usuario
      }
    });
  } catch (error) {
    logger.error('registrarHistorial', 'Error al registrar historial', { error: error.message });
  }
};

// Calcular fechas del proyecto desde asignaciones
const calcularFechasProyecto = async (id_orden) => {
  const asignaciones = await prisma.asignacion.findMany({
    where: { id_orden },
    select: { fecha_asignacion: true }
  });

  if (asignaciones.length === 0) {
    return { fecha_inicio: null, fecha_fin: null };
  }

  const fechas = asignaciones.map(a => new Date(a.fecha_asignacion));
  const fecha_inicio = new Date(Math.min(...fechas));
  const fecha_fin = new Date(Math.max(...fechas));

  return { fecha_inicio, fecha_fin };
};

// ==================== CRUD BÁSICO ====================

// Crear factura (con validación de informe aprobado)
const crearFactura = async (req, res) => {
  try {
    logger.info('crearFactura', 'Creando factura', { body: req.body });
    
    const { 
      id_orden, 
      monto, 
      observaciones,
      numero_factura,
      orden_compra_cliente,
      tiene_oc,
      archivo_cotizacion
    } = req.body;

    // 1. Verificar que la orden existe
    const orden = await prisma.orden.findUnique({
      where: { id: parseInt(id_orden) }
    });

    if (!orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    // 2. Validar que la orden esté completada
    if (orden.estado !== 'completada') {
      return res.status(400).json({ success: false, message: 'La orden debe estar completada para facturar' });
    }

    // 3. VALIDACIÓN CLAVE: Verificar que el informe está aprobado
    // El campo en la orden es: estado_informe (pendiente, enviado, aprobado, rechazado)
    if (orden.estado_informe !== 'aprobado') {
      return res.status(400).json({ 
        success: false, 
        message: `No se puede crear factura. El informe técnico debe estar APROBADO. Estado actual: ${orden.estado_informe}` 
      });
    }

    // 4. Verificar que no existe factura para esta orden
    const facturaExistente = await prisma.factura.findUnique({
      where: { id_orden: parseInt(id_orden) }
    });

    if (facturaExistente) {
      return res.status(400).json({ success: false, message: 'Ya existe una factura para esta orden' });
    }

    // 5. Calcular fechas del proyecto desde asignaciones
    const { fecha_inicio, fecha_fin } = await calcularFechasProyecto(parseInt(id_orden));

    // 6. Determinar estado inicial según tenga_oc
    // Si tiene_oc = true → va directamente a 'finalizada'
    // Si tiene_oc = false → va a 'validacion_cliente'
    let estadoInicial = 'validacion_cliente';
    if (tiene_oc === true) {
      estadoInicial = 'finalizada';
    }

    const numeroFacturaGenerado = numero_factura || await generarNumeroFactura();

    const factura = await prisma.factura.create({
      data: {
        id_orden: parseInt(id_orden),
        numero_factura: numeroFacturaGenerado,
        orden_compra_cliente: orden_compra_cliente || null,
        tiene_oc: tiene_oc || false,
        archivo_cotizacion: archivo_cotizacion || null,
        fecha_inicio_proyecto: fecha_inicio,
        fecha_fin_proyecto: fecha_fin,
        reporte_aprobado: orden.estado_informe === 'aprobado', // Sincroniza con la orden
        monto: monto || 0,
        observaciones,
        estado: estadoInicial
      }
    });

    // 7. Actualizar estado de facturación en la orden
    await prisma.orden.update({
      where: { id: parseInt(id_orden) },
      data: {
        estado_facturacion: estadoInicial,
        facturable: true,
        numero_factura: numeroFacturaGenerado
      }
    });

    logger.info('crearFactura', 'Factura creada', { 
      facturaId: factura.id, 
      numero_factura: factura.numero_factura,
      estado: factura.estado,
      tiene_oc: factura.tiene_oc
    });
    
    // Registrar en historial
    await registrarHistorial(factura.id, null, estadoInicial, `Factura creada para orden #${id_orden}`);
    
    res.status(201).json({ success: true, data: factura });
  } catch (error) {
    logger.error('crearFactura', 'Error al crear factura', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al crear la factura' });
  }
};

// Listar facturas con filtros
const listarFacturas = async (req, res) => {
  try {
    const { estado, fecha_inicio, fecha_fin } = req.query;
    
    const where = {};
    if (estado) where.estado = estado;
    if (fecha_inicio || fecha_fin) {
      where.fecha_emision = {};
      if (fecha_inicio) where.fecha_emision.gte = new Date(fecha_inicio);
      if (fecha_fin) where.fecha_emision.lte = new Date(fecha_fin);
    }

    const facturas = await prisma.factura.findMany({
      where,
      include: {
        orden: {
          include: { cliente: true, local: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: facturas });
  } catch (error) {
    logger.error('listarFacturas', 'Error al listar facturas', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al listar facturas' });
  }
};

// Obtener factura por ID
const obtenerFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const factura = await prisma.factura.findUnique({
      where: { id: parseInt(id) },
      include: {
        orden: {
          include: { 
            cliente: true, 
            local: true,
            horasTecnico: true
          }
        }
      }
    });

    if (!factura) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }

    res.json({ success: true, data: factura });
  } catch (error) {
    logger.error('obtenerFactura', 'Error al obtener factura', { error: error.message, facturaId: req.params.id });
    res.status(500).json({ success: false, message: 'Error al obtener la factura' });
  }
};

// Actualizar factura
const actualizarFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Obtener estado actual para validar transición
    const facturaActual = await prisma.factura.findUnique({
      where: { id: parseInt(id) }
    });

    if (!facturaActual) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }

    // VALIDACIÓN: Si hay cambio de estado, verificar con State Machine
    if (data.estado && data.estado !== facturaActual.estado) {
      const validacion = facturaStateMachine.validarTransicion(facturaActual.estado, data.estado);
      if (!validacion.valido) {
        logger.warn('actualizarFactura', 'Transición de estado inválida', { 
          facturaId: id,
          estadoActual: facturaActual.estado, 
          nuevoEstado: data.estado 
        });
        return res.status(400).json({ 
          success: false, 
          message: validacion.message 
        });
      }
      
      logger.info('actualizarFactura', 'Cambio de estado validado', {
        facturaId: id,
        de: facturaActual.estado,
        a: data.estado
      });
    }

    const factura = await prisma.factura.update({
      where: { id: parseInt(id) },
      data: {
        ...data,
        id_orden: data.id_orden ? parseInt(data.id_orden) : undefined,
        fecha_emision: data.fecha_emision ? new Date(data.fecha_emision) : undefined,
        fecha_vencimiento: data.fecha_vencimiento ? new Date(data.fecha_vencimiento) : undefined,
        fecha_pago: data.fecha_pago ? new Date(data.fecha_pago) : undefined
      }
    });

    res.json({ success: true, data: factura });
  } catch (error) {
    logger.error('actualizarFactura', 'Error al actualizar factura', { error: error.message, facturaId: req.params.id });
    res.status(500).json({ success: false, message: 'Error al actualizar la factura' });
  }
};

// Eliminar factura
const eliminarFactura = async (req, res) => {
  try {
    const { id } = req.params;
    
    const factura = await prisma.factura.findUnique({
      where: { id: parseInt(id) }
    });

    if (factura) {
      // Restaurar estado de facturación en la orden
      await prisma.orden.update({
        where: { id: factura.id_orden },
        data: {
          estado_facturacion: 'no_iniciada',
          facturable: false
        }
      });
    }

    await prisma.factura.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: 'Factura eliminada correctamente' });
  } catch (error) {
    logger.error('eliminarFactura', 'Error al eliminar factura', { error: error.message, facturaId: req.params.id });
    res.status(500).json({ success: false, message: 'Error al eliminar la factura' });
  }
};

// ==================== WORKFLOW DE FACTURACIÓN v3.1 ====================
// Estados: no_iniciada → validacion_cliente → aprobada_cliente → finalizada → pagada

// Avanzar a validación cliente (de no_iniciada)
const planificarFacturacion = async (req, res) => {
  try {
    logger.info('planificarFacturacion', 'Enviando a validación cliente', { facturaId: req.params.id });
    
    const { id } = req.params;
    const { fecha_vencimiento, monto, observaciones } = req.body;

    const facturaActual = await prisma.factura.findUnique({ where: { id: parseInt(id) } });
    if (!facturaActual) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }

    // Solo puede avanzar desde no_iniciada
    if (facturaActual.estado !== 'no_iniciada') {
      return res.status(400).json({ 
        success: false, 
        message: `No se puede enviar a validación. Estado actual: ${facturaActual.estado}` 
      });
    }

    const factura = await prisma.factura.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'validacion_cliente',
        fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : null,
        monto: monto,
        observaciones
      }
    });

    // Actualizar orden
    await prisma.orden.update({
      where: { id: factura.id_orden },
      data: { estado_facturacion: 'validacion_cliente' }
    });

    logger.info('planificarFacturacion', 'Facturación enviada a validación cliente', { facturaId: id });
    
    // Registrar en historial
    await registrarHistorial(parseInt(id), 'no_iniciada', 'validacion_cliente', observaciones || 'Enviada a validación cliente');
    
    res.json({ success: true, data: factura });
  } catch (error) {
    logger.error('planificarFacturacion', 'Error al enviar a validación', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al enviar a validación cliente' });
  }
};

// Aprobar desde cliente (validacion_cliente → aprobada_cliente)
const iniciarFacturacion = async (req, res) => {
  try {
    logger.info('iniciarFacturacion', 'Aprobando por cliente', { facturaId: req.params.id });
    
    const { id } = req.params;
    const { orden_compra_cliente, tiene_oc, observaciones, archivo_aprobacion } = req.body;

    const facturaActual = await prisma.factura.findUnique({ where: { id: parseInt(id) } });
    if (!facturaActual) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }

    // Solo puede avanzar desde validacion_cliente
    if (facturaActual.estado !== 'validacion_cliente') {
      return res.status(400).json({ 
        success: false, 
        message: `No se puede aprobar. Estado actual: ${facturaActual.estado}` 
      });
    }

    // Debe tener OC O archivo de aprobación
    const tieneOC = tiene_oc === true;
    const tieneArchivoAprobacion = archivo_aprobacion && archivo_aprobacion.length > 0;
    
    if (!tieneOC && !tieneArchivoAprobacion) {
      return res.status(400).json({ 
        success: false, 
        message: 'Para aprobar, debe proporcionar OC o subir comprobante de aprobación del cliente' 
      });
    }

    // Si tiene_oc = true, debe proporcionar el número de orden de compra
    if (tieneOC && !orden_compra_cliente) {
      return res.status(400).json({ 
        success: false, 
        message: 'Debe proporcionar el número de Orden de Compra del cliente' 
      });
    }

    const factura = await prisma.factura.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'aprobada_cliente',
        orden_compra_cliente: tieneOC ? orden_compra_cliente : facturaActual.orden_compra_cliente,
        tiene_oc: tieneOC,
        archivo_aprobacion: archivo_aprobacion || null,
        observaciones: observaciones || facturaActual.observaciones,
        fecha_emision: new Date()
      }
    });

    // Actualizar orden
    await prisma.orden.update({
      where: { id: factura.id_orden },
      data: { estado_facturacion: 'aprobada_cliente' }
    });

    logger.info('iniciarFacturacion', 'Facturación aprobada por cliente', { facturaId: id });
    
    // Registrar en historial
    await registrarHistorial(parseInt(id), 'validacion_cliente', 'aprobada_cliente', observaciones || `Aprobada por cliente. OC: ${orden_compra_cliente || 'N/A'}`);
    
    res.json({ success: true, data: factura });
  } catch (error) {
    logger.error('iniciarFacturacion', 'Error al aprobar por cliente', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al aprobar facturación' });
  }
};

// Finalizar facturación (aprobada_cliente → finalizada)
// Requiere: numero_factura obligatorio
const finalizarFacturacion = async (req, res) => {
  try {
    logger.info('finalizarFacturacion', 'Finalizando facturación', { facturaId: req.params.id });
    
    const { id } = req.params;
    const { numero_factura, monto, observaciones } = req.body;

    const facturaActual = await prisma.factura.findUnique({ where: { id: parseInt(id) } });
    if (!facturaActual) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }

    // Validar estado actual (solo desde aprobada_cliente o validacion_cliente si tiene_oc)
    const estadosPermitidos = ['aprobada_cliente'];
    if (facturaActual.tiene_oc) {
      estadosPermitidos.push('validacion_cliente');
    }

    if (!estadosPermitidos.includes(facturaActual.estado)) {
      return res.status(400).json({ 
        success: false, 
        message: `No se puede finalizar. Estado actual: ${facturaActual.estado}` 
      });
    }

    // VALIDACIÓN: numero_factura obligatorio para finalizar
    if (!numero_factura && !facturaActual.numero_factura) {
      return res.status(400).json({ 
        success: false, 
        message: 'El número de factura es obligatorio para finalizar' 
      });
    }

    const numeroFinal = numero_factura || facturaActual.numero_factura;

    const factura = await prisma.factura.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'finalizada',
        numero_factura: numeroFinal,
        monto: monto || facturaActual.monto,
        observaciones: observaciones || facturaActual.observaciones,
        fecha_emision: facturaActual.fecha_emision || new Date()
      }
    });

    // Actualizar orden
    await prisma.orden.update({
      where: { id: factura.id_orden },
      data: { 
        estado_facturacion: 'finalizada',
        numero_factura: numeroFinal
      }
    });

    logger.info('finalizarFacturacion', 'Facturación finalizada', { facturaId: id, numero_factura: numeroFinal });
    
    // Registrar en historial
    await registrarHistorial(parseInt(id), 'aprobada_cliente', 'finalizada', `Factura #: ${numeroFinal}. Monto: ${monto}`);
    
    res.json({ success: true, data: factura });
  } catch (error) {
    logger.error('finalizarFacturacion', 'Error al finalizar facturación', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al finalizar facturación' });
  }
};

// Registrar pago (finalizada → pagada)
const registrarPago = async (req, res) => {
  try {
    logger.info('registrarPago', 'Registrando pago', { facturaId: req.params.id });
    
    const { id } = req.params;
    const { monto_pagado, observaciones } = req.body;

    const facturaActual = await prisma.factura.findUnique({ where: { id: parseInt(id) } });
    if (!facturaActual) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }

    // Solo puede avanzar desde finalizada
    if (facturaActual.estado !== 'finalizada') {
      return res.status(400).json({ 
        success: false, 
        message: `No se puede registrar pago. Estado actual: ${facturaActual.estado}` 
      });
    }

    const factura = await prisma.factura.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'pagada',
        fecha_pago: new Date(),
        monto_pagado: monto_pagado,
        observaciones: observaciones || facturaActual.observaciones
      }
    });

    // Actualizar orden
    await prisma.orden.update({
      where: { id: factura.id_orden },
      data: { estado_facturacion: 'pagada' }
    });

    logger.info('registrarPago', 'Pago registrado', { facturaId: id, monto_pagado });
    
    // Registrar en historial
    await registrarHistorial(parseInt(id), 'finalizada', 'pagada', `Monto pagado: ${monto_pagado}. ${observaciones || ''}`);
    
    res.json({ success: true, data: factura });
  } catch (error) {
    logger.error('registrarPago', 'Error registrando pago', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al registrar pago' });
  }
};

// ==================== CONSULTAS ESPECIALES ====================

// Obtener historial de cambios de una factura
const obtenerHistorial = async (req, res) => {
  try {
    const { id } = req.params;
    
    const historial = await prisma.historialFactura.findMany({
      where: { id_factura: parseInt(id) },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json({ success: true, data: historial });
  } catch (error) {
    logger.error('obtenerHistorial', 'Error al obtener historial', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al obtener historial' });
  }
};

// Facturas pendientes (estados anteriores a finalizada)
const facturasPendientes = async (req, res) => {
  try {
    const facturas = await prisma.factura.findMany({
      where: {
        estado: { in: ['no_iniciada', 'validacion_cliente', 'aprobada_cliente'] }
      },
      include: {
        orden: {
          include: { cliente: true, local: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, data: facturas });
  } catch (error) {
    logger.error('facturasPendientes', 'Error obteniendo pendientes', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener facturas pendientes' });
  }
};

// Facturas vencidas
const facturasVencidas = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    const facturas = await prisma.factura.findMany({
      where: {
        estado: { in: ['planificada', 'en_proceso', 'finalizada'] },
        fecha_vencimiento: { lt: hoy }
      },
      include: {
        orden: {
          include: { cliente: true }
        }
      },
      orderBy: { fecha_vencimiento: 'asc' }
    });
    res.json({ success: true, data: facturas });
  } catch (error) {
    console.error('Error obteniendo facturas vencidas:', error);
    res.status(500).json({ error: 'Error al obtener facturas vencidas' });
  }
};

// Resumen de facturación (v3.1 - incluye estados legacy y nuevos)
const resumenFacturacion = async (req, res) => {
  try {
    const { año, mes } = req.query;
    
    let fechaInicio, fechaFin;
    
    if (año && mes) {
      fechaInicio = new Date(parseInt(año), parseInt(mes) - 1, 1);
      fechaFin = new Date(parseInt(año), parseInt(mes), 0, 23, 59, 59);
    } else {
      // Mes actual
      const now = new Date();
      fechaInicio = new Date(now.getFullYear(), now.getMonth(), 1);
      fechaFin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const facturas = await prisma.factura.findMany({
      where: {
        createdAt: { gte: fechaInicio, lte: fechaFin }
      }
    });

    // Mapeo de estados legacy a nuevos para compatibilidad
    const mapEstado = (estado) => {
      if (estado === 'planificada') return 'validacion_cliente';
      if (estado === 'en_proceso') return 'aprobada_cliente';
      return estado;
    };

    // Calcular cantidades y montos por estado
    const facturasNoIniciada = facturas.filter(f => f.estado === 'no_iniciada');
    const facturasValidacion = facturas.filter(f => f.estado === 'validacion_cliente' || f.estado === 'planificada');
    const facturasAprobadas = facturas.filter(f => f.estado === 'aprobada_cliente' || f.estado === 'en_proceso');
    const facturasFinalizadas = facturas.filter(f => f.estado === 'finalizada');
    const facturasPagadas = facturas.filter(f => f.estado === 'pagada');

    const resumen = {
      total: facturas.length,
      // Estados nuevos v3.1 con cantidades
      no_iniciada: facturasNoIniciada.length,
      validacion_cliente: facturasValidacion.length,
      aprobada_cliente: facturasAprobadas.length,
      finalizada: facturasFinalizadas.length,
      pagada: facturasPagadas.length,
      // Montos por estado
      monto_no_iniciada: facturasNoIniciada.reduce((acc, f) => acc + (f.monto || 0), 0),
      monto_validacion_cliente: facturasValidacion.reduce((acc, f) => acc + (f.monto || 0), 0),
      monto_aprobada_cliente: facturasAprobadas.reduce((acc, f) => acc + (f.monto || 0), 0),
      monto_finalizada: facturasFinalizadas.reduce((acc, f) => acc + (f.monto || 0), 0),
      monto_pagado: facturasPagadas.reduce((acc, f) => acc + (f.monto_pagado || 0), 0),
      // Totales generales
      monto_total: facturas.reduce((acc, f) => acc + (f.monto || 0), 0),
      monto_pendiente: facturas.reduce((acc, f) => acc + ((f.monto || 0) - (f.monto_pagado || 0)), 0)
    };

    res.json(resumen);
  } catch (error) {
    console.error('Error calculando resumen:', error);
    res.status(500).json({ error: 'Error al calcular resumen de facturación' });
  }
};

// ==================== AUTOMATIZACIONES ====================

// Generar facturas automáticamente desde órdenes facturables
const generarFacturasAuto = async (req, res) => {
  try {
    // Buscar órdenes completadas, facturables, con informe aprobado y sin factura
    const ordenes = await prisma.orden.findMany({
      where: {
        estado: 'completada',
        facturable: true,
        informe_adjunto: true,
        estado_informe: 'aprobado',
        estado_facturacion: { in: ['no_iniciada', 'planificada'] },
        factura: null // Sin factura asociada
      }
    });

    const facturasCreadas = [];
    for (const orden of ordenes) {
      const numero_factura = await generarNumeroFactura();
      
      const factura = await prisma.factura.create({
        data: {
          id_orden: orden.id,
          numero_factura,
          estado: 'no_iniciada'
        }
      });

      facturasCreadas.push(factura);
    }

    res.json({ 
      message: `${facturasCreadas.length} facturas generadas automáticamente`,
      facturas: facturasCreadas 
    });
  } catch (error) {
    console.error('Error generando facturas auto:', error);
    res.status(500).json({ error: 'Error al generar facturas automáticamente' });
  }
};

module.exports = {
  crearFactura,
  listarFacturas,
  obtenerFactura,
  actualizarFactura,
  eliminarFactura,
  planificarFacturacion,
  iniciarFacturacion,
  finalizarFacturacion,
  registrarPago,
  facturasPendientes,
  facturasVencidas,
  resumenFacturacion,
  generarFacturasAuto,
  obtenerHistorial
};