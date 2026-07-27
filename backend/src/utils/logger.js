/**
 * Logger configurado con Winston
 * Sistema de logs estructurados para el Backend
 */

const winston = require('winston');
const path = require('path');

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// Configuración de transports
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Consola en desarrollo
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} ${level}: ${message}`;
        })
      )
    })
  ]
});

// En producción también escribir a archivo
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: path.join(__dirname, '../logs/error.log'), 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: path.join(__dirname, '../logs/combined.log') 
  }));
}

module.exports = {
  logger,
  // Métodos de conveniencia para logs específicos
  logError: (context, message, data = {}) => {
    logger.error(`[${context}] ${message}`, { ...data, timestamp: new Date().toISOString() });
  },
  logInfo: (context, message, data = {}) => {
    logger.info(`[${context}] ${message}`, { ...data, timestamp: new Date().toISOString() });
  },
  logWarn: (context, message, data = {}) => {
    logger.warn(`[${context}] ${message}`, { ...data, timestamp: new Date().toISOString() });
  },
  logDebug: (context, message, data = {}) => {
    logger.debug(`[${context}] ${message}`, { ...data, timestamp: new Date().toISOString() });
  }
};