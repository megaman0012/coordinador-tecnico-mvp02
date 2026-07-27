/**
 * GUÍA DE REFACTORIZACIÓN - Sistema Coordinador Técnico MVP v3.0
 * 
 * Este documento establece los patrones para la refactorización segura del sistema.
 * 
 * ARQUITECTURA OBJETIVO:
 * ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
 * │ Controller  │────▶│  Service    │────▶│ Repository  │
 * │ (req/res)   │     │ (lógica)    │     │ (Prisma)    │
 * └─────────────┘     └─────────────┘     └─────────────┘
 *                            │
 *                    ┌───────┴───────┐
 *                    │ State Machine │
 *                    │   & Logger    │
 *                    └───────────────┘
 * 
 * ==================== PATRON 1: CONTROLLER ====================
 * - Solo maneja request/response
 * - NO consulta Prisma directamente
 * - Llama a servicios
 * - Usa formato de respuesta estándar
 * 
 * ANTES (❌):
 * const crearOrden = async (req, res) => {
 *   try {
 *     const orden = await prisma.orden.create({ data: req.body });
 *     res.json(orden);
 *   } catch (error) {
 *     console.error('Error:', error);
 *     res.status(500).json({ error: 'Error' });
 *   }
 * };
 * 
 * DESPUÉS (✅):
 * const crearOrden = async (req, res) => {
 *   try {
 *     const orden = await ordenService.create(req.body);
 *     res.json({ success: true, data: orden });
 *   } catch (error) {
 *     logger.error('crearOrden', 'Error', { error: error.message });
 *     res.status(500).json({ success: false, message: 'Error' });
 *   }
 * };
 * 
 * ==================== PATRON 2: STATE MACHINE ====================
 * - Validar transición ANTES de actualizar estado
 * - Usar estadoMachine.validarTransicion(estadoActual, nuevoEstado)
 * - Devolver error claro si no es válido
 * 
 * // En actualizar orden/factura/informe:
 * if (data.estado && data.estado !== ordenActual.estado) {
 *   const validacion = ordenStateMachine.validarTransicion(ordenActual.estado, data.estado);
 *   if (!validacion.valido) {
 *     return res.status(400).json({ success: false, message: validacion.message });
 *   }
 * }
 * 
 * ==================== PATRON 3: RESPUESTA ESTÁNDAR ====================
 * // Éxito:
 * res.json({ success: true, data: resultado });
 * 
 * // Error:
 * res.status(500).json({ success: false, message: 'Mensaje claro' });
 * 
 * ==================== PATRON 4: LOGGER ====================
 * // Reemplazar:
 * console.log('mensaje')        → logger.info('nombreFuncion', 'mensaje', { data })
 * console.error('Error:', err)  → logger.error('nombreFuncion', 'Error', { error: err.message })
 * 
 * ==================== FUENTE DE VERDAD DE HORAS ====================
 * - RegistroDiario es lafuente principal de horas trabajadas
 * - HoraTecnico, RegistroHoras, Jornada = datos históricos (no usar para cálculos nuevos)
 * - Al calcular facturación o reportes: usar SUM de horas_normales + horas_extras de RegistroDiario
 * 
 * ==================== MIGRACIÓN A POSTGRESQL ====================
 * - Schema ya tiene comentarios de configuración
 * - Ejecutar: npx prisma db push (no migrate para MVP)
 * - Cambiar provider de "sqlite" a "postgresql"
 * - Agregar DATABASE_URL en .env
 */

module.exports = {
  GUIA_REFACTORIZACION: true,
  version: '3.0',
  fecha: '2026-04-06'
};