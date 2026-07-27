/**
 * Configuración Centralizada - MVP Coordinador Técnico
 * Maneja todas las variables de entorno en un solo lugar
 */

module.exports = {
  // Servidor
  PORT: process.env.PORT || 3002,
  
  // Base de datos
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://coordinator_user:Co0rd1n4d0r2026@localhost:5432/coordinator_db',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'coordinador-tecnico-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  
  // Entorno
  NODE_ENV: process.env.NODE_ENV || 'development'
};