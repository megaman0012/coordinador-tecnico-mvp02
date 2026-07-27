/**
 * Servicio de Plantilla e Importación de Inventario
 * Sistema basado en plantilla simple
 */

const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const prisma = require('../db');

// ==================== GENERAR PLANTILLA ====================

const generarPlantilla = () => {
  // Crear workbook nuevo
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Coordinador Técnico';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Inventario');

  // Definir columnas
  const columnas = [
    { header: 'id_externo', key: 'id_externo', width: 15 },
    { header: 'tipo_local', key: 'tipo_local', width: 12 },
    { header: 'nombre_local', key: 'nombre_local', width: 30 },
    { header: 'cliente', key: 'cliente', width: 20 },
    { header: 'provincia', key: 'provincia', width: 15 },
    { header: 'ciudad', key: 'ciudad', width: 15 },
    { header: 'tipo_monitoreo', key: 'tipo_monitoreo', width: 18 },
    { header: 'estado_operativo', key: 'estado_operativo', width: 15 },
    { header: 'fecha_implementacion', key: 'fecha_implementacion', width: 20 },
    { header: 'fecha_cierre', key: 'fecha_cierre', width: 15 },
    { header: 'direccion', key: 'direccion', width: 35 },
    { header: 'gps', key: 'gps', width: 20 },
    { header: 'horario_apertura', key: 'horario_apertura', width: 15 },
    { header: 'horario_cierre', key: 'horario_cierre', width: 15 },
    { header: 'ip_1', key: 'ip_1', width: 15 },
    { header: 'ip_2', key: 'ip_2', width: 15 },
    { header: 'ip_3', key: 'ip_3', width: 15 },
    { header: 'contacto', key: 'contacto', width: 20 },
    { header: 'correo', key: 'correo', width: 25 },
    { header: 'tipo_sistema', key: 'tipo_sistema', width: 15 },
    { header: 'categoria', key: 'categoria', width: 15 },
    { header: 'cantidad', key: 'cantidad', width: 10 },
    { header: 'marca', key: 'marca', width: 15 },
    { header: 'detalle', key: 'detalle', width: 20 },
  ];

  worksheet.columns = columnas;

  // Fila de ejemplo
  worksheet.addRow({
    id_externo: '001',
    tipo_local: 'PDVLL',
    nombre_local: 'NOMBRE DEL LOCAL',
    cliente: 'LOTERIA NACIONAL',
    provincia: 'GUAYAS',
    ciudad: 'GUAYAQUIL',
    tipo_monitoreo: 'VISUAL 24/7',
    estado_operativo: 'OPERATIVO',
    fecha_implementacion: '2024-01-15',
    fecha_cierre: '',
    direccion: 'Av. Principal 123',
    gps: '-2.1894, -79.8891',
    horario_apertura: '08:00',
    horario_cierre: '22:00',
    ip_1: '192.168.1.100',
    ip_2: '',
    ip_3: '',
    contacto: 'Juan Pérez',
    correo: 'juan@ejemplo.com',
    tipo_sistema: 'CCTV',
    categoria: 'camara',
    cantidad: 4,
    marca: 'DT360',
    detalle: ''
  });

  // Estilar header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  return workbook;
};

// ==================== IMPORTAR DESDE PLANTILLA ====================

/**
 * Valida una fila de inventario
 */
const validarFila = (fila, numeroFila) => {
  const errores = [];

  if (!fila.id_externo || String(fila.id_externo).trim() === '') {
    errores.push(`Fila ${numeroFila}: id_externo es obligatorio`);
  }
  if (!fila.nombre_local || String(fila.nombre_local).trim() === '') {
    errores.push(`Fila ${numeroFila}: nombre_local es obligatorio`);
  }
  if (!fila.tipo_sistema || String(fila.tipo_sistema).trim() === '') {
    errores.push(`Fila ${numeroFila}: tipo_sistema es obligatorio`);
  }
  if (!fila.categoria || String(fila.categoria).trim() === '') {
    errores.push(`Fila ${numeroFila}: categoria es obligatorio`);
  }

  // Validar cantidad sea número válido
  const cantidad = parseInt(fila.cantidad);
  if (isNaN(cantidad) || cantidad < 0) {
    errores.push(`Fila ${numeroFila}: cantidad debe ser un número válido`);
  }

  // Validar tipo_sistema válido
  const sistemasValidos = ['CCTV', 'ALARMA', 'HUMO', 'ACCESO'];
  if (fila.tipo_sistema && !sistemasValidos.includes(String(fila.tipo_sistema).toUpperCase())) {
    errores.push(`Fila ${numeroFila}: tipo_sistema debe ser uno de: ${sistemasValidos.join(', ')}`);
  }

  return errores;
};

/**
 * Convierte valor a número o null
 */
const toNumber = (valor) => {
  if (valor === undefined || valor === null || valor === '') return null;
  const num = parseInt(valor);
  return isNaN(num) ? null : num;
};

/**
 * Convierte valor a fecha o null
 */
const toDate = (valor) => {
  if (!valor) return null;
  // Si es string con formato fecha
  if (typeof valor === 'string') {
    const fecha = new Date(valor);
    return isNaN(fecha.getTime()) ? null : fecha;
  }
  // Si es número (Excel date serial)
  if (typeof valor === 'number') {
    const fecha = new Date(Math.round((valor - 25569) * 86400 * 1000));
    return isNaN(fecha.getTime()) ? null : fecha;
  }
  return null;
};

