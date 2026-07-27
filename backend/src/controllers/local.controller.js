/**
 * Controlador de Locales - MVP Coordinador Técnico
 */

const { PrismaClient } = require('@prisma/client');
const prisma = require('../db');

// Crear local
const crearLocal = async (req, res) => {
  try {
    const { id_cliente, nombre, direccion, ciudad, provincia } = req.body;

    // Validar campos obligatorios
    if (!id_cliente) {
      return res.status(400).json({ error: 'Debe seleccionar un cliente' });
    }
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const local = await prisma.local.create({
      data: {
        id_cliente: parseInt(id_cliente),
        nombre: nombre.trim(),
        direccion: direccion?.trim() || null,
        ciudad: ciudad?.trim() || null,
        provincia: provincia?.trim() || null
      }
    });
    res.status(201).json(local);
  } catch (error) {
    console.error('Error creando local:', error);
    res.status(500).json({ error: 'Error al crear local' });
  }
};

// Listar locales
const listarLocales = async (req, res) => {
  try {
    const { id_cliente, ciudad, estado } = req.query;
    const where = {};
    if (id_cliente) where.id_cliente = parseInt(id_cliente);
    if (ciudad) where.ciudad = ciudad;
    if (estado) where.estado = estado;

    const locales = await prisma.local.findMany({
      where,
      include: { cliente: true },
      orderBy: { nombre: 'asc' }
    });
    res.json({ success: true, data: locales });
  } catch (error) {
    console.error('Error listando locales:', error);
    res.status(500).json({ error: 'Error al listar locales' });
  }
};

// Obtener local
const obtenerLocal = async (req, res) => {
  try {
    const { id } = req.params;
    const local = await prisma.local.findUnique({
      where: { id: parseInt(id) },
      include: { cliente: true, tareas: true }
    });
    if (!local) return res.status(404).json({ error: 'Local no encontrado' });
    res.json({ success: true, data: local });
  } catch (error) {
    console.error('Error obteniendo local:', error);
    res.status(500).json({ error: 'Error al obtener local' });
  }
};

// Actualizar local
const actualizarLocal = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_cliente, nombre, direccion, ciudad, provincia, tipo, tipo_servicio } = req.body;
    
    const local = await prisma.local.update({
      where: { id: parseInt(id) },
      data: {
        id_cliente: id_cliente ? parseInt(id_cliente) : undefined,
        nombre: nombre?.trim(),
        direccion: direccion?.trim() || null,
        ciudad: ciudad?.trim() || null,
        provincia: provincia?.trim() || null,
        tipo,
        tipo_servicio
      }
    });
    res.json(local);
  } catch (error) {
    console.error('Error actualizando local:', error);
    res.status(500).json({ error: 'Error al actualizar local' });
  }
};

// Eliminar local
const eliminarLocal = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.local.update({
      where: { id: parseInt(id) },
      data: { estado: 'inactivo' }
    });
    res.json({ message: 'Local desactivado' });
  } catch (error) {
    console.error('Error eliminando local:', error);
    res.status(500).json({ error: 'Error al eliminar local' });
  }
};

// Exportar locales a Excel
const exportarLocales = async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const locales = await prisma.local.findMany({
      include: { cliente: true },
      orderBy: { nombre: 'asc' }
    });

    // Generar datos para Excel
    const datos = locales.map(l => ({
      'ID': l.id,
      'Nombre del Local': l.nombre,
      'Dirección': l.direccion || '',
      'Ciudad': l.ciudad || '',
      'Provincia': l.provincia || '',
      'Tipo': l.tipo || '',
      'Tipo de Servicio': l.tipo_servicio || '',
      'Cliente': l.cliente?.nombre || '',
      'Estado': l.estado
    }));

    const XLSX = require('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Locales');
    
    // Ajustar anchos de columnas
    const cols = Object.keys(datos[0] || {}).map(k => ({ wch: Math.max(k.length + 5, 20) }));
    worksheet['!cols'] = cols;

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=locales_export.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error exportando locales:', error);
    res.status(500).json({ error: 'Error al exportar locales' });
  }
};

// Importar locales desde Excel
const importarLocales = async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    if (!req.file) {
      return res.status(400).json({ error: 'Debe subir un archivo Excel' });
    }

    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const datos = XLSX.utils.sheet_to_json(sheet);

    if (!datos || datos.length === 0) {
      return res.status(400).json({ error: 'El archivo está vacío' });
    }

    const resultados = { exitosos: 0, errores: [], duplicados: 0 };
    const localesCreados = [];

    for (const fila of datos) {
      try {
        // Buscar cliente por nombre
        let id_cliente = fila['ID Cliente'] || fila['id_cliente'];
        
        if (!id_cliente && fila['Cliente']) {
          const cliente = await prisma.cliente.findFirst({
            where: { nombre: { contains: fila['Cliente'] } }
          });
          id_cliente = cliente?.id;
        }

        if (!id_cliente) {
          resultados.errores.push({ fila, error: 'Cliente no encontrado' });
          continue;
        }

        // Verificar si ya existe el local (por nombre y cliente)
        const localExistente = await prisma.local.findFirst({
          where: {
            nombre: fila['Nombre del Local'] || fila['nombre'],
            id_cliente: parseInt(id_cliente)
          }
        });

        if (localExistente) {
          resultados.duplicados++;
          continue;
        }

        const local = await prisma.local.create({
          data: {
            id_cliente: parseInt(id_cliente),
            nombre: (fila['Nombre del Local'] || fila['nombre'] || '').trim(),
            direccion: (fila['Dirección'] || fila['direccion'] || '').trim() || null,
            ciudad: (fila['Ciudad'] || fila['ciudad'] || '').trim() || null,
            provincia: (fila['Provincia'] || fila['provincia'] || '').trim() || null,
            tipo: (fila['Tipo'] || fila['tipo'] || 'Local - PDVLL').trim(),
            tipo_servicio: (fila['Tipo de Servicio'] || fila['tipo_servicio'] || 'no_aplica').trim(),
            estado: 'activo'
          }
        });

        localesCreados.push(local);
        resultados.exitosos++;
      } catch (err) {
        resultados.errores.push({ fila, error: err.message });
      }
    }

    res.json({
      message: `Importación completada: ${resultados.exitosos} locales creados, ${resultados.duplicados} duplicados, ${resultados.errores.length} errores`,
      ...resultados,
      localesCreados
    });
  } catch (error) {
    console.error('Error importando locales:', error);
    res.status(500).json({ error: 'Error al importar locales: ' + error.message });
  }
};

module.exports = { 
  crearLocal, 
  listarLocales, 
  obtenerLocal, 
  actualizarLocal, 
  eliminarLocal,
  exportarLocales,
  importarLocales
};