/**
 * Controlador de Horas de Técnico - MVP Coordinador Técnico v3.0
 * Gestión de horas trabajadas usando RegistroDiario
 * Soporta: horas normales, extras, viaje, almuerzo, día libre, certificación médica
 */

const { PrismaClient } = require('@prisma/client');
const prisma = require('../db');
const { logger } = require('../utils/logger');

// ==================== UTILIDADES ====================

// Calcular horas entre dos tiempos
const calcularHoras = (horaInicio, horaFin) => {
  if (!horaInicio || !horaFin) return 0;
  const inicio = new Date(`2000-01-01 ${horaInicio}`);
  const fin = new Date(`2000-01-01 ${horaFin}`);
  let horas = (fin - inicio) / (1000 * 60 * 60);
  // Si hora_fin < hora_inicio, significa que cruzó medianoche (ej: 07:31 a 00:42)
  if (horas < 0) {
    horas += 24;
  }
  return Math.max(0, horas);
};

// Calcular horas de trabajo restando pausas
const calcularHorasTrabajo = (horaInicio, horaFin, pausas) => {
  let total = calcularHoras(horaInicio, horaFin);
  
  // Restar todas las pausas (desayuno, almuerzo, cena)
  if (pausas.desayuno_inicio && pausas.desayuno_fin) {
    total -= calcularHoras(pausas.desayuno_inicio, pausas.desayuno_fin);
  }
  if (pausas.almuerzo_inicio && pausas.almuerzo_fin) {
    total -= calcularHoras(pausas.almuerzo_inicio, pausas.almuerzo_fin);
  }
  if (pausas.cena_inicio && pausas.cena_fin) {
    total -= calcularHoras(pausas.cena_inicio, pausas.cena_fin);
  }
  
  return Math.max(0, total);
};

// Calcular horas de cada pausa
const calcularPausas = (desayuno_inicio, desayuno_fin, almuerzo_inicio, almuerzo_fin, cena_inicio, cena_fin) => {
  return {
    horas_desayuno: calcularHoras(desayuno_inicio, desayuno_fin),
    horas_almuerzo: calcularHoras(almuerzo_inicio, almuerzo_fin),
    horas_cena: calcularHoras(cena_inicio, cena_fin)
  };
};

// ==================== CRUD BÁSICO ====================

// Crear registro diario
const crearHora = async (req, res) => {
  try {
    const {
      id_tecnico,
      id_orden,
      fecha,
      hora_inicio,
      hora_fin,
      hora_desayuno_inicio,
      hora_desayuno_fin,
      hora_almuerzo_inicio,
      hora_almuerzo_fin,
      hora_cena_inicio,
      hora_cena_fin,
      tipo,
      es_viaje,
      es_dia_libre,
      tiene_certificacion,
      motivo_certificacion,
      observaciones
    } = req.body;

    // Permite registrar horas sin orden (para trabajos no planificados)
    // Si id_orden es null/undefined/empty, usamos 0 que es válido para SQLite
    let idOrden = null;
    if (id_orden != null && id_orden !== '') {
      const parsed = parseInt(id_orden);
      if (!isNaN(parsed)) {
        idOrden = parsed;
      }
    }
    const idTecnico = parseInt(id_tecnico);

    // Calcular horas de trabajo restando todas las pausas
    const pausas = {
      desayuno_inicio: hora_desayuno_inicio,
      desayuno_fin: hora_desayuno_fin,
      almuerzo_inicio: hora_almuerzo_inicio,
      almuerzo_fin: hora_almuerzo_fin,
      cena_inicio: hora_cena_inicio,
      cena_fin: hora_cena_fin
    };
    const horas_trabajo = calcularHorasTrabajo(hora_inicio, hora_fin, pausas);
    
    // Calcular horas de cada pausa
    const horasPausas = calcularPausas(
      hora_desayuno_inicio, hora_desayuno_fin,
      hora_almuerzo_inicio, hora_almuerzo_fin,
      hora_cena_inicio, hora_cena_fin
    );

    // Validar máximo 24 horas por día
    const totalPausas = horasPausas.horas_desayuno + horasPausas.horas_almuerzo + horasPausas.horas_cena;
    if (horas_trabajo - totalPausas > 24) {
      return res.status(400).json({ error: 'No puede registrar más de 24 horas en un día' });
    }

    // Calcular automáticamente si es fin de semana (sábado=6, domingo=0)
    // Usar fecha con hora del mediodía para evitar problemas de timezone
    const fechaObj = new Date(fecha + 'T12:00:00');
    const diaSemana = fechaObj.getDay();
    const esFinSemana = diaSemana === 0 || diaSemana === 6;
    
    // Determinar tipo de hora
    let tipoHora = tipo || 'normal';

    // Calcular horas normales y extras (asumiendo jornada de 8h)
    const jornadaNormal = 8;
    let horas_normales = horas_trabajo;
    let horas_extras = 0;
    
    if (tipoHora === 'normal' && horas_trabajo > jornadaNormal) {
      horas_normales = jornadaNormal;
      horas_extras = horas_trabajo - jornadaNormal;
    } else if (tipoHora === 'extra') {
      horas_extras = horas_trabajo;
      horas_normales = 0;
    }

    // Construir datos del registro - solo incluir id_orden si tiene valor válido
    const registroData = {
      id_tecnico: idTecnico,
      fecha: new Date(fecha),
      hora_inicio_trabajo: hora_inicio,
      hora_fin_trabajo: hora_fin,
      hora_desayuno_inicio,
      hora_desayuno_fin,
      hora_almuerzo_inicio,
      hora_almuerzo_fin,
      hora_cena_inicio,
      hora_cena_fin,
      horas_normales,
      horas_extras,
      horas_almuerzo: horasPausas.horas_almuerzo,
      horas_desayuno: horasPausas.horas_desayuno,
      horas_cena: horasPausas.horas_cena,
      es_fin_semana: esFinSemana,
      es_dia_libre: es_dia_libre || false,
      tiene_certificacion: tiene_certificacion || false,
      motivo_certificacion,
      observaciones,
      estado_dia: es_dia_libre ? 'dia_libre' : (tiene_certificacion ? 'certificacion' : 'completado')
    };
    
    // Solo agregar id_orden si tiene valor válido
    if (idOrden !== null && idOrden !== 0) {
      registroData.id_orden = idOrden;
    }

    const registro = await prisma.registroDiario.create({
      data: registroData
    });

    res.status(201).json(registro);
  } catch (error) {
    console.error('Error creando registro:', error);
    res.status(500).json({ error: 'Error al crear registro', details: error.message });
  }
};