/**
 * Limpia valor de texto
 */
const cleanText = (valor) => {
  if (valor === undefined || valor === null) return null;
  const text = String(valor).trim();
  return text === '' ? null : text;
};

/**
 * Importa inventario desde plantilla
 */
const importarDesdePlantilla = async (buffer) => {
  const resultado = {
    success: true,
    insertados: 0,
    duplicados: 0,
    errores: [],
    logs: [],
  };

  try {
    // 1. Leer Excel
    resultado.logs.push('📖 Leyendo archivo Excel...');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Verificar que exista la hoja Inventario
    if (!workbook.SheetNames.includes('Inventario')) {
      throw new Error('El archivo no contiene la hoja "Inventario". Use la plantilla oficial.');
    }

    const sheet = workbook.Sheets['Inventario'];
    const datos = XLSX.utils.sheet_to_json(sheet);

    if (datos.length === 0) {
      throw new Error('El archivo no contiene datos');
    }

    resultado.logs.push(`   ${datos.length} filas encontradas`);

    // 2. Obtener registros existentes
    resultado.logs.push('🔍 Verificando registros existentes...');
    const existentes = await prisma.inventario.findMany({
      select: { 
        id_externo: true, 
        nombre_local: true,
        tipo_sistema: true, 
        categoria: true 
      }
    });

    const existenteSet = new Set(
      existentes.map(e => 
        `${e.id_externo}|${e.nombre_local}|${e.tipo_sistema}|${e.categoria}`.toLowerCase()
      )
    );
    resultado.logs.push(`   ${existenteSet.size} registros previos`);

    // 3. Procesar cada fila
    resultado.logs.push('⚙️ Procesando filas...');
    
    let insertados = 0;
    let duplicados = 0;
    const errores = [];

    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i];
      const numeroFila = i + 2; // +2 por encabezado y índice 0

      // Validar campos obligatorios
      const erroresFila = validarFila(fila, numeroFila);
      if (erroresFila.length > 0) {
        errores.push(...erroresFila);
        continue;
      }

      // Verificar duplicado
      const clave = `${fila.id_externo}|${fila.nombre_local}|${fila.tipo_sistema}|${fila.categoria}`.toLowerCase();
      if (existenteSet.has(clave)) {
        duplicados++;
        resultado.logs.push(`   ⚠️ Fila ${numeroFila}: duplicado ignorado (${fila.nombre_local} - ${fila.tipo_sistema}/${fila.categoria})`);
        continue;
      }

      // Preparar datos para insertar
      const data = {
        id_externo: cleanText(fila.id_externo),
        tipo_local: cleanText(fila.tipo_local) || 'PDVLL',
        nombre_local: cleanText(fila.nombre_local),
        cliente: cleanText(fila.cliente) || 'LOTERIA NACIONAL',
        provincia: cleanText(fila.provincia),
        ciudad: cleanText(fila.ciudad),
        tipo_monitoreo: cleanText(fila.tipo_monitoreo),
        estado_operativo: cleanText(fila.estado_operativo) || 'OPERATIVO',
        fecha_implementacion: toDate(fila.fecha_implementacion),
        fecha_cierre: toDate(fila.fecha_cierre),
        direccion: cleanText(fila.direccion),
        gps: cleanText(fila.gps),
        horario_apertura: cleanText(fila.horario_apertura),
        horario_cierre: cleanText(fila.horario_cierre),
        ip_1: cleanText(fila.ip_1),
        ip_2: cleanText(fila.ip_2),
        ip_3: cleanText(fila.ip_3),
        contacto: cleanText(fila.contacto),
        correo: cleanText(fila.correo),
        tipo_sistema: cleanText(fila.tipo_sistema)?.toUpperCase(),
        categoria: cleanText(fila.categoria)?.toLowerCase(),
        cantidad: toNumber(fila.cantidad) || 0,
        marca: cleanText(fila.marca),
        detalle: fila.detalle ? JSON.parse(fila.detalle) : {},
      };

      try {
        await prisma.inventario.create({ data });
        insertados++;
        existenteSet.add(clave); // Agregar al set para evitar duplicados en misma importación
        resultado.logs.push(`   ✅ Fila ${numeroFila}: insertado (${data.nombre_local} - ${data.tipo_sistema}/${data.categoria})`);
      } catch (error) {
        errores.push(`Fila ${numeroFila}: Error al insertar - ${error.message}`);
        resultado.logs.push(`   ❌ Fila ${numeroFila}: ${error.message}`);
      }
    }

    resultado.insertados = insertados;
    resultado.duplicados = duplicados;
    resultado.errores = errores;

    resultado.logs.push('');
    resultado.logs.push('📊 RESUMEN:');
    resultado.logs.push(`   ✅ Insertados: ${insertados}`);
    resultado.logs.push(`   ⚠️ Duplicados: ${duplicados}`);
    resultado.logs.push(`   ❌ Errores: ${errores.length}`);

  } catch (error) {
    resultado.success = false;
    resultado.errores.push(error.message);
    resultado.logs.push(`❌ Error: ${error.message}`);
  }

  return resultado;
};

module.exports = {
  generarPlantilla,
  importarDesdePlantilla,
};