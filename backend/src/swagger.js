/**
 * Configuración de Swagger - MVP Coordinador Técnico
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Coordinador Técnico',
      version: '1.0.0',
      description: 'API REST para el sistema de gestión de técnicos y órdenes de trabajo',
      contact: {
        name: 'Equipo de Desarrollo'
      }
    },
    servers: [
      {
        url: 'http://localhost:3002/api',
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        // Entidades
        Cliente: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            nombre: { type: 'string' },
            ruc: { type: 'string' },
            telefono: { type: 'string' },
            email: { type: 'string' },
            direccion: { type: 'string' },
            tipo: { type: 'string', enum: ['empresa', 'persona'] },
            estado: { type: 'string', enum: ['activo', 'inactivo'] }
          }
        },
        Local: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            id_cliente: { type: 'integer' },
            nombre: { type: 'string' },
            direccion: { type: 'string' },
            ciudad: { type: 'string' },
            provincia: { type: 'string' },
            estado: { type: 'string', enum: ['activo', 'inactivo'] }
          }
        },
        Tecnico: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            nombre: { type: 'string' },
            cedula: { type: 'string' },
            telefono: { type: 'string' },
            email: { type: 'string' },
            especialidad: { type: 'string' },
            jornada_horaria: { type: 'integer' },
            hora_entrada: { type: 'string' },
            hora_salida: { type: 'string' },
            estado: { type: 'string', enum: ['activo', 'inactivo'] }
          }
        },
        Orden: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            numero_orden: { type: 'string' },
            id_cliente: { type: 'integer' },
            id_local: { type: 'integer' },
            tipo_trabajo: { type: 'string' },
            prioridad: { type: 'string' },
            descripcion: { type: 'string' },
            estado: { type: 'string' },
            fecha_programada: { type: 'string', format: 'date-time' },
            cantidad_tecnicos: { type: 'integer' },
            horas_estimadas: { type: 'integer' }
          }
        },
        Asignacion: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            id_orden: { type: 'integer' },
            id_tecnico: { type: 'integer' },
            fecha_asignacion: { type: 'string', format: 'date-time' },
            hora_inicio_programada: { type: 'string' },
            hora_fin_programada: { type: 'string' },
            estado: { type: 'string', enum: ['pendiente', 'completado', 'no_cumplido', 'reprogramado'] }
          }
        },
        InformeTecnico: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            id_orden: { type: 'integer' },
            id_tecnico: { type: 'integer' },
            descripcion_trabajo: { type: 'string' },
            materiales_usados: { type: 'string' },
            estado_equipo: { type: 'string' },
            recomendaciones: { type: 'string' },
            estado: { type: 'string', enum: ['pendiente', 'enviado', 'aprobado', 'rechazado'] },
            fecha_informe: { type: 'string', format: 'date-time' }
          }
        },
        Factura: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            id_orden: { type: 'integer' },
            numero_factura: { type: 'string' },
            estado: { type: 'string' },
            monto: { type: 'number' },
            fecha_emision: { type: 'string', format: 'date-time' },
            fecha_vencimiento: { type: 'string', format: 'date-time' }
          }
        },
        Usuario: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            rol: { type: 'string', enum: ['admin', 'coordinador', 'tecnico'] },
            id_tecnico: { type: 'integer' },
            estado: { type: 'string', enum: ['activo', 'inactivo'] }
          }
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };