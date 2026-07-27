/**
 * Instancia única de Prisma Client - MVP Coordinador Técnico
 * Evita múltiples conexiones a la base de datos
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;