/**
 * Servicio de Automatización - MVP Coordinador Técnico v3.0
 * Automatizaciones del sistema
 */

const { PrismaClient } = require('@prisma/client');
const prisma = require('../db');

// ==================== DETECCIÓN DE NO CUMPLIDOS ====================

/**
 * Detectar asignaciones no cumplidas
 * Busca asignaciones de días anteriores sin registro diario completado
 */
const detectarNoCumplidos = async () => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    // Buscar asignaciones de ayer que no tienen registro diario completado
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

        // Registrar en historial
        await prisma.historialOrden.create({
          data: {
            id_orden: asignacion.id_orden,
            accion: 'no_cumplido',
            estado_nuevo: 'no_cumplido',
            motivo: `Asignación del ${asignacion.fecha_asignacion.toISOString().split('T')[0]} no cumplida`,
            usuario: 'sistema'
          }
        });
      }
    }

    return {
      success: true,
      message: `${noCumplidos.length} asignaciones marcadas como no cumplidas`,
      noCumplidos
    };
  } catch (error) {
    console.error('Error detectando no cumplidos:', error);
    return { success: false, error: error.message };
  }
};

// ==================== GENERACIÓN AUTOMÁTICA DE FACTURAS ====================

/**
 * Generar facturas automáticamente desde órdenes facturables
 * Crea factura para órdenes completadas con informe aprobado
 */
const generarFacturasAuto = async () => {
  try {
    // Buscar órdenes completadas, facturables, con informe aprobado y sin factura
    const ordenes = await prisma.orden.findMany({
      where: {
        estado: 'completada',
        facturable: true,
        informe_adjunto: true,
        estado_informe: 'aprobado',
        estado_facturacion: { in: ['no_iniciada', 'planificada'] },
        factura: null
      }
    });

    const facturasCreadas = [];
    for (const orden of ordenes) {
      // Verificar si ya tiene factura
      const facturaExistente = await prisma.factura.findUnique({
        where: { id_orden: orden.id }
      });

      if (facturaExistente) continue;

      // Generar número de factura
      const año = new Date().getFullYear();
      const ultimo = await prisma.factura.findFirst({
        orderBy: { id: 'desc' }
      });
      const numero = ultimo ? ultimo.id + 1 : 1;
      const numero_factura = `FAC-${año}-${numero.toString().padStart(5, '0')}`;

      const factura = await prisma.factura.create({
        data: {
          id_orden: orden.id,
          numero_factura,
          estado: 'no_iniciada'
        }
      });

      facturasCreadas.push(factura);
    }

    return {
      success: true,
      message: `${facturasCreadas.length} facturas generadas automáticamente`,
      facturas: facturasCreadas
    };
  } catch (error) {
    console.error('Error generando facturas auto:', error);
    return { success: false, error: error.message };
  }
};

// ==================== MARCAR TAREAS COMO FACTURABLES ====================

/**
 * Marcar automáticamente tareas como facturables
 * Basado en tipo de trabajo y estado
 */
const marcarFacturables = async () => {
  try {
    // Órdenes completadas de tipos facturables sin marcar
    const ordenes = await prisma.orden.findMany({
      where: {
        estado: 'completada',
        facturable: false,
        tipo_trabajo: { in: ['correctivo', 'instalacion'] }
      }
    });

    const actualizadas = [];
    for (const orden of ordenes) {
      await prisma.orden.update({
        where: { id: orden.id },
        data: { facturable: true }
      });
      actualizadas.push(orden.id);
    }

    return {
      success: true,
      message: `${actualizadas.length} órdenes marcadas como facturables`,
      ids: actualizadas
    };
  } catch (error) {
    console.error('Error marcando facturables:', error);
    return { success: false, error: error.message };
  }
};

// ==================== VALIDAR INFORME ANTES DE FACTURAR ====================

/**
 * Validar si una orden puede ser enviada a facturación
 * Requiere: informe adjunto Y estado aprobado
 */
const validarParaFacturar = async (idOrden) => {
  try {
    const orden = await prisma.orden.findUnique({
      where: { id: idOrden }
    });

    if (!orden) {
      return { valido: false, motivo: 'Orden no encontrada' };
    }

    if (orden.estado !== 'completada') {
      return { valido: false, motivo: 'La orden debe estar completada' };
    }

    if (!orden.informe_adjunto) {
      return { valido: false, motivo: 'Debe adjuntar informe técnico' };
    }

    if (orden.estado_informe !== 'aprobado') {
      return { valido: false, motivo: 'El informe debe estar aprobado' };
    }

    return { valido: true, motivo: 'Orden lista para facturar' };
  } catch (error) {
    console.error('Error validando para facturar:', error);
    return { valido: false, error: error.message };
  }
};

// ==================== GENERAR HORAS DESDE PLANIFICACIÓN ====================

/**
 * Generar horas de técnico desde asignaciones completadas
 * Crea registros en horaTecnico desde registroDiario
 */
