/**
 * Middleware de manejo de errores uniforme
 * Sistema Coordinator Técnico MVP v3.0
 */

const { logger } = require('../utils/logger');

/**
 * Formato estándar de respuesta de error
 */
const formatoError = (message, error = null, statusCode = 500) => ({
  success: false,
  message,
  ...(process.env.NODE_ENV === 'development' && error && { error: error.toString() })
});

/**
 * Middleware para manejar errores de la aplicación
 */
const errorHandler = (err, req, res, next) => {
  // Log del error
  logger.error('ErrorHandler', err.message, {
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  // Determinar código de estado
  const statusCode = err.statusCode || err.status || 500;

  // Mensaje según tipo de error
  let message = err.message;

  // Errores comunes con mensajes amigables
  if (err.name === 'ValidationError') {
    message = 'Error de validación';
  } else if (err.name === 'UnauthorizedError') {
    message = 'No autorizado';
  } else if (err.code === 'P2002') {
    message = 'Ya existe un registro con esos datos';
  } else if (err.code === 'P2025') {
    message = 'Registro no encontrado';
  }

  res.status(statusCode).json(formatoError(message, err, statusCode));
};

/**
 * Wrapper para async handlers
 * Evita try/catch repetitivo en controllers
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Middleware para errores 404 (ruta no encontrada)
 */
const notFoundHandler = (req, res) => {
  res.status(404).json(formatoError('Endpoint no encontrado', null, 404));
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  formatoError
};