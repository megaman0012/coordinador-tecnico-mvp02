/**
 * Servicio de Importación de Órdenes - Módulo Completo
 * Maneja las fases de validación y ejecución de importación desde Excel
 * 
 * @since 2026
 */

const { PrismaClient } = require('@prisma/client');
const prisma = require('../db');
const { parseExcel, validarFormatoFecha, validarFormatoHora, parsearNumero } = require('../utils/excelParser');
const { validarFila, calcularFacturable } = require('../utils/validacionesOrden');
const { logger } = require('../utils/logger');

// Contador en memoria para números de orden (se resetea al iniciar el servicio)
let contadorOrden = null;

/**
 * Genera un número de orden automático en formato ORD-YYYY-XXXX
 * @returns {Promise<string>} Número de orden generado
 */
async function generarNumeroOrden() {
  const año = new Date().getFullYear();
  
  // Si no hay contador inicializado, buscar el máximo ID actual
  if (contadorOrden === null) {
    const ultimoOrden = await prisma.orden.findFirst({
      orderBy: { id: 'desc' }
    });
    contadorOrden = ultimoOrden ? ultimoOrden.id : 0;
  }
  
  // Incrementar contador para siguiente orden
  contadorOrden++;
  
  const numeroOrden = `ORD-${año}-${contadorOrden.toString().padStart(4, '0')}`;
  
  console.log(`[ImportOrdenes] Generado número de orden: ${numeroOrden} (contador: ${contadorOrden})`);
  
  return numeroOrden;
}

/**
 * Fase 1: Validar Excel - NO inserta datos
 * @param {Buffer} buffer - Buffer del archivo Excel
 * @returns {Promise<Object>} Resultado de validación
 */
async function validarExcel(buffer) {
  const inicio = Date.now();
  
  console.log('[ImportOrdenes] =========================================');
  console.log('[ImportOrdenes] INICIANDO VALIDACIÓN DE IMPORTACIÓN');
  console.log('[ImportOrdenes] =========================================');

  try {
    // 1. Parsear Excel
    console.log('[ImportOrdenes] Paso 1: Parseando archivo Excel...');
    const resultadoParseo = parseExcel(buffer);
    
    if (!resultadoParseo.success) {
      return {
        success: false,
        total: 0,
        validos: 0,
        errores: 1,
        puede_importar: false,
        detalles: [{
          fila: 0,
          campo: 'archivo',
          mensaje: resultadoParseo.error
        }]
      };
    }

    const datos = resultadoParseo.data;
    const total = datos.length;
    
    console.log(`[ImportOrdenes] Total de filas a validar: ${total}`);

    // 2. Validar cada fila
    const detalles = [];
    let validos = 0;
    let errores = 0;

    for (const fila of datos) {
      const resultado = await validarFila(fila);
      
      if (resultado.valida) {
        validos++;
        console.log(`[ImportOrdenes] Fila ${resultado.fila}: ✓ Válida`);
      } else {
        errores++;
        console.log(`[ImportOrdenes] Fila ${resultado.fila}: ✗ Inválida`);
        
        // Agregar cada error como detalle
        resultado.errores.forEach(err => {
          detalles.push({
            fila: resultado.fila,
            campo: err.campo,
            mensaje: err.mensaje
          });
        });
      }
    }

    const puedeImportar = errores === 0;
    
    console.log('[ImportOrdenes] =========================================');
    console.log(`[ImportOrdenes] RESULTADO VALIDACIÓN:`);
    console.log(`[ImportOrdenes]   Total: ${total}`);
    console.log(`[ImportOrdenes]   Válidos: ${validos}`);
    console.log(`[ImportOrdenes]   Errores: ${errores}`);
    console.log(`[ImportOrdenes]   Puede importar: ${puedeImportar ? 'SÍ' : 'NO'}`);
    console.log('[ImportOrdenes] =========================================');

    const duracion = Date.now() - inicio;
    console.log(`[ImportOrdenes] Validación completada en ${duracion}ms`);

    return {
      success: true,
      total,
      validos,
      errores,
      puede_importar: puedeImportar,
      detalles,
      message: puedeImportar 
        ? 'El archivo es válido y puede ser importado' 
        : 'El archivo contiene errores. Corrígelos antes de importar.',
      duracion_ms: duracion
    };

  } catch (error) {
    console.error('[ImportOrdenes] ERROR en validación:', error);
    logger.error('validarExcel', 'Error en validación de importación', { error: error.message });
    
    return {
      success: false,
      total: 0,
      validos: 0,
      errores: 1,
      puede_importar: false,
      detalles: [{
        fila: 0,
        campo: 'sistema',
        mensaje: `Error interno: ${error.message}`
      }]
    };
  }
}

/**
 * Fase 2: Ejecutar Importación - Inserta datos en DB
 * @param {Buffer} buffer - Buffer del archivo Excel
 * @returns {Promise<Object>} Resultado de importación
 */