const generarHorasDesdeRegistro = async (idRegistroDiario) => {
  try {
    const registro = await prisma.registroDiario.findUnique({
      where: { id: idRegistroDiario },
      include: { tecnico: true }
    });

    if (!registro) {
      return { success: false, error: 'Registro diario no encontrado' };
    }

    // Eliminar horas anteriores de este registro
    await prisma.horaTecnico.deleteMany({
      where: {
        id_orden: registro.id_orden,
        fecha: registro.fecha
      }
    });

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

    return { success: true, message: 'Horas generadas correctamente' };
  } catch (error) {
    console.error('Error generando horas:', error);
    return { success: false, error: error.message };
  }
};

// ==================== REPROGRAMACIÓN AUTOMÁTICA ====================

/**
 * Reprogramar automáticamente asignaciones no cumplidas
 * Mueve la asignación al siguiente día laborable
 */
const reprogramarNoCumplidos = async () => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Buscar asignaciones no cumplidas de días anteriores
    const asignaciones = await prisma.asignacion.findMany({
      where: {
        estado: 'no_cumplido',
        fecha_asignacion: { lt: hoy }
      }
    });

    const reprogramadas = [];
    for (const asignacion of asignaciones) {
      // Calcular siguiente día laborable
      let siguienteDia = new Date(hoy);
      siguienteDia.setDate(siguienteDia.getDate() + 1);

      // Saltar fines de semana
      while (siguienteDia.getDay() === 0 || siguienteDia.getDay() === 6) {
        siguienteDia.setDate(siguienteDia.getDate() + 1);
      }

      await prisma.asignacion.update({
        where: { id: asignacion.id },
        data: {
          estado: 'pendiente',
          fecha_asignacion: siguienteDia,
          motivo_reprogramacion: `Reprogramación automática del ${asignacion.fecha_asignacion.toISOString().split('T')[0]}`
        }
      });

      // Actualizar orden si es la única asignación
      const totalAsignaciones = await prisma.asignacion.count({
        where: { id_orden: asignacion.id_orden }
      });

      if (totalAsignaciones === 1) {
        await prisma.orden.update({
          where: { id: asignacion.id_orden },
          data: {
            estado: 'reprogramado',
            fecha_programada: siguienteDia
          }
        });
      }

      reprogramadas.push(asignacion.id);
    }

    return {
      success: true,
      message: `${reprogramadas.length} asignaciones reprogramadas`,
      ids: reprogramadas
    };
  } catch (error) {
    console.error('Error reprogramando:', error);
    return { success: false, error: error.message };
  }
};

// ==================== DASHBOARD KPIs ====================

/**
 * Obtener KPIs para dashboard
 */
const obtenerDashboardKPIs = async () => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    // Órdenes
    const totalOrdenes = await prisma.orden.count();
    const ordenesPendientes = await prisma.orden.count({ where: { estado: 'pendiente' } });
    const ordenesEnProceso = await prisma.orden.count({ where: { estado: 'en_proceso' } });
    const ordenesCompletadas = await prisma.orden.count({ where: { estado: 'completada' } });
    const ordenesAtrasadas = await prisma.orden.count({
      where: {
        estado: { in: ['pendiente', 'en_proceso', 'reprogramado'] },
        fecha_programada: { lt: hoy }
      }
    });

    // Técnicos activos
    const tecnicosActivos = await prisma.tecnico.count({ where: { estado: 'activo' } });

    // Horas del mes
    const horasMes = await prisma.horaTecnico.aggregate({
      where: {
        fecha: { gte: new Date(hoy.getFullYear(), hoy.getMonth(), 1), lte: finMes }
      },
      _sum: { horas_trabajadas: true }
    });

    // Horas extras del mes
    const horasExtrasMes = await prisma.horaTecnico.aggregate({
      where: {
        fecha: { gte: new Date(hoy.getFullYear(), hoy.getMonth(), 1), lte: finMes },
        tipo: 'extra'
      },
      _sum: { horas_trabajadas: true }
    });

    // Facturación
    const facturasPendientes = await prisma.factura.count({
      where: { estado: { in: ['no_iniciada', 'planificada', 'en_proceso'] } }
    });
    const facturasPagadas = await prisma.factura.count({ where: { estado: 'pagada' } });

    const montoFacturado = await prisma.factura.aggregate({
      where: { estado: { in: ['finalizada', 'pagada'] } },
      _sum: { monto: true }
    });

    const montoCobrado = await prisma.factura.aggregate({
      where: { estado: 'pagada' },
      _sum: { monto_pagado: true }
    });

    return {
      success: true,
      kpis: {
        ordenes: {
          total: totalOrdenes,
          pendientes: ordenesPendientes,
          enProceso: ordenesEnProceso,
          completadas: ordenesCompletadas,
          atrasadas: ordenesAtrasadas
        },
        tecnicos: {
          activos: tecnicosActivos
        },
        horas: {
          mes: horasMes._sum.horas_trabajadas || 0,
          extras: horasExtrasMes._sum.horas_trabajadas || 0
        },
        facturacion: {
          pendientes: facturasPendientes,
          pagadas: facturasPagadas,
          montoFacturado: montoFacturado._sum.monto || 0,
          montoCobrado: montoCobrado._sum.monto_pagado || 0
        }
      }
    };
  } catch (error) {
    console.error('Error obteniendo KPIs:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  detectarNoCumplidos,
  generarFacturasAuto,
  marcarFacturables,
  validarParaFacturar,
  generarHorasDesdeRegistro,
  reprogramarNoCumplidos,
  obtenerDashboardKPIs
};