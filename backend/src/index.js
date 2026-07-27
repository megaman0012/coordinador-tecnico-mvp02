/**
 * MVP - Sistema de Gestión Coordinador Técnico
 * Servidor Express.js
 * 
 * Configuración de logging integrada
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./swagger');
const { logger } = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler.middleware');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middlewares - CORS configurado para permitir cualquier origen
app.use(cors({
  origin: true,
  credentials: true
}));

// Middleware de logging para requests
app.use((req, res, next) => {
  logger.info('Request', `${req.method} ${req.path}`, { body: req.body });
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rutas
const authRoutes = require('./routes/auth.routes');
const clienteRoutes = require('./routes/cliente.routes');
const localRoutes = require('./routes/local.routes');
const tecnicoRoutes = require('./routes/tecnico.routes');
const ordenRoutes = require('./routes/orden.routes');
const asignacionRoutes = require('./routes/asignacion.routes');
const registroDiarioRoutes = require('./routes/registroDiario.routes');
const horaRoutes = require('./routes/hora.routes');
const facturaRoutes = require('./routes/factura.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const tareaRoutes = require('./routes/tarea.routes');
const informeRoutes = require('./routes/informe.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const representanteRoutes = require('./routes/representante.routes');
const actividadRoutes = require('./routes/actividad.routes');
const ausenciaRoutes = require('./routes/ausencia.routes');
const inventarioRoutes = require('./routes/inventario.routes');
const archivoRoutes = require('./routes/archivo.routes');

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/locales', localRoutes);
app.use('/api/tecnicos', tecnicoRoutes);
app.use('/api/ordenes', ordenRoutes);
app.use('/api/asignaciones', asignacionRoutes);
app.use('/api/registros-diarios', registroDiarioRoutes);
app.use('/api/horas', horaRoutes);
app.use('/api/facturas', facturaRoutes);

// Dashboard
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tareas', tareaRoutes);
app.use('/api/informes', informeRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/representantes', representanteRoutes);
app.use('/api/actividades', actividadRoutes);
app.use('/api/ausencias', ausenciaRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/archivos', archivoRoutes);

// Archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger - Documentación de API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
  res.json(swaggerSpec);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API funcionando', timestamp: new Date() });
});

// Endpoint de prueba
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API funcionando correctamente' });
});

// Endpoint de prueba con POST
app.post('/api/test', (req, res) => {
  logger.info('test', 'POST test', { body: req.body });
  res.json({ 
    success: true,
    message: 'API funcionando correctamente',
    received: req.body 
  });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  logger.info('Server', `🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
});

module.exports = app;