/**
 * Validaciones de Órdenes - Módulo de Importación
 * Validadores específicos para la importación de órdenes desde Excel
 * 
 * @since 2026
 */

const { PrismaClient } = require('@prisma/client');
const prisma = require('../db');

/**
 * Valida que un cliente existe en la base de datos por nombre exacto
 * @param {string} nombreCliente - Nombre del cliente
 * @returns {Object} Resultado de validación
 */
async function validarCliente(nombreCliente) {
  if (!nombreCliente || nombreCliente.trim() === '') {
    return {
      valido: false,
      error: 'El nombre del cliente es requerido'
    };
  }

  try {
    const cliente = await prisma.cliente.findFirst({
      where: {
        nombre: {
          equals: nombreCliente.trim(),
          mode: 'insensitive'
        },
        estado: 'activo'
      },
      select: { id: true, nombre: true }
    });

    if (!cliente) {
      return {
        valido: false,
        error: `Cliente no encontrado: "${nombreCliente}"`,
        codigo: 'CLIENTE_NO_EXISTE'
      };
    }

    return {
      valido: true,
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre
      }
    };

  } catch (error) {
    console.error('[Validaciones] Error validando cliente:', error);
    return {
      valido: false,
      error: 'Error al validar cliente en base de datos'
    };
  }
}

/**
 * Valida que un local existe en la base de datos y pertenece al cliente
 * @param {string} nombreLocal - Nombre del local
 * @param {number} idCliente - ID del cliente
 * @returns {Object} Resultado de validación
 */
async function validarLocal(nombreLocal, idCliente) {
  if (!nombreLocal || nombreLocal.trim() === '') {
    return {
      valido: false,
      error: 'El nombre del local es requerido'
    };
  }

  try {
    const local = await prisma.local.findFirst({
      where: {
        nombre: {
          equals: nombreLocal.trim(),
          mode: 'insensitive'
        },
        id_cliente: idCliente,
        estado: 'activo'
      },
      select: { id: true, nombre: true, id_cliente: true }
    });

    if (!local) {
      return {
        valido: false,
        error: `Local no encontrado: "${nombreLocal}" para el cliente especificado`,
        codigo: 'LOCAL_NO_EXISTE'
      };
    }

    return {
      valido: true,
      local: {
        id: local.id,
        nombre: local.nombre,
        id_cliente: local.id_cliente
      }
    };

  } catch (error) {
    console.error('[Validaciones] Error validando local:', error);
    return {
      valido: false,
      error: 'Error al validar local en base de datos'
    };
  }
}

/**
 * Valida que el tipo de trabajo es permitido
 * @param {string} tipoTrabajo - Tipo de trabajo
 * @returns {Object} Resultado de validación
 */
function validarTipoTrabajo(tipoTrabajo) {
  const TIPOS_PERMITIDOS = [
    'visita_tecnica',
    'instalacion',
    'mantenimiento',
    'reparacion',
    'correctivo',
    'preventivo',
    'implementacion',
    'proyecto',
    'capacitacion',
    'garantia'
  ];

  if (!tipoTrabajo || tipoTrabajo.trim() === '') {
    return {
      valido: false,
      error: 'El tipo de trabajo es requerido'
    };
  }

  const tipoNormalizado = tipoTrabajo.toLowerCase().trim();

  if (!TIPOS_PERMITIDOS.includes(tipoNormalizado)) {
    return {
      valido: false,
      error: `Tipo de trabajo inválido: "${tipoTrabajo}". Valores permitidos: ${TIPOS_PERMITIDOS.join(', ')}`,
      codigo: 'TIPO_TRABAJO_INVALIDO'
    };
  }

  return {
    valido: true,
    tipo_trabajo: tipoNormalizado
  };
}

/**
 * Valida que la prioridad es permitida
 * @param {string} prioridad - Prioridad
 * @returns {Object} Resultado de validación
 */