// Listar registros diarios con filtros
const listarHoras = async (req, res) => {
  try {
    const { id_tecnico, id_orden, estado_dia, fecha_inicio, fecha_fin } = req.query;
    
    const where = {};
    if (id_tecnico) where.id_tecnico = parseInt(id_tecnico);
    if (id_orden) where.id_orden = parseInt(id_orden);
    if (estado_dia) where.estado_dia = estado_dia;
    if (fecha_inicio || fecha_fin) {
      where.fecha = {};
      if (fecha_inicio) where.fecha.gte = new Date(fecha_inicio);
      if (fecha_fin) where.fecha.lte = new Date(fecha_fin);
    }

    const horas = await prisma.registroDiario.findMany({
      where,
      include: {
        tecnico: true,
        orden: { include: { cliente: true, local: true } }
      },
      orderBy: { fecha: 'desc' }
    });

    res.json(horas);
  } catch (error) {
    console.error('Error listando horas:', error);
    res.status(500).json({ error: 'Error al listar horas' });
  }
};

// Obtener registro por ID
const obtenerHora = async (req, res) => {
  try {
    const { id } = req.params;
    const hora = await prisma.registroDiario.findUnique({
      where: { id: parseInt(id) },
      include: {
        tecnico: true,
        orden: { include: { cliente: true, local: true } }
      }
    });

    if (!hora) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    res.json(hora);
  } catch (error) {
    console.error('Error obteniendo hora:', error);
    res.status(500).json({ error: 'Error al obtener hora' });
  }
};

// Actualizar registro diario
const actualizarHora = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Recalcular horas si hay cambio en tiempos
    if (data.hora_inicio || data.hora_fin) {
      const actual = await prisma.registroDiario.findUnique({ where: { id: parseInt(id) } });
      const horaInicio = data.hora_inicio || actual.hora_inicio_trabajo;
      const horaFin = data.hora_fin || actual.hora_fin_trabajo;
      
      const pausas = {
        desayuno_inicio: data.hora_desayuno_inicio || actual.hora_desayuno_inicio,
        desayuno_fin: data.hora_desayuno_fin || actual.hora_desayuno_fin,
        almuerzo_inicio: data.hora_almuerzo_inicio || actual.hora_almuerzo_inicio,
        almuerzo_fin: data.hora_almuerzo_fin || actual.hora_almuerzo_fin,
        cena_inicio: data.hora_cena_inicio || actual.hora_cena_inicio,
        cena_fin: data.hora_cena_fin || actual.hora_cena_fin
      };
      
      const horas_trabajo = calcularHorasTrabajo(horaInicio, horaFin, pausas);
      const horasPausas = calcularPausas(
        pausas.desayuno_inicio, pausas.desayuno_fin,
        pausas.almuerzo_inicio, pausas.almuerzo_fin,
        pausas.cena_inicio, pausas.cena_fin
      );
      
      // Recalcular normales y extras
      const jornadaNormal = 8;
      data.horas_normales = horas_trabajo;
      data.horas_extras = 0;
      if (horas_trabajo > jornadaNormal) {
        data.horas_normales = jornadaNormal;
        data.horas_extras = horas_trabajo - jornadaNormal;
      }
      data.horas_desayuno = horasPausas.horas_desayuno;
      data.horas_almuerzo = horasPausas.horas_almuerzo;
      data.horas_cena = horasPausas.horas_cena;
    }

    const hora = await prisma.registroDiario.update({
      where: { id: parseInt(id) },
      data: {
        ...data,
        id_tecnico: data.id_tecnico ? parseInt(data.id_tecnico) : undefined,
        id_orden: data.id_orden ? parseInt(data.id_orden) : undefined,
        fecha: data.fecha ? new Date(data.fecha) : undefined,
        es_dia_libre: data.es_dia_libre || false,
        tiene_certificacion: data.tiene_certificacion || false,
        motivo_certificacion: data.motivo_certificacion,
        hora_desayuno_inicio: data.hora_desayuno_inicio,
        hora_desayuno_fin: data.hora_desayuno_fin,
        hora_almuerzo_inicio: data.hora_almuerzo_inicio,
        hora_almuerzo_fin: data.hora_almuerzo_fin,
        hora_cena_inicio: data.hora_cena_inicio,
        hora_cena_fin: data.hora_cena_fin
      }
    });

    res.json(hora);
  } catch (error) {
    console.error('Error actualizando hora:', error);
    res.status(500).json({ error: 'Error al actualizar hora' });
  }
};

