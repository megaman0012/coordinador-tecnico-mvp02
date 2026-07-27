/**
 * Script de Migración de Datos - SQLite a PostgreSQL
 * Sistema Coordinador Técnico MVP v3.0
 */

const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');

const sqliteDb = new Database('./prisma/dev.db');
const postgres = new PrismaClient();

// Mapeo de nombres de tabla a modelo Prisma y sus campos
const MIGRACIONES = {
  cliente: {
    modelo: 'Cliente',
    campos: ['nombre', 'ruc', 'telefono', 'email', 'direccion', 'tipo', 'estado']
  },
  representante: {
    modelo: 'Representante', 
    campos: ['nombre', 'cargo', 'telefono', 'email', 'id_cliente']
  },
  local: {
    modelo: 'Local',
    campos: ['nombre', 'direccion', 'ciudad', 'provincia', 'tipo', 'tipo_servicio', 'id_cliente']
  },
  tecnico: {
    modelo: 'Tecnico',
    campos: ['nombre', 'dni', 'telefono', 'email', 'especialidad', 'estado']
  },
  usuario: {
    modelo: 'Usuario',
    campos: ['email', 'password', 'nombre', 'rol', 'id_tecnico']
  },
  orden: {
    modelo: 'Orden',
    campos: ['numero_orden', 'tipo_trabajo', 'prioridad', 'descripcion', 'fecha_programada', 'estado', 'id_cliente', 'id_local', 'cantidad_tecnicos', 'horas_estimadas', 'facturable', 'estado_facturacion']
  },
  asignacion: {
    modelo: 'Asignacion',
    campos: ['id_orden', 'id_tecnico', 'fecha_asignacion', 'hora_inicio_programada', 'hora_fin_programada', 'estado']
  },
  registroDiario: {
    modelo: 'RegistroDiario',
    campos: ['id_tecnico', 'id_orden', 'id_asignacion', 'fecha', 'hora_inicio', 'hora_fin', 'horas_normales', 'horas_extras', 'horas_viaje', 'estado_dia', 'es_dia_libre', 'es_fin_semana']
  },
  factura: {
    modelo: 'Factura',
    campos: ['numero_factura', 'monto', 'estado', 'fecha_emision', 'fecha_vencimiento', 'fecha_pago', 'monto_pagado', 'observaciones', 'id_orden']
  },
  informeTecnico: {
    modelo: 'InformeTecnico',
    campos: ['id_orden', 'id_tecnico', 'contenido', 'fotos', 'estado', 'fecha_aprobacion']
  }
};

function mapValue(campo, valor) {
  if (valor === null || valor === undefined) return null;
  
  // Timestamps
  if (campo.includes('At')) {
    if (typeof valor === 'number') return new Date(valor * 1000);
    return new Date(valor);
  }
  
  // Booleanos
  if (['facturable', 'es_dia_libre', 'es_fin_semana'].includes(campo)) {
    return valor === 1 || valor === true || valor === '1' || valor === 'true';
  }
  
  return valor;
}

async function migrateOne(tabla, config) {
  const { modelo, campos } = config;
  const datos = sqliteDb.prepare(`SELECT * FROM ${tabla}`).all();
  if (datos.length === 0) return { tabla, insertados: 0, total: 0 };
  
  let insertados = 0;
  
  for (const dato of datos) {
    const datoMapeado = {};
    for (const campo of campos) {
      if (dato[campo] !== undefined) {
        datoMapeado[campo] = mapValue(campo, dato[campo]);
      }
    }
    
    try {
      await postgres[modelo].create({ data: datoMapeado });
      insertados++;
    } catch (err) {
      if (err.code !== 'P2002') {
        // Ignorar duplicados
      }
    }
  }
  
  return { tabla, insertados, total: datos.length };
}

async function main() {
  console.log('🚀 MIGRACIÓN SQLite → PostgreSQL\n');
  console.log('=====================================');
  
  // Migrar cada tabla
  const resultados = [];
  for (const [tabla, config] of Object.entries(MIGRACIONES)) {
    const resultado = await migrateOne(tabla, config);
    resultados.push(resultado);
    console.log(`  ✓ ${resultado.tabla}: ${resultado.insertados}/${resultado.total}`);
  }
  
  // Resumen
  console.log('\n=====================================');
  console.log('📊 RESUMEN FINAL');
  console.log('=====================================');
  
  let totalInsertados = 0;
  let totalRegistros = 0;
  
  for (const r of resultados) {
    console.log(`  ${r.tabla}: ${r.insertados}/${r.total}`);
    totalInsertados += r.insertados;
    totalRegistros += r.total;
  }
  
  console.log(`\n📈 Total: ${totalInsertados}/${totalRegistros} registros`);
  
  if (totalInsertados > 0) {
    console.log('\n✅ MIGRACIÓN COMPLETADA');
  } else {
    console.log('\n⚠️ No se migraron datos (posibles duplicados)');
  }
  
  sqliteDb.close();
  await postgres.$disconnect();
}

main();