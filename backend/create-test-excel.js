/**
 * Script para crear archivo Excel de prueba
 * Genera un archivo de prueba para importar órdenes
 */

const XLSX = require('xlsx');
const path = require('path');

// Datos de prueba (asegurarse que estos existen en la DB)
const datosPrueba = [
  {
    cliente: 'Lotería Nacional',
    local: 'Matriz Principal',
    tipo_trabajo: 'visita_tecnica',
    prioridad: 'media',
    descripcion: 'Mantenimiento preventivo',
    fecha_programada: '15/04/2026',
    hora_programada: '09:00',
    cantidad_tecnicos: 1,
    horas_estimadas: 2
  },
  {
    cliente: 'Lotería Nacional',
    local: 'Agencia Centro',
    tipo_trabajo: 'mantenimiento',
    prioridad: 'alta',
    descripcion: 'Reparación de equipos',
    fecha_programada: '16/04/2026',
    hora_programada: '10:30',
    cantidad_tecnicos: 2,
    horas_estimadas: 4
  }
];

// Crear workbook
const workbook = XLSX.utils.book_new();

// Crear worksheet con headers
const worksheet = XLSX.utils.json_to_sheet(datosPrueba);

// Agregar worksheet al workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Órdenes');

// Guardar archivo
const outputPath = path.join(__dirname, 'test_ordenes_import.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log(`✅ Archivo de prueba creado: ${outputPath}`);
console.log('Datos:');
console.log(JSON.stringify(datosPrueba, null, 2));