function validarPrioridad(prioridad) {
  const PRIORIDADES_PERMITIDAS = ['baja', 'media', 'alta', 'urgente'];

  // Si no se especifica, usar valor por defecto
  if (!prioridad || prioridad.trim() === '') {
    return {
      valido: true,
      prioridad: 'media',
      porDefecto: true
    };
  }

  const prioridadNormalizada = prioridad.toLowerCase().trim();

  if (!PRIORIDADES_PERMITIDAS.includes(prioridadNormalizada)) {
    return {
      valido: false,
      error: `Prioridad inválida: "${prioridad}". Valores permitidos: ${PRIORIDADES_PERMITIDAS.join(', ')}`,
      codigo: 'PRIORIDAD_INVALIDA'
    };
  }

  return {
    valido: true,
    prioridad: prioridadNormalizada
  };
}

/**
 * Detecta duplicados: cliente + local + fecha_programada
 * @param {number} idCliente - ID del cliente
 * @param {number} idLocal - ID del local
 * @param {Date} fechaProgramada - Fecha programada
 * @returns {Object} Resultado de validación
 */
async function detectarDuplicado(idCliente, idLocal, fechaProgramada) {
  try {
    // Si no hay fecha programada, no hay duplicado
    if (!fechaProgramada) {
      return { valido: true, esDuplicado: false };
    }

    // Normalizar fecha (solo fecha, sin hora)
    const fechaIni = new Date(fechaProgramada);
    fechaIni.setHours(0, 0, 0, 0);
    
    const fechaFin = new Date(fechaProgramada);
    fechaFin.setHours(23, 59, 59, 999);

    const ordenExistente = await prisma.orden.findFirst({
      where: {
        id_cliente: idCliente,
        id_local: idLocal,
        fecha_programada: {
          gte: fechaIni,
          lte: fechaFin
        },
        estado: {
          notIn: ['completada', 'no_cumplida', 'cancelada']
        }
      },
      select: {
        id: true,
        numero_orden: true,
        fecha_programada: true
      }
    });

    if (ordenExistente) {
      return {
        valido: false,
        esDuplicado: true,
        error: `Ya existe una orden activa para este cliente, local y fecha (${ordenExistente.numero_orden})`,
        codigo: 'DUPLICADO',
        ordenExistente: {
          id: ordenExistente.id,
          numero: ordenExistente.numero_orden
        }
      };
    }

    return { valido: true, esDuplicado: false };

  } catch (error) {
    console.error('[Validaciones] Error detectando duplicado:', error);
    return { valido: true, esDuplicado: false }; // En caso de error, permitir
  }
}

/**
 * Aplica valores por defecto
 * @param {Object} datos - Datos de la fila
 * @returns {Object} Datos con valores por defecto aplicados
 */
function aplicarValoresPorDefecto(datos) {
  return {
    prioridad: datos.prioridad || 'media',
    cantidad_tecnicos: datos.cantidad_tecnicos || 1,
    horas_estimadas: datos.horas_estimadas || 1,
    descripcion: datos.descripcion || ''
  };
}

/**
 * Calcula si la orden es facturable según el tipo de trabajo
 * @param {string} tipoTrabajo - Tipo de trabajo
 * @returns {boolean} true si es facturable
 */
function calcularFacturable(tipoTrabajo) {
  // Las órdenes de garantía no son facturables
  if (tipoTrabajo === 'garantia') {
    return false;
  }
  
  // El resto de tipos son facturables
  return true;
}

/**
 * Valida una fila completa del Excel
 * @param {Object} fila - Datos de la fila
 * @returns {Object} Resultado de validación
 */