// Eliminar registro
const eliminarHora = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.registroDiario.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Registro eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando hora:', error);
    res.status(500).json({ error: 'Error al eliminar hora' });
  }
};

// ==================== RESÚMENES ====================

// Resumen diario
const resumenDiario = async (req, res) => {
  try {
    const { fecha, id_tecnico } = req.query;
    
    // Obtener fecha actual en formato YYYY-MM-DD
    const ahora = new Date();
    const fechaStr = fecha || ahora.toISOString().split('T')[0];
    console.log('Buscando fecha:', fechaStr);
    
    // Fechas en UTC para evitar problemas de zona horaria
    const fechaInicio = new Date(fechaStr + 'T00:00:00.000Z');
    const fechaFin = new Date(fechaStr + 'T23:59:59.999Z');

    const where = {
      fecha: {
        gte: fechaInicio,
        lte: fechaFin
      }
    };
    if (id_tecnico) where.id_tecnico = parseInt(id_tecnico);

    const horas = await prisma.registroDiario.findMany({
      where,
      include: { tecnico: true }
    });
    
    console.log('Encontrados:', horas.length);

    // Agrupar por técnico
    const resumen = {};
    horas.forEach(h => {
      const techId = h.id_tecnico;
      if (!resumen[techId]) {
        resumen[techId] = {
          tecnico: h.tecnico,
          total_horas: 0,
          horas_normales: 0,
          horas_extras: 0,
          dias_trabajados: 0,
          dias_libres: 0
        };
      }
      if (!h.es_dia_libre) {
        resumen[techId].total_horas += (h.horas_normales || 0) + (h.horas_extras || 0);
        resumen[techId].horas_normales += h.horas_normales || 0;
        resumen[techId].horas_extras += h.horas_extras || 0;
        resumen[techId].dias_trabajados += 1;
      } else {
        resumen[techId].dias_libres += 1;
      }
    });

    res.json(Object.values(resumen));
  } catch (error) {
    console.error('Error en resumen diario:', error);
    res.status(500).json({ error: 'Error al generar resumen diario' });
  }
};

// Resumen semanal
const resumenSemanal = async (req, res) => {
  try {
    const { fecha_inicio, id_tecnico } = req.query;
    
    // Obtener inicio de semana (lunes) usando fecha local
    let inicio;
    if (fecha_inicio) {
      inicio = new Date(fecha_inicio + 'T00:00:00');
    } else {
      inicio = new Date();
    }
    
    const dia = inicio.getDay();
    const diff = inicio.getDate() - dia + (dia === 0 ? -6 : 1);
    inicio.setDate(inicio.getDate() - diff);
    inicio.setHours(0, 0, 0, 0);
    
    // Fechas en UTC
    const fechaStr = inicio.toISOString().split('T')[0];
    const inicioUTC = new Date(fechaStr + 'T00:00:00.000Z');
    
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 6);
    const finStr = fin.toISOString().split('T')[0];
    const finUTC = new Date(finStr + 'T23:59:59.999Z');

    const where = { fecha: { gte: inicioUTC, lte: finUTC } };
    if (id_tecnico) where.id_tecnico = parseInt(id_tecnico);

    const horas = await prisma.registroDiario.findMany({
      where,
      include: { tecnico: true }
    });

    // Agrupar por técnico
    const resumen = {};
    horas.forEach(h => {
      const techId = h.id_tecnico;
      if (!resumen[techId]) {
        resumen[techId] = {
          tecnico: h.tecnico,
          total_horas: 0,
          horas_normales: 0,
          horas_extras: 0,
          dias_trabajados: 0,
          dias_libres: 0,
          certificaciones: 0
        };
      }
      if (h.es_dia_libre) {
        resumen[techId].dias_libres += 1;
      } else if (h.tiene_certificacion) {
        resumen[techId].certificaciones += 1;
      } else {
        resumen[techId].total_horas += (h.horas_normales || 0) + (h.horas_extras || 0);
        resumen[techId].horas_normales += h.horas_normales || 0;
        resumen[techId].horas_extras += h.horas_extras || 0;
        resumen[techId].dias_trabajados += 1;
      }
    });

    res.json(Object.values(resumen));
  } catch (error) {
    console.error('Error en resumen semanal:', error);
    res.status(500).json({ error: 'Error al generar resumen semanal' });
  }
};

