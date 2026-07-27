/**
 * Controlador de Informes Técnicos - MVP Coordinador Técnico
 * Gestión de informes técnicos asociados a asignaciones y órdenes
 */

const { PrismaClient } = require('@prisma/client');
const prisma = require('../db');

// ==================== CRUD BÁSICO ====================

// Crear informe técnico
const crearInforme = async (req, res) => {
  try {
    const {
      id_orden,
      id_tecnico,
      id_asignacion,
      descripcion_trabajo,
      materiales_usados,
      estado_equipo,
      recomendaciones,
      proximo_mantenimiento,
      firma_cliente,
      nombre_cliente,
      cedula_cliente,
      fotos
    } = req.body;

    const informe = await prisma.informeTecnico.create({
      data: {
        id_orden: parseInt(id_orden),
        id_tecnico: parseInt(id_tecnico),
        id_asignacion: id_asignacion ? parseInt(id_asignacion) : null,
        descripcion_trabajo,
        materiales_usados,
        estado_equipo,
        recomendaciones,
        proximo_mantenimiento: proximo_mantenimiento ? new Date(proximo_mantenimiento) : null,
        firma_cliente,
        nombre_cliente,
        cedula_cliente,
        fotos: fotos ? JSON.stringify(fotos) : null,
        estado: 'pendiente',
        fecha_informe: new Date()
      }
    });

    res.status(201).json(informe);
  } catch (error) {
    console.error('Error creando informe:', error);
    res.status(500).json({ error: 'Error al crear el informe técnico' });
  }
};