async function validarFila(fila) {
  const errores = [];

  // 1. Validar cliente (requerido)
  const resultadoCliente = await validarCliente(fila.cliente);
  if (!resultadoCliente.valido) {
    errores.push({
      campo: 'cliente',
      mensaje: resultadoCliente.error
    });
    return {
      valida: false,
      errores,
      fila: fila._fila
    };
  }

  // 2. Validar local (requerido) - necesita ID del cliente
  const resultadoLocal = await validarLocal(fila.local, resultadoCliente.cliente.id);
  if (!resultadoLocal.valido) {
    errores.push({
      campo: 'local',
      mensaje: resultadoLocal.error
    });
    return {
      valida: false,
      errores,
      fila: fila._fila
    };
  }

  // 3. Validar tipo_trabajo (requerido)
  const resultadoTipo = validarTipoTrabajo(fila.tipo_trabajo);
  if (!resultadoTipo.valido) {
    errores.push({
      campo: 'tipo_trabajo',
      mensaje: resultadoTipo.error
    });
    return {
      valida: false,
      errores,
      fila: fila._fila
    };
  }

  // 4. Validar prioridad (opcional, con defecto)
  const resultadoPrioridad = validarPrioridad(fila.prioridad);
  if (!resultadoPrioridad.valido) {
    errores.push({
      campo: 'prioridad',
      mensaje: resultadoPrioridad.error
    });
    return {
      valida: false,
      errores,
      fila: fila._fila
    };
  }

  // 5. Validar fecha_programada (opcional)
  let fechaProgramada = null;
  if (fila.fecha_programada && fila.fecha_programada !== '') {
    const { parseExcel, validarFormatoFecha } = require('./excelParser');
    const resultadoFecha = validarFormatoFecha(fila.fecha_programada);
    
    if (!resultadoFecha.valido) {
      errores.push({
        campo: 'fecha_programada',
        mensaje: resultadoFecha.error
      });
    } else {
      fechaProgramada = resultadoFecha.fecha;
    }
  }

  // 6. Validar hora_programada (opcional)
  let horaProgramada = null;
  if (fila.hora_programada && fila.hora_programada !== '') {
    const { validarFormatoHora } = require('./excelParser');
    const resultadoHora = validarFormatoHora(fila.hora_programada);
    
    if (!resultadoHora.valido) {
      errores.push({
        campo: 'hora_programada',
        mensaje: resultadoHora.error
      });
    } else {
      horaProgramada = resultadoHora.hora;
    }
  }

  // 7. Validar cantidad_tecnicos (opcional, número)
  let cantidadTecnicos = 1;
  if (fila.cantidad_tecnicos !== undefined && fila.cantidad_tecnicos !== '') {
    const parsed = parseInt(fila.cantidad_tecnicos, 10);
    if (isNaN(parsed) || parsed < 1) {
      errores.push({
        campo: 'cantidad_tecnicos',
        mensaje: 'Debe ser un número positivo'
      });
    } else {
      cantidadTecnicos = parsed;
    }
  }

  // 8. Validar horas_estimadas (opcional, número)
  let horasEstimadas = 1;
  if (fila.horas_estimadas !== undefined && fila.horas_estimadas !== '') {
    const parsed = parseInt(fila.horas_estimadas, 10);
    if (isNaN(parsed) || parsed < 1) {
      errores.push({
        campo: 'horas_estimadas',
        mensaje: 'Debe ser un número positivo'
      });
    } else {
      horasEstimadas = parsed;
    }
  }

  // 9. Detectar duplicado (cliente + local + fecha)
  if (fechaProgramada) {
    const resultadoDuplicado = await detectarDuplicado(
      resultadoCliente.cliente.id,
      resultadoLocal.local.id,
      fechaProgramada
    );
    
    if (!resultadoDuplicado.valido) {
      errores.push({
        campo: 'fecha_programada',
        mensaje: resultadoDuplicado.error
      });
    }
  }

  // Si hay errores, retornar
  if (errores.length > 0) {
    return {
      valida: false,
      errores,
      fila: fila._fila
    };
  }

  // Retornar datos validados y normalizados
  return {
    valida: true,
    fila: fila._fila,
    datos: {
      id_cliente: resultadoCliente.cliente.id,
      id_local: resultadoLocal.local.id,
      tipo_trabajo: resultadoTipo.tipo_trabajo,
      prioridad: resultadoPrioridad.prioridad,
      descripcion: fila.descripcion || '',
      fecha_programada: fechaProgramada,
      hora_programada: horaProgramada,
      cantidad_tecnicos: cantidadTecnicos,
      horas_estimadas: horasEstimadas,
      facturable: calcularFacturable(resultadoTipo.tipo_trabajo)
    }
  };
}

module.exports = {
  validarCliente,
  validarLocal,
  validarTipoTrabajo,
  validarPrioridad,
  detectarDuplicado,
  aplicarValoresPorDefecto,
  calcularFacturable,
  validarFila
};