// Resumen mensual
const resumenMensual = async (req, res) => {
  try {
    const { año, mes, id_tecnico } = req.query;
    const fecha = new Date();
    const añoNum = año ? parseInt(año) : fecha.getFullYear();
    const mesNum = mes ? parseInt(mes) - 1 : fecha.getMonth();

    // Fechas en UTC para evitar problemas de zona horaria
    const inicioStr = `${añoNum}-${String(mesNum + 1).padStart(2, '0')}-01`;
    const inicio = new Date(inicioStr + 'T00:00:00.000Z');
    
    // Último día del mes
    const fin = new Date(añoNum, mesNum + 1, 0);
    const finStr = fin.toISOString().split('T')[0];
    const finUTC = new Date(finStr + 'T23:59:59.999Z');

    const where = { fecha: { gte: inicio, lte: finUTC } };
    if (id_tecnico) where.id_tecnico = parseInt(id_tecnico);

    const horas = await prisma.registroDiario.findMany({
      where,
      include: { tecnico: true }
    });

    // Agrupar por técnico
    const resumen = {};
    horas.forEach(h => {
      const techId = h.id_tecnico;
      if (!resumen[techId]) {
        resumen[techId] = {
          tecnico: h.tecnico,
          total_horas: 0,
          horas_normales: 0,
          horas_extras: 0,
          dias_trabajados: 0,
          dias_libres: 0,
          certificaciones: 0
        };
      }
      if (h.es_dia_libre) {
        resumen[techId].dias_libres += 1;
      } else if (h.tiene_certificacion) {
        resumen[techId].certificaciones += 1;
      } else {
        resumen[techId].total_horas += (h.horas_normales || 0) + (h.horas_extras || 0);
        resumen[techId].horas_normales += h.horas_normales || 0;
        resumen[techId].horas_extras += h.horas_extras || 0;
        resumen[techId].dias_trabajados += 1;
      }
    });

    res.json({ success: true, data: Object.values(resumen) });
  } catch (error) {
    logger.error('resumenMensual', 'Error en resumen mensual', { error: error.message });
    res.status(500).json({ success: false, message: 'Error al generar resumen mensual' });
  }
};

// Resumen custom por rango de fechas
const resumenCustom = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'Se requiere fecha_inicio y fecha_fin' });
    }
    
    const fechaInicio = new Date(fecha_inicio + 'T00:00:00.000Z');
    const fechaFin = new Date(fecha_fin + 'T23:59:59.999Z');

    const horas = await prisma.registroDiario.findMany({
      where: {
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      },
      include: { tecnico: true }
    });
    
    // Agrupar por técnico
    const resumen = {};
    horas.forEach(h => {
      const techId = h.id_tecnico;
      if (!resumen[techId]) {
        resumen[techId] = {
          tecnico: h.tecnico,
          total_horas: 0,
          horas_normales: 0,
          horas_extras: 0,
          dias_trabajados: 0,
          dias_libres: 0
        };
      }
      if (!h.es_dia_libre) {
        resumen[techId].total_horas += (h.horas_normales || 0) + (h.horas_extras || 0);
        resumen[techId].horas_normales += h.horas_normales || 0;
        resumen[techId].horas_extras += h.horas_extras || 0;
        resumen[techId].dias_trabajados += 1;
      } else {
        resumen[techId].dias_libres += 1;
      }
    });

    res.json(Object.values(resumen));
  } catch (error) {
    console.error('Error en resumen custom:', error);
    res.status(500).json({ error: 'Error al generar resumen custom' });
  }
};

// ==================== HORAS POR TÉCNICO ====================