// Listar informes con filtros y paginación
const listarInformes = async (req, res) => {
  try {
    const { id_tecnico, id_orden, estado, page = 1, limit = 50, busqueda, fecha_inicio, fecha_fin } = req.query;
    
    const where = {};
    if (id_tecnico) where.id_tecnico = parseInt(id_tecnico);
    if (id_orden) where.id_orden = parseInt(id_orden);
    if (estado) where.estado = estado;

    // Filtro por rango de fechas
    if (fecha_inicio || fecha_fin) {
      where.fecha_informe = {};
      if (fecha_inicio) where.fecha_informe.gte = new Date(fecha_inicio);
      if (fecha_fin) {
        const fin = new Date(fecha_fin);
        fin.setHours(23, 59, 59, 999);
        where.fecha_informe.lte = fin;
      }
    }

    // Búsqueda avanzada por texto (número de orden, local, técnico)
    if (busqueda) {
      where.OR = [
        { orden: { numero_orden: { contains: busqueda, mode: 'insensitive' } } },
        { orden: { local: { nombre: { contains: busqueda, mode: 'insensitive' } } } },
        { orden: { cliente: { nombre: { contains: busqueda, mode: 'insensitive' } } } },
        { tecnico: { nombre: { contains: busqueda, mode: 'insensitive' } } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Máximo 100 por página
    const skip = (pageNum - 1) * limitNum;

    // Usar Promise.all para ejecutar contador y consulta en paralelo
    const [total, informes] = await Promise.all([
      prisma.informeTecnico.count({ where }),
      prisma.informeTecnico.findMany({
        where,
        include: {
          orden: {
            select: { 
              id: true,
              numero_orden: true,
              cliente: { 
                select: { 
                  id: true,
                  nombre: true
                }
              }, 
              local: { 
                select: { 
                  id: true,
                  nombre: true
                } 
              } 
            }
          },
          tecnico: {
            select: { 
              id: true,
              nombre: true
            }
          }
        },
        orderBy: { fecha_informe: 'desc' },
        skip,
        take: limitNum
      })
    ]);

    res.json({ 
      success: true, 
      data: informes,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error listando informes:', error);
    res.status(500).json({ success: false, message: 'Error al listar informes técnicos' });
  }
};

// Obtener informe por ID
const obtenerInforme = async (req, res) => {
  try {
    const { id } = req.params;
    const informe = await prisma.informeTecnico.findUnique({
      where: { id: parseInt(id) },
      include: {
        orden: {
          include: { 
            cliente: { 
              include: { representantes: true }
            }, 
            local: true 
          }
        },
        tecnico: true,
        asignacion: true
      }
    });

    if (!informe) {
      return res.status(404).json({ error: 'Informe técnico no encontrado' });
    }

    res.json({ success: true, data: informe });
  } catch (error) {
    console.error('Error obteniendo informe:', error);
    res.status(500).json({ error: 'Error al obtener el informe técnico' });
  }
};

// Actualizar informe
const actualizarInforme = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const informe = await prisma.informeTecnico.update({
      where: { id: parseInt(id) },
      data: {
        ...data,
        id_orden: data.id_orden ? parseInt(data.id_orden) : undefined,
        id_tecnico: data.id_tecnico ? parseInt(data.id_tecnico) : undefined,
        id_asignacion: data.id_asignacion ? parseInt(data.id_asignacion) : undefined,
        proximo_mantenimiento: data.proximo_mantenimiento ? new Date(data.proximo_mantenimiento) : undefined,
        fotos: data.fotos ? JSON.stringify(data.fotos) : undefined,
        nombre_cliente: data.nombre_cliente !== undefined ? data.nombre_cliente : undefined,
        cedula_cliente: data.cedula_cliente !== undefined ? data.cedula_cliente : undefined
      }
    });

    res.json({ success: true, data: informe });
  } catch (error) {
    console.error('Error actualizando informe:', error);
    res.status(500).json({ error: 'Error al actualizar el informe técnico' });
  }
};

// Eliminar informe
const eliminarInforme = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.informeTecnico.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Informe técnico eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando informe:', error);
    res.status(500).json({ error: 'Error al eliminar el informe técnico' });
  }
};

// ==================== ENDPOINT ESPECIAL ====================

// Completar asignación con informe técnico
// Este endpoint crea el informe Y marca la asignación como completada
// También actualiza la orden relacionada
const completarConInforme = async (req, res) => {
  try {
    const {
      id_asignacion,
      id_orden,
      id_tecnico,
      descripcion_trabajo,
      materiales_usados,
      estado_equipo,
      recomendaciones,
      proximo_mantenimiento,
      firma_cliente,
      nombre_cliente,
      cedula_cliente,
      fotos
    } = req.body;

    // Validar que la asignación existe y está pendiente
    const asignacion = await prisma.asignacion.findUnique({
      where: { id: parseInt(id_asignacion) }
    });

    if (!asignacion) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    if (asignacion.estado === 'completado') {
      return res.status(400).json({ error: 'La asignación ya está completada' });
    }

    // Iniciar transacción para atomicidad
    const resultado = await prisma.$transaction(async (prisma) => {
      // 1. Crear el informe técnico
      const informe = await prisma.informeTecnico.create({
        data: {
          id_orden: parseInt(id_orden),
          id_tecnico: parseInt(id_tecnico),
          id_asignacion: parseInt(id_asignacion),
          descripcion_trabajo,
          materiales_usados,
          estado_equipo,
          recomendaciones,
          proximo_mantenimiento: proximo_mantenimiento ? new Date(proximo_mantenimiento) : null,
          firma_cliente,
          nombre_cliente,
          cedula_cliente,
          fotos: fotos ? JSON.stringify(fotos) : null,
          estado: 'pendiente',
          fecha_informe: new Date()
        }
      });

      // 2. Marcar asignación como completada
      await prisma.asignacion.update({
        where: { id: parseInt(id_asignacion) },
        data: {
          estado: 'completado',
          fecha_asignacion_real: new Date()
        }
      });

      // 3. Actualizar la orden
      await prisma.orden.update({
        where: { id: parseInt(id_orden) },
        data: {
          informe_adjunto: true,
          estado_informe: 'pendiente',
          estado: 'completada',
          fecha_resolucion: new Date(),
          resolucion: descripcion_trabajo
        }
      });

      return informe;
    });

    res.status(201).json({
      message: 'Asignación completada con informe técnico',
      informe: resultado
    });
  } catch (error) {
    console.error('Error completando con informe:', error);
    res.status(500).json({ error: 'Error al completar la asignación con informe' });
  }
};

// ==================== CONSULTAS ESPECIALES ====================

// Obtener informes por orden
const informesPorOrden = async (req, res) => {
  try {
    const { id_orden } = req.params;
    
    const informes = await prisma.informeTecnico.findMany({
      where: { id_orden: parseInt(id_orden) },
      include: {
        tecnico: true,
        asignacion: true,
        orden: {
          include: { 
            cliente: { 
              include: { representantes: true }
            }, 
            local: true 
          }
        }
      },
      orderBy: { fecha_informe: 'desc' }
    });

    res.json({ success: true, data: informes });
  } catch (error) {
    console.error('Error obteniendo informes por orden:', error);
    res.status(500).json({ success: false, message: 'Error al obtener informes de la orden' });
  }
};

// Obtener informes por técnico
const informesPorTecnico = async (req, res) => {
  try {
    const { id_tecnico } = req.params;
    
    const informes = await prisma.informeTecnico.findMany({
      where: { id_tecnico: parseInt(id_tecnico) },
      include: {
        orden: {
          include: { 
            cliente: { 
              include: { representantes: true }
            }, 
            local: true 
          }
        },
        asignacion: true
      },
      orderBy: { fecha_informe: 'desc' }
    });

    res.json({ success: true, data: informes });
  } catch (error) {
    console.error('Error obteniendo informes por técnico:', error);
    res.status(500).json({ success: false, message: 'Error al obtener informes del técnico' });
  }
};

// Obtener informes del técnico logueado (para técnicos)
const informesDelTecnico = async (req, res) => {
  try {
    const { page = 1, limit = 50, estado } = req.query;
    const tecnicoId = req.user.tecnicoId;

    if (!tecnicoId) {
      return res.status(400).json({ error: 'No se encontró ID de técnico asociado al usuario' });
    }

    const where = { id_tecnico: tecnicoId };
    if (estado) where.estado = estado;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const [total, informes] = await Promise.all([
      prisma.informeTecnico.count({ where }),
      prisma.informeTecnico.findMany({
        where,
        include: {
          orden: {
            select: { 
              id: true,
              numero_orden: true,
              cliente: { 
                select: { 
                  id: true,
                  nombre: true
                }
              }, 
              local: { 
                select: { 
                  id: true,
                  nombre: true
                } 
              } 
            }
          }
        },
        orderBy: { fecha_informe: 'desc' },
        skip,
        take: limitNum
      })
    ]);

    res.json({ 
      success: true, 
      data: informes,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error obteniendo informes del técnico:', error);
    res.status(500).json({ success: false, message: 'Error al obtener informes del técnico' });
  }
};

// Actualizar estado de informe (para técnicos: solo pueden reenviar rechazados)
const actualizarEstadoInformeTecnico = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const tecnicoId = req.user.tecnicoId;

    // Verificar que el informe pertenece al técnico
    const informe = await prisma.informeTecnico.findUnique({
      where: { id: parseInt(id) }
    });

    if (!informe) {
      return res.status(404).json({ error: 'Informe no encontrado' });
    }

    if (informe.id_tecnico !== tecnicoId) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este informe' });
    }

    // Técnicos solo pueden reenviar informes rechazados
    if (estado === 'pendiente' && informe.estado === 'rechazado') {
      await prisma.informeTecnico.update({
        where: { id: parseInt(id) },
        data: { estado: 'pendiente' }
      });
      return res.json({ success: true, message: 'Informe reenviado correctamente' });
    }

    return res.status(403).json({ error: 'No tienes permiso para esta acción' });
  } catch (error) {
    console.error('Error actualizando estado de informe:', error);
    res.status(500).json({ error: 'Error al actualizar el estado del informe' });
  }
};

// Aprobar/rechazar informe (solo coordinadores/admins)
const actualizarEstadoInforme = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['pendiente', 'enviado', 'aprobado', 'rechazado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const informe = await prisma.informeTecnico.update({
      where: { id: parseInt(id) },
      data: { estado }
    });

    // Si se aprueba, actualizar también la orden
    if (estado === 'aprobado') {
      await prisma.orden.update({
        where: { id: informe.id_orden },
        data: { estado_informe: 'aprobado' }
      });
    }

    res.json({ success: true, data: informe });
  } catch (error) {
    console.error('Error actualizando estado de informe:', error);
    res.status(500).json({ error: 'Error al actualizar el estado del informe' });
  }
};

module.exports = {
  crearInforme,
  listarInformes,
  obtenerInforme,
  actualizarInforme,
  eliminarInforme,
  completarConInforme,
  informesPorOrden,
  informesPorTecnico,
  actualizarEstadoInforme,
  informesDelTecnico,
  actualizarEstadoInformeTecnico
};