/**
 * Servicio de Importación de Inventario desde Excel
 * Procesa múltiples hojas y crea registros en la tabla inventario
 */

const XLSX = require('xlsx');
const prisma = require('../db');

// Logger simple
const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`),
};

// ==================== UTILIDADES ====================

/**
 * Convierte valor de celda a número
 * "●" = 1, valores vacíos = 0
 */
const parseCantidad = (valor) => {
  if (valor === undefined || valor === null || valor === '') return 0;
  if (valor === '●' || valor === '● ') return 1;
  if (typeof valor === 'number') return valor;
  const num = parseInt(valor);
  return isNaN(num) ? 0 : num;
};

/**
 * Limpia valor de celda
 */
const cleanValue = (valor) => {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor === 'string') {
    // Limpiar valores como #VALUE!, ###
    if (valor.startsWith('#') || valor === 'N/A') return null;
    return valor.trim();
  }
  return valor;
};

/**
 * Convierte fecha Excel a Date
 */
const parseFecha = (valor) => {
  if (!valor) return null;
  // Excel stores dates as serial numbers
  if (typeof valor === 'number') {
    // Date serial to JavaScript date
    const date = new Date(Math.round((valor - 25569) * 86400 * 1000));
    return date;
  }
  return valor;
};

/**
 * Convierte hora Excel (como fracción del día) a string HH:MM
 */
const parseHora = (valor) => {
  if (!valor || typeof valor !== 'number') return null;
  const hours = Math.floor(valor * 24);
  const minutes = Math.floor((valor * 24 - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// ==================== MAPEO DE DATOS ====================

// Mapeo de hojas a tipo de sistema
const SHEET_TO_SISTEMA = {
  'ALARMA': 'ALARMA',
  'CCTV': 'CCTV',
  'HUMO': 'HUMO',
  'CA': 'ACCESO',
};

// Columnas por tipo de sistema
const SISTEMA_COLUMNAS = {
  'ALARMA': [
    { nombre: 'SISTEMAS', categoria: 'sistema', cantidad: 'CANT' },
    { nombre: 'CABLEADO', categoria: 'cableado', cantidad: 'CANT' },
    { nombre: 'INALAMBRICO', categoria: 'inalambrico', cantidad: 'CANT1' },
    { nombre: 'EXP CABLEADO', categoria: 'exp_cableado', cantidad: 'CANT2' },
    { nombre: 'EXP INALAMBRICO', categoria: 'exp_inalambrico', cantidad: 'CANT3' },
    { nombre: 'BP', categoria: 'panel', cantidad: 'CANT4' },
    { nombre: 'SM', categoria: 'sensor_movimiento', cantidad: 'CANT5' },
    { nombre: 'SH', categoria: 'sensor_humo', cantidad: 'CANT6' },
    { nombre: 'CM', categoria: 'contacto_magnetico', cantidad: 'CANT7' },
  ],
  'CCTV': [
    { nombre: 'NVR', categoria: 'nvr', cantidad: 'CANT' },
    { nombre: 'MODELO', categoria: 'modelo', cantidad: 'CANT2' },
    { nombre: 'CÁMARA', categoria: 'camara', cantidad: 'CANT' },
    { nombre: 'SWITCH', categoria: 'switch', cantidad: 'CANT3' },
    { nombre: 'AMPLIFICADOR', categoria: 'amplificador', cantidad: 'CANT4' },
    { nombre: 'CARGADOR', categoria: 'cargador', cantidad: 'CANT5' },
    { nombre: 'CABLE RCA', categoria: 'cable_rca', cantidad: 'CANT6' },
    { nombre: 'BOCINA', categoria: 'bocina', cantidad: 'CANT7' },
  ],
  'HUMO': [
    { nombre: 'HUMO', categoria: 'deteccion_humo', cantidad: 'CANT' },
    { nombre: 'BOTON', categoria: 'boton_emergencia', cantidad: 'CANT' },
  ],
  'ACCESO': [
    { nombre: 'SISTEMAS', categoria: 'sistema', cantidad: 'CANT' },
    { nombre: 'PANEL', categoria: 'panel', cantidad: 'CANT' },
    { nombre: 'CERRADURA', categoria: 'cerradura', cantidad: 'CANT2' },
    { nombre: 'LECTORA', categoria: 'lectora', cantidad: 'CANT3' },
    { nombre: 'BOTON', categoria: 'boton_salida', cantidad: 'CANT4' },
    { nombre: 'SIRENA', categoria: 'sirena', cantidad: 'CANT5' },
    { nombre: 'CONEXION ALARMA', categoria: 'conexion_alarma', cantidad: 'CANT' },
  ],
};

// ==================== PROCESAMIENTO ====================

/**
 * Lee un archivo Excel y devuelve las hojas procesadas
 */
const leerExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const result = {};

  for (const [sheetName, sheet] of Object.entries(workbook.Sheets)) {
    if (['MASTER', 'ALARMA', 'CCTV', 'HUMO', 'CA', 'INFORMACION'].includes(sheetName)) {
      result[sheetName] = XLSX.utils.sheet_to_json(sheet);
    }
  }

  return result;
};

/**
 * Extrae datos base del local desde MASTER
 */
const procesarMaster = (datos) => {
  const locales = {};

  for (const row of datos) {
    const id = String(row['ID'] || '').trim();
    if (!id) continue;

    const nombre = cleanValue(row['NOMBRE']) || '';
    const tipo = cleanValue(row['TIPO']) || 'PDVLL';
    
    locales[id] = {
      id_externo: id,
      tipo_local: tipo,
      nombre_local: nombre,
      cliente: 'LOTERIA NACIONAL',
      provincia: cleanValue(row['PROVINCIA']),
      ciudad: cleanValue(row['CIUDAD']),
      tipo_monitoreo: cleanValue(row['TIPO DE\r\nMONITOREO'] || row['TIPO DE\nMONITOREO']),
      estado_operativo: cleanValue(row['ESTADO']),
      fecha_implementacion: parseFecha(row['FECHA\r\nIMPLEMENTACION'] || row['FECHA\nIMPLEMENTACION']),
      fecha_cierre: parseFecha(row['FECHA\r\nCIERRE'] || row['FECHA\nCIERRE']),
      observacion: cleanValue(row['OBSERVACION']),
    };
  }

  return locales;
};

/**
 * Procesa información adicional del local
 */
const procesarInformacion = (datos, locales) => {
  for (const row of datos) {
    const id = String(row['ID'] || '').trim();
    if (!id || !locales[id]) continue;

    const local = locales[id];
    local.direccion = cleanValue(row['DIRECCION']);
    local.gps = cleanValue(row['UBICACIÓN GPS'] || row['UBICACIÓN GPS']);
    local.horario_apertura = parseHora(row['HORARIO\r\nAPERTURA'] || row['HORARIO\nAPERTURA']);
    local.horario_cierre = parseHora(row['HORARIO\r\nCIERRE'] || row['HORARIO\nCIERRE']);
    local.ip_1 = cleanValue(row['DIRECCIÓN IP']);
    local.ip_2 = cleanValue(row['DIRECCIÓN IP 2']);
    local.ip_3 = cleanValue(row['DIRECCIÓN IP 3']);
    local.contacto = cleanValue(row['CONTACTO']);
    local.correo = cleanValue(row['CORREO']);
  }

  return locales;
};

/**
 * Procesa hoja de sistema y genera registros de inventario
 */
const procesarHojaSistema = (datos, tipoSistema, locales, existenteIds) => {
  const columnas = SISTEMA_COLUMNAS[tipoSistema];
  const registros = [];

  for (const row of datos) {
    const id = String(row['ID'] || '').trim();
    if (!id || !locales[id]) continue;

    const local = locales[id];

    for (const col of columnas) {
      const marca = cleanValue(row[col.nombre]);
      const cantidad = parseCantidad(row[col.cantidad]);

      if (cantidad > 0 && marca) {
        // Crear clave única para evitar duplicados
        const uniqueKey = `${id}|${tipoSistema}|${col.categoria}`;
        
        if (!existenteIds.has(uniqueKey)) {
          registros.push({
            id_externo: id,
            tipo_local: local.tipo_local,
            nombre_local: local.nombre_local,
            cliente: local.cliente,
            provincia: local.provincia,
            ciudad: local.ciudad,
            tipo_monitoreo: local.tipo_monitoreo,
            estado_operativo: local.estado_operativo,
            fecha_implementacion: local.fecha_implementacion,
            fecha_cierre: local.fecha_cierre,
            observacion: local.observacion,
            direccion: local.direccion,
            gps: local.gps,
            horario_apertura: local.horario_apertura,
            horario_cierre: local.horario_cierre,
            ip_1: local.ip_1,
            ip_2: local.ip_2,
            ip_3: local.ip_3,
            contacto: local.contacto,
            correo: local.correo,
            tipo_sistema: tipoSistema,
            categoria: col.categoria,
            cantidad: cantidad,
            marca: marca,
          });
          existenteIds.add(uniqueKey);
        }
      }
    }
  }

  return registros;
};

/**
 * Importa inventario desde archivo Excel
 */
const importarInventario = async (buffer) => {
  const resultado = {
    success: true,
    insertados: 0,
    duplicados: 0,
    errores: 0,
    logs: [],
    detalle: [],
  };

  try {
    // 1. Leer Excel
    resultado.logs.push('📖 Leyendo archivo Excel...');
    const hojas = leerExcel(buffer);

    // 2. Obtener registros existentes para evitar duplicados
    resultado.logs.push('🔍 Verificando registros existentes...');
    const existentes = await prisma.inventario.findMany({
      select: { id_externo: true, tipo_sistema: true, categoria: true }
    });
    
    const existenteIds = new Set(
      existentes.map(e => `${e.id_externo}|${e.tipo_sistema}|${e.categoria}`)
    );
    resultado.logs.push(`   Encontrados ${existenteIds.size} registros previos`);

    // 3. Procesar MASTER (datos base)
    resultado.logs.push('🏠 Procesando datos de locales (MASTER)...');
    const locales = procesarMaster(hojas['MASTER'] || []);
    resultado.logs.push(`   ${Object.keys(locales).length} locales procesados`);

    // 4. Procesar INFORMACION
    resultado.logs.push('📍 Procesando información adicional...');
    procesarInformacion(hojas['INFORMACION'] || [], locales);

    // 5. Procesar cada hoja de sistema
    const hojasSistema = ['ALARMA', 'CCTV', 'HUMO', 'CA'];
    const todosRegistros = [];

    for (const hoja of hojasSistema) {
      if (hojas[hoja]) {
        const tipoSistema = SHEET_TO_SISTEMA[hoja];
        resultado.logs.push(`⚙️ Procesando ${tipoSistema}...`);
        
        const registros = procesarHojaSistema(
          hojas[hoja], 
          tipoSistema, 
          locales, 
          existenteIds
        );
        
        resultado.logs.push(`   ${registros.length} registros nuevos`);
        todosRegistros.push(...registros);
      }
    }

    // 6. Insertar en base de datos (en lotes)
    resultado.logs.push(`💾 Insertando ${todosRegistros.length} registros...`);
    
    const batchSize = 100;
    let insertados = 0;
    let duplicados = 0;

    for (let i = 0; i < todosRegistros.length; i += batchSize) {
      const batch = todosRegistros.slice(i, i + batchSize);
      
      // Intentar insertar cada registro individualmente para manejar duplicados
      for (const registro of batch) {
        try {
          await prisma.inventario.create({
            data: registro
          });
          insertados++;
        } catch (error) {
          if (error.code === 'P2002') {
            duplicados++;
          } else {
            resultado.logs.push(`   ❌ Error: ${registro.nombre_local} - ${error.message}`);
          }
        }
      }
    }

    resultado.insertados = insertados;
    resultado.duplicados = duplicados;
    resultado.logs.push(`✅ Importación completada: ${insertados} insertados, ${duplicados} duplicados ignorados`);

  } catch (error) {
    resultado.success = false;
    resultado.errores++;
    resultado.logs.push(`❌ Error general: ${error.message}`);
    console.error('Error importando inventario:', error);
  }

  return resultado;
};

module.exports = {
  leerExcel,
  procesarMaster,
  procesarInformacion,
  procesarHojaSistema,
  importarInventario,
};