// Horas por técnico
const horasPorTecnico = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_inicio, fecha_fin } = req.query;
    
    const where = { id_tecnico: parseInt(id) };
    if (fecha_inicio || fecha_fin) {
      where.fecha = {};
      if (fecha_inicio) where.fecha.gte = new Date(fecha_inicio);
      if (fecha_fin) where.fecha.lte = new Date(fecha_fin);
    }

    const horas = await prisma.horaTecnico.findMany({
      where,
      include: { orden: { include: { cliente: true, local: true } } },
      orderBy: { fecha: 'desc' }
    });

    res.json(horas);
  } catch (error) {
    console.error('Error obteniendo horas por técnico:', error);
    res.status(500).json({ error: 'Error al obtener horas' });
  }
};

// ==================== VALIDACIÓN ====================

// Validar jornada laboral
const validarJornada = async (req, res) => {
  try {
    const { id_tecnico, fecha } = req.query;
    const fechaBusqueda = fecha ? new Date(fecha) : new Date();
    fechaBusqueda.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fechaBusqueda);
    fechaFin.setHours(23, 59, 59, 999);

    const horas = await prisma.horaTecnico.findMany({
      where: {
        id_tecnico: parseInt(id_tecnico),
        fecha: { gte: fechaBusqueda, lte: fechaFin }
      }
    });

    const tecnico = await prisma.tecnico.findUnique({
      where: { id: parseInt(id_tecnico) }
    });

    const jornadaTecnico = tecnico?.jornada_horaria || 8;
    const totalHoras = horas.reduce((sum, h) => sum + h.horas_trabajadas, 0);
    const horasExtra = Math.max(0, totalHoras - jornadaTecnico);

    res.json({
      id_tecnico: parseInt(id_tecnico),
      fecha: fechaBusqueda.toISOString().split('T')[0],
      jornada_programada: jornadaTecnico,
      horas_registradas: totalHoras,
      horas_extra: horasExtra,
      cumple_jornada: totalHoras >= jornadaTecnico,
      registros: horas.length
    });
  } catch (error) {
    console.error('Error validando jornada:', error);
    res.status(500).json({ error: 'Error al validar jornada' });
  }
};

// ==================== JORNADAS GRUPALES (Nueva funcionalidad) ====================