async function ejecutarImportacion(buffer) {
  const inicio = Date.now();
  
  console.log('[ImportOrdenes] =========================================');
  console.log('[ImportOrdenes] INICIANDO EJECUCIÓN DE IMPORTACIÓN');
  console.log('[ImportOrdenes] =========================================');

  // Primero hacer validación fuera de la transacción
  console.log('[ImportOrdenes] Paso 1: Validando archivo...');
  const resultadoValidacion = await validarExcel(buffer);
  
  if (!resultadoValidacion.success || !resultadoValidacion.puede_importar) {
    return {
      success: false,
      message: 'La validación falló. No se puede proceder con la importación.',
      detalles: resultadoValidacion.detalles
    };
  }

  // Parsear Excel
  console.log('[ImportOrdenes] Paso 2: Parseando archivo Excel...');
  const resultadoParseo = parseExcel(buffer);
  
  if (!resultadoParseo.success) {
    return {
      success: false,
      message: `Error al parsear Excel: ${resultadoParseo.error}`
    };
  }

  const datos = resultadoParseo.data;
  const total = datos.length;

  // Pre-generar TODOS los números de orden ANTES de la transacción
  console.log(`[ImportOrdenes] Paso 3: Generando ${total} números de orden...`);
  const numerosOrden = [];
  for (let i = 0; i < total; i++) {
    numerosOrden.push(await generarNumeroOrden());
  }

  // Ahora ejecutar la transacción con los números pre-generados
  const transaction = await prisma.$transaction(async (tx) => {
    const ordenesInsertadas = [];
    const erroresInsert = [];

    console.log(`[ImportOrdenes] Paso 4: Insertando ${total} órdenes en DB...`);

    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i];
      const numeroOrden = numerosOrden[i];

      try {
        // Validar fila
        const resultado = await validarFila(fila);
        
        if (!resultado.valida) {
          erroresInsert.push({
            fila: fila._fila,
            mensaje: 'Validación fallida: ' + resultado.errores.map(e => e.mensaje).join(', ')
          });
          continue;
        }

        // Insertar orden
        const orden = await tx.orden.create({
          data: {
            numero_orden: numeroOrden,
            id_cliente: resultado.datos.id_cliente,
            id_local: resultado.datos.id_local,
            tipo_trabajo: resultado.datos.tipo_trabajo,
            prioridad: resultado.datos.prioridad,
            descripcion: resultado.datos.descripcion,
            fecha_programada: resultado.datos.fecha_programada,
            hora_programada: resultado.datos.hora_programada,
            cantidad_tecnicos: resultado.datos.cantidad_tecnicos,
            horas_estimadas: resultado.datos.horas_estimadas,
            facturable: resultado.datos.facturable,
            estado: 'pendiente'
          }
        });

        // Registrar en historial
        await tx.historialOrden.create({
          data: {
            id_orden: orden.id,
            accion: 'creado',
            estado_nuevo: 'pendiente',
            motivo: 'Orden creada por importación desde Excel',
            usuario: 'sistema_importacion'
          }
        });

        ordenesInsertadas.push({
          id: orden.id,
          numero_orden: orden.numero_orden,
          fila: fila._fila
        });

        console.log(`[ImportOrdenes] Fila ${fila._fila}: ✓ Insertada orden ${orden.numero_orden}`);

      } catch (errorFila) {
        console.error(`[ImportOrdenes] Fila ${fila._fila}: ERROR:`, errorFila.message);
        erroresInsert.push({
          fila: fila._fila,
          mensaje: errorFila.message
        });
      }
    }

    // Verificar si todas las inserciones fueron exitosas
    if (erroresInsert.length > 0) {
      throw new Error(`Error en ${erroresInsert.length} filas durante la inserción`);
    }

    return { ordenesInsertadas, erroresInsert };
  });

  const duracion = Date.now() - inicio;
  
  console.log('[ImportOrdenes] =========================================');
  console.log(`[ImportOrdenes] RESULTADO IMPORTACIÓN:`);
  console.log(`[ImportOrdenes]   Total procesadas: ${total}`);
  console.log(`[ImportOrdenes]   Insertadas: ${transaction.ordenesInsertadas.length}`);
  console.log(`[ImportOrdenes]   Errores: ${transaction.erroresInsert.length}`);
  console.log('[ImportOrdenes] =========================================');
  console.log(`[ImportOrdenes] Importación completada en ${duracion}ms`);

  return {
    success: true,
    total_procesadas: total,
    insertadas: transaction.ordenesInsertadas.length,
    errores: transaction.erroresInsert.length,
    detalles: transaction.ordenesInsertadas,
    message: `Se importaron exitosamente ${transaction.ordenesInsertadas.length} órdenes`,
    duracion_ms: duracion
  };
}

/**
 * Obtiene los datos validados cacheados (para ejecutar después de validar)
 * Esta función se usa en memoria durante el flujo validar → ejecutar
 */
let cacheValidacion = null;

/**
 * Cachea los resultados de validación para uso posterior
 * @param {Object} resultado - Resultado de validación
 */
function cachearValidacion(resultado) {
  cacheValidacion = resultado;
}

/**
 * Obtiene la validación cacheada
 * @returns {Object|null} Resultado de validación cacheado
 */
function obtenerValidacionCache() {
  return cacheValidacion;
}

/**
 * Limpia el cache de validación
 */
function limpiarCache() {
  cacheValidacion = null;
}

module.exports = {
  generarNumeroOrden,
  validarExcel,
  ejecutarImportacion,
  cachearValidacion,
  obtenerValidacionCache,
  limpiarCache
};
