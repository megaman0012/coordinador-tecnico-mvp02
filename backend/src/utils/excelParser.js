/**
 * Excel Parser - Módulo de Importación de Órdenes
 * Parsea archivos Excel (.xlsx) para importación de órdenes
 * 
 * @since 2026
 */

const XLSX = require('xlsx');

/**
 * Columnas esperadas en el Excel
 */
const COLUMNAS_ESPERADAS = [
  'cliente',
  'local',
  'tipo_trabajo',
  'prioridad',
  'descripcion',
  'fecha_programada',
  'hora_programada',
  'cantidad_tecnicos',
  'horas_estimadas'
];

/**
 * Columnas requeridas (obligatorias)
 */
const COLUMNAS_REQUERIDAS = ['cliente', 'local', 'tipo_trabajo'];

/**
 * Tipos de trabajo permitidos
 */
const TIPOS_TRABAJO_PERMITIDOS = [
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

/**
 * Prioridades permitidas
 */
const PRIORIDADES_PERMITIDAS = ['baja', 'media', 'alta', 'urgente'];

/**
 * Parsea un buffer de Excel y retorna un array de objetos
 * @param {Buffer} buffer - Buffer del archivo Excel
 * @returns {Object} Resultado con datos y metadatos
 */
function parseExcel(buffer) {
  try {
    // Leer workbook desde buffer
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      dateNF: 'dd/mm/yyyy'
    });

    // Obtener primera hoja
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convertir a JSON con headers
    const data = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
      blankrows: false
    });

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'El archivo Excel está vacío o no contiene datos'
      };
    }

    // Validar estructura de columnas
    const columnasExcel = Object.keys(data[0]);
    const columnasFaltantes = COLUMNAS_REQUERIDAS.filter(col => 
      !columnasExcel.some(c => c.toLowerCase() === col.toLowerCase())
    );

    if (columnasFaltantes.length > 0) {
      return {
        success: false,
        error: `Faltan columnas requeridas: ${columnasFaltantes.join(', ')}`,
        columnasEncontradas: columnasExcel,
        columnasEsperadas: COLUMNAS_ESPERADAS
      };
    }

    // Normalizar datos (convertir nombres de columnas a minúsculas)
    const datosNormalizados = data.map((fila, index) => {
      const filaNormalizada = {};
      
      Object.keys(fila).forEach(key => {
        const keyLower = key.toLowerCase().trim();
        filaNormalizada[keyLower] = fila[key];
      });

      // Agregar índice de fila (1-based para el usuario)
      filaNormalizada._fila = index + 2; // +2 porque la fila 1 es header y el array empieza en 0

      return filaNormalizada;
    });

    console.log(`[ExcelParser] Parseados ${datosNormalizados.length} registros del Excel`);

    return {
      success: true,
      data: datosNormalizados,
      totalFilas: datosNormalizados.length,
      columnas: columnasExcel
    };

  } catch (error) {
    console.error('[ExcelParser] Error parseando Excel:', error);
    return {
      success: false,
      error: `Error al parsear archivo Excel: ${error.message}`
    };
  }
}

/**
 * Valida el formato de fecha DD/MM/YYYY
 * @param {string} fechaStr - Fecha en formato string
 * @returns {Object} Resultado de validación
 */
function validarFormatoFecha(fechaStr) {
  if (!fechaStr || fechaStr === '') {
    return { valido: true, esVacio: true };
  }

  // Expresión regular para DD/MM/YYYY
  const regexFecha = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = fechaStr.toString().trim().match(regexFecha);

  if (!match) {
    return {
      valido: false,
      error: 'Formato inválido. Use DD/MM/YYYY (ej: 15/03/2026)'
    };
  }

  const [, dia, mes, año] = match;

  // Validar rangos
  const diaNum = parseInt(dia, 10);
  const mesNum = parseInt(mes, 10);
  const añoNum = parseInt(año, 10);

  if (diaNum < 1 || diaNum > 31) {
    return { valido: false, error: 'Día inválido (debe ser 1-31)' };
  }

  if (mesNum < 1 || mesNum > 12) {
    return { valido: false, error: 'Mes inválido (debe ser 1-12)' };
  }

  if (añoNum < 2020 || añoNum > 2100) {
    return { valido: false, error: 'Año inválido (debe ser 2020-2100)' };
  }

  // Retornar objeto Date
  const fecha = new Date(añoNum, mesNum - 1, diaNum);

  return {
    valido: true,
    fecha: fecha,
    fechaStr: `${añoNum}-${mesNum.toString().padStart(2, '0')}-${diaNum.toString().padStart(2, '0')}`
  };
}

/**
 * Valida el formato de hora HH:mm
 * @param {string} horaStr - Hora en formato string
 * @returns {Object} Resultado de validación
 */
function validarFormatoHora(horaStr) {
  if (!horaStr || horaStr === '') {
    return { valido: true, esVacio: true };
  }

  // Expresión regular para HH:mm (formato 24h)
  const regexHora = /^(\d{1,2}):(\d{2})$/;
  const match = horaStr.toString().trim().match(regexHora);

  if (!match) {
    return {
      valido: false,
      error: 'Formato inválido. Use HH:mm (ej: 09:00 o 14:30)'
    };
  }

  const [, hora, minuto] = match;
  const horaNum = parseInt(hora, 10);
  const minutoNum = parseInt(minuto, 10);

  if (horaNum < 0 || horaNum > 23) {
    return { valido: false, error: 'Hora inválida (debe ser 0-23)' };
  }

  if (minutoNum < 0 || minutoNum > 59) {
    return { valido: false, error: 'Minuto inválido (debe ser 0-59)' };
  }

  return {
    valido: true,
    hora: `${horaNum.toString().padStart(2, '0')}:${minutoNum.toString().padStart(2, '0')}`
  };
}

/**
 * Convierte valor a número
 * @param {any} valor - Valor a convertir
 * @returns {number} Número o valor por defecto
 */
function parsearNumero(valor, defecto = 1) {
  if (valor === undefined || valor === null || valor === '') {
    return defecto;
  }

  const num = parseInt(valor, 10);
  return isNaN(num) ? defecto : num;
}

module.exports = {
  parseExcel,
  validarFormatoFecha,
  validarFormatoHora,
  parsearNumero,
  COLUMNAS_ESPERADAS,
  COLUMNAS_REQUERIDAS,
  TIPOS_TRABAJO_PERMITIDOS,
  PRIORIDADES_PERMITIDAS
};