// Crear jornada grupal (múltiples técnicos, varias comidas, varios segmentos)
const crearJornadaGrupo = async (req, res) => {
  try {
    const {
      fecha,
      hora_entrada,
      hora_salida,
      observaciones,
      tecnicos, // Array de { id_tecnico, hora_llegada?, hora_salida?, observaciones? }
      comidas,  // Array de { tipo, hora_inicio, hora_fin } (desayuno, almuerzo, cena)
      segmentos // Array de { id_orden?, descripcion?, hora_inicio, hora_fin, tipo }
    } = req.body;

    // Validaciones
    if (!fecha || !hora_entrada || !hora_salida) {
      return res.status(400).json({ error: 'Fecha, hora de entrada y salida son requeridas' });
    }
    if (!tecnicos || tecnicos.length === 0) {
      return res.status(400).json({ error: 'Debe seleccionar al menos un técnico' });
    }

    // Calcular horas totales
    const hora_entrada_calc = hora_entrada;
    const hora_salida_calc = hora_salida;
    
    // Calcular tiempo total de pausas
    let totalPausas = 0;
    if (comidas && comidas.length > 0) {
      comidas.forEach(c => {
        totalPausas += calcularHoras(c.hora_inicio, c.hora_fin);
      });
    }

    const hora_total = calcularHoras(hora_entrada_calc, hora_salida_calc);
    const hora_trabajo = Math.max(0, hora_total - totalPausas);

    // Determinar tipo de hora (normal vs extra)
    const jornadaNormal = 8;
    const es_extra = hora_trabajo > jornadaNormal;

    // Crear la jornada con todas sus relaciones en una transacción
    const jornada = await prisma.registroJornada.create({
      data: {
        fecha: new Date(fecha + 'T12:00:00.000Z'), // Convertir a DateTime
        hora_entrada,
        hora_salida,
        observaciones,
        tecnicos: {
          create: tecnicos.map(t => ({
            id_tecnico: t.id_tecnico,
            hora_llegada: t.hora_llegada || hora_entrada,
            hora_salida: t.hora_salida || hora_salida,
            observaciones: t.observaciones
          }))
        },
        comidas: comidas && comidas.length > 0 ? {
          create: comidas.map(c => ({
            tipo: c.tipo,
            hora_inicio: c.hora_inicio,
            hora_fin: c.hora_fin
          }))
        } : undefined,
        segmentos: segmentos && segmentos.length > 0 ? {
          create: segmentos.map(s => ({
            id_orden: s.id_orden || null,
            descripcion: s.descripcion,
            hora_inicio: s.hora_inicio,
            hora_fin: s.hora_fin,
            tipo: s.tipo || 'normal'
          }))
        } : undefined
      },
      include: {
        tecnicos: { include: { tecnico: true } },
        comidas: true,
        segmentos: { include: { orden: { include: { cliente: true, local: true } } } }
      }
    });

    // También crear registros individuales en RegistroDiario para cada técnico
    // Esto mantiene compatibilidad con el sistema existente
    for (const tech of tecnicos) {
      const horaLlegada = tech.hora_llegada || hora_entrada;
      const horaSalida = tech.hora_salida || hora_salida;
      
      // Calcular pausas para este técnico
      let pausas = { desayuno: 0, almuerzo: 0, cena: 0 };
      if (comidas && comidas.length > 0) {
        comidas.forEach(c => {
          const h = calcularHoras(c.hora_inicio, c.hora_fin);
          if (c.tipo === 'desayuno') pausas.desayuno = h;
          else if (c.tipo === 'almuerzo') pausas.almuerzo = h;
          else if (c.tipo === 'cena') pausas.cena = h;
        });
      }

      // Calcular horas trabajadas para este técnico
      const horaTotalTech = calcularHoras(horaLlegada, horaSalida);
      const horaTrabajoTech = Math.max(0, horaTotalTech - (pausas.desayuno + pausas.almuerzo + pausas.cena));
      
      // Determinar normales y extras - siempre calcular extras si trabaja más de 8h
      let horas_normales = horaTrabajoTech;
      let horas_extras = 0;
      if (horaTrabajoTech > jornadaNormal) {
        horas_normales = jornadaNormal;
        horas_extras = horaTrabajoTech - jornadaNormal;
      }

      // Determinar si es fin de semana
      const fechaObj = new Date(fecha + 'T12:00:00.000Z');
      const diaSemana = fechaObj.getDay();
      const esFinSemana = diaSemana === 0 || diaSemana === 6;
      const fechaDate = new Date(fecha + 'T12:00:00.000Z');

      // Buscar si ya existe registro para este técnico en esta fecha
      const registroExistente = await prisma.registroDiario.findFirst({
        where: {
          id_tecnico: tech.id_tecnico,
          fecha: fechaDate
        }
      });

      if (registroExistente) {
        // Sumar horas al registro existente
        const nuevasHorasNormales = registroExistente.horas_normales + horas_normales;
        const nuevasHorasExtras = registroExistente.horas_extras + horas_extras;
        const nuevoHoraInicio = horaLlegada < registroExistente.hora_inicio_trabajo ? horaLlegada : registroExistente.hora_inicio_trabajo;
        const nuevoHoraFin = horaSalida > registroExistente.hora_fin_trabajo ? horaSalida : registroExistente.hora_fin_trabajo;

        await prisma.registroDiario.update({
          where: { id: registroExistente.id },
          data: {
            horas_normales: nuevasHorasNormales,
            horas_extras: nuevasHorasExtras,
            hora_inicio_trabajo: nuevoHoraInicio,
            hora_fin_trabajo: nuevoHoraFin,
            hora_almuerzo_inicio: comidas?.find(c => c.tipo === 'almuerzo')?.hora_inicio || registroExistente.hora_almuerzo_inicio,
            hora_almuerzo_fin: comidas?.find(c => c.tipo === 'almuerzo')?.hora_fin || registroExistente.hora_almuerzo_fin,
            hora_desayuno_inicio: comidas?.find(c => c.tipo === 'desayuno')?.hora_inicio || registroExistente.hora_desayuno_inicio,
            hora_desayuno_fin: comidas?.find(c => c.tipo === 'desayuno')?.hora_fin || registroExistente.hora_desayuno_fin,
            hora_cena_inicio: comidas?.find(c => c.tipo === 'cena')?.hora_inicio || registroExistente.hora_cena_inicio,
            hora_cena_fin: comidas?.find(c => c.tipo === 'cena')?.hora_fin || registroExistente.hora_cena_fin,
            horas_almuerzo: registroExistente.horas_almuerzo + pausas.almuerzo,
            horas_desayuno: registroExistente.horas_desayuno + pausas.desayuno,
            horas_cena: registroExistente.horas_cena + pausas.cena,
            observaciones: (registroExistente.observaciones || '') + '\n' + (observaciones || '')
          }
        });
      } else {
        // Crear nuevo registro diario para el técnico
        await prisma.registroDiario.create({
          data: {
            id_tecnico: tech.id_tecnico,
            fecha: fechaDate,
            hora_inicio_trabajo: horaLlegada,
            hora_fin_trabajo: horaSalida,
            hora_desayuno_inicio: comidas?.find(c => c.tipo === 'desayuno')?.hora_inicio || null,
            hora_desayuno_fin: comidas?.find(c => c.tipo === 'desayuno')?.hora_fin || null,
            hora_almuerzo_inicio: comidas?.find(c => c.tipo === 'almuerzo')?.hora_inicio || null,
            hora_almuerzo_fin: comidas?.find(c => c.tipo === 'almuerzo')?.hora_fin || null,
            hora_cena_inicio: comidas?.find(c => c.tipo === 'cena')?.hora_inicio || null,
            hora_cena_fin: comidas?.find(c => c.tipo === 'cena')?.hora_fin || null,
            horas_normales,
            horas_extras,
            horas_almuerzo: pausas.almuerzo,
            horas_desayuno: pausas.desayuno,
            horas_cena: pausas.cena,
            es_fin_semana: esFinSemana,
            estado_dia: 'completado',
            observaciones
          }
        });
      }
    }

    res.status(201).json(jornada);
  } catch (error) {
    console.error('Error creando jornada grupal:', error);
    res.status(500).json({ error: 'Error al crear jornada grupal', details: error.message });
  }
};

// Listar jornadas con filtros
const listarJornadas = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    const where = {};
    if (fecha_inicio || fecha_fin) {
      where.fecha = {};
      if (fecha_inicio) where.fecha.gte = new Date(fecha_inicio);
      if (fecha_fin) where.fecha.lte = new Date(fecha_fin);
    }

    const jornadas = await prisma.registroJornada.findMany({
      where,
      include: {
        tecnicos: { include: { tecnico: true } },
        comidas: true,
        segmentos: { include: { orden: { include: { cliente: true, local: true } } } }
      },
      orderBy: { fecha: 'desc' }
    });

    res.json(jornadas);
  } catch (error) {
    console.error('Error listando jornadas:', error);
    res.status(500).json({ error: 'Error al listar jornadas' });
  }
};

// Obtener jornada por ID
const obtenerJornada = async (req, res) => {
  try {
    const { id } = req.params;
    const jornada = await prisma.registroJornada.findUnique({
      where: { id: parseInt(id) },
      include: {
        tecnicos: { include: { tecnico: true } },
        comidas: true,
        segmentos: { include: { orden: { include: { cliente: true, local: true } } } }
      }
    });

    if (!jornada) {
      return res.status(404).json({ error: 'Jornada no encontrada' });
    }

    res.json(jornada);
  } catch (error) {
    console.error('Error obteniendo jornada:', error);
    res.status(500).json({ error: 'Error al obtener jornada' });
  }
};

// Actualizar jornada grupal
const actualizarJornada = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fecha,
      hora_entrada,
      hora_salida,
      observaciones,
      tecnicos,
      comidas,
      segmentos
    } = req.body;

    // Obtener jornada actual
    const jornadaActual = await prisma.registroJornada.findUnique({
      where: { id: parseInt(id) },
      include: { tecnicos: true, comidas: true, segmentos: true }
    });

    if (!jornadaActual) {
      return res.status(404).json({ error: 'Jornada no encontrada' });
    }

    // Eliminar relaciones existentes
    await prisma.tecnicoJornada.deleteMany({ where: { id_registro: parseInt(id) } });
    await prisma.comidaJornada.deleteMany({ where: { id_registro: parseInt(id) } });
    await prisma.segmentoTrabajo.deleteMany({ where: { id_registro: parseInt(id) } });

    // Calcular horas
    const hora_total = calcularHoras(hora_entrada, hora_salida);
    let totalPausas = 0;
    if (comidas && comidas.length > 0) {
      comidas.forEach(c => {
        totalPausas += calcularHoras(c.hora_inicio, c.hora_fin);
      });
    }
    const hora_trabajo = Math.max(0, hora_total - totalPausas);
    const jornadaNormal = 8;
    const es_extra = hora_trabajo > jornadaNormal;

    // Actualizar jornada
    const jornada = await prisma.registroJornada.update({
      where: { id: parseInt(id) },
      data: {
        fecha: fecha ? new Date(fecha) : jornadaActual.fecha,
        hora_entrada: hora_entrada || jornadaActual.hora_entrada,
        hora_salida: hora_salida || jornadaActual.hora_salida,
        observaciones,
        tecnicos: tecnicos && tecnicos.length > 0 ? {
          create: tecnicos.map(t => ({
            id_tecnico: t.id_tecnico,
            hora_llegada: t.hora_llegada || hora_entrada,
            hora_salida: t.hora_salida || hora_salida,
            observaciones: t.observaciones
          }))
        } : undefined,
        comidas: comidas && comidas.length > 0 ? {
          create: comidas.map(c => ({
            tipo: c.tipo,
            hora_inicio: c.hora_inicio,
            hora_fin: c.hora_fin
          }))
        } : undefined,
        segmentos: segmentos && segmentos.length > 0 ? {
          create: segmentos.map(s => ({
            id_orden: s.id_orden || null,
            descripcion: s.descripcion,
            hora_inicio: s.hora_inicio,
            hora_fin: s.hora_fin,
            tipo: s.tipo || 'normal'
          }))
        } : undefined
      },
      include: {
        tecnicos: { include: { tecnico: true } },
        comidas: true,
        segmentos: { include: { orden: { include: { cliente: true, local: true } } } }
      }
    });

    // Actualizar también los registros diarios
    // Primero eliminar los registros existentes de ese día para esos técnicos
    if (tecnicos && tecnicos.length > 0 && fecha) {
      const tecnicoIds = tecnicos.map(t => t.id_tecnico);
      await prisma.registroDiario.deleteMany({
        where: {
          fecha: { gte: new Date(fecha), lt: new Date(new Date(fecha).getTime() + 24*60*60*1000) },
          id_tecnico: { in: tecnicoIds }
        }
      });

      // Recalcular y recrear
      const jornadaNormal = 8;
      for (const tech of tecnicos) {
        const horaLlegada = tech.hora_llegada || hora_entrada;
        const horaSalida = tech.hora_salida || hora_salida;
        
        let pausas = { desayuno: 0, almuerzo: 0, cena: 0 };
        if (comidas && comidas.length > 0) {
          comidas.forEach(c => {
            const h = calcularHoras(c.hora_inicio, c.hora_fin);
            if (c.tipo === 'desayuno') pausas.desayuno = h;
            else if (c.tipo === 'almuerzo') pausas.almuerzo = h;
            else if (c.tipo === 'cena') pausas.cena = h;
          });
        }

        const horaTotalTech = calcularHoras(horaLlegada, horaSalida);
        const horaTrabajoTech = Math.max(0, horaTotalTech - (pausas.desayuno + pausas.almuerzo + pausas.cena));
        
        let horas_normales = horaTrabajoTech;
        let horas_extras = 0;
        if (horaTrabajoTech > jornadaNormal) {
          horas_normales = jornadaNormal;
          horas_extras = horaTrabajoTech - jornadaNormal;
        }

        const fechaObj = new Date(fecha);
        const diaSemana = fechaObj.getDay();
        const esFinSemana = diaSemana === 0 || diaSemana === 6;

        await prisma.registroDiario.create({
          data: {
            id_tecnico: tech.id_tecnico,
            fecha: new Date(fecha),
            hora_inicio_trabajo: horaLlegada,
            hora_fin_trabajo: horaSalida,
            hora_desayuno_inicio: comidas?.find(c => c.tipo === 'desayuno')?.hora_inicio || null,
            hora_desayuno_fin: comidas?.find(c => c.tipo === 'desayuno')?.hora_fin || null,
            hora_almuerzo_inicio: comidas?.find(c => c.tipo === 'almuerzo')?.hora_inicio || null,
            hora_almuerzo_fin: comidas?.find(c => c.tipo === 'almuerzo')?.hora_fin || null,
            hora_cena_inicio: comidas?.find(c => c.tipo === 'cena')?.hora_inicio || null,
            hora_cena_fin: comidas?.find(c => c.tipo === 'cena')?.hora_fin || null,
            horas_normales,
            horas_extras,
            horas_almuerzo: pausas.almuerzo,
            horas_desayuno: pausas.desayuno,
            horas_cena: pausas.cena,
            es_fin_semana: esFinSemana,
            estado_dia: 'completado',
            observaciones
          }
        });
      }
    }

    res.json(jornada);
  } catch (error) {
    console.error('Error actualizando jornada:', error);
    res.status(500).json({ error: 'Error al actualizar jornada' });
  }
};

// Eliminar jornada grupal
const eliminarJornada = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener la jornada para saber la fecha y técnicos
    const jornada = await prisma.registroJornada.findUnique({
      where: { id: parseInt(id) },
      include: { tecnicos: true }
    });

    if (!jornada) {
      return res.status(404).json({ error: 'Jornada no encontrada' });
    }

    // Eliminar registros diarios asociados
    if (jornada.tecnicos && jornada.tecnicos.length > 0) {
      const tecnicoIds = jornada.tecnicos.map(t => t.id_tecnico);
      await prisma.registroDiario.deleteMany({
        where: {
          fecha: { gte: jornada.fecha, lt: new Date(jornada.fecha.getTime() + 24*60*60*1000) },
          id_tecnico: { in: tecnicoIds }
        }
      });
    }

    // Eliminar la jornada (las relaciones se eliminan en cascada)
    await prisma.registroJornada.delete({ where: { id: parseInt(id) } });

    res.json({ message: 'Jornada eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando jornada:', error);
    res.status(500).json({ error: 'Error al eliminar jornada' });
  }
};

module.exports = {
  crearHora,
  listarHoras,
  obtenerHora,
  actualizarHora,
  eliminarHora,
  resumenDiario,
  resumenSemanal,
  resumenMensual,
  resumenCustom,
  horasPorTecnico,
  validarJornada,
  // Nuevos endpoints para jornadas grupales
  crearJornadaGrupo,
  listarJornadas,
  obtenerJornada,
  actualizarJornada,
  eliminarJornada
};