/**
 * Máquina de Estados - Control de transiciones válidas
 * Sistema Coordinador Técnico MVP v3.0
 */

// ==================== ESTADOS DE ORDEN ====================
const ESTADOS_ORDEN = {
  PENDIENTE: 'pendiente',
  ASIGNADA: 'asignada',
  EN_PROCESO: 'en_proceso',
  COMPLETADA: 'completada',
  FACTURADA: 'facturada',
  NO_CUMPLIDA: 'no_cumplida',
  REPROGRAMADA: 'reprogramada'
};

// Transiciones válidas para Orden
const TRANSICIONES_ORDEN = {
  [ESTADOS_ORDEN.PENDIENTE]: [ESTADOS_ORDEN.ASIGNADA, ESTADOS_ORDEN.NO_CUMPLIDA, ESTADOS_ORDEN.REPROGRAMADA],
  [ESTADOS_ORDEN.ASIGNADA]: [ESTADOS_ORDEN.EN_PROCESO, ESTADOS_ORDEN.NO_CUMPLIDA, ESTADOS_ORDEN.REPROGRAMADA],
  [ESTADOS_ORDEN.EN_PROCESO]: [ESTADOS_ORDEN.COMPLETADA, ESTADOS_ORDEN.NO_CUMPLIDA, ESTADOS_ORDEN.REPROGRAMADA],
  [ESTADOS_ORDEN.COMPLETADA]: [ESTADOS_ORDEN.FACTURADA],
  [ESTADOS_ORDEN.FACTURADA]: [ESTADOS_ORDEN.COMPLETADA], // Retroceso si se rechaza factura
  [ESTADOS_ORDEN.NO_CUMPLIDA]: [ESTADOS_ORDEN.PENDIENTE, ESTADOS_ORDEN.REPROGRAMADA], // Reabrir o reprogramar
  [ESTADOS_ORDEN.REPROGRAMADA]: [ESTADOS_ORDEN.ASIGNADA, ESTADOS_ORDEN.NO_CUMPLIDA]
};

// ==================== ESTADOS DE FACTURA ====================
const ESTADOS_FACTURA = {
  NO_INICIADA: 'no_iniciada',
  PLANIFICADA: 'planificada',
  EN_PROCESO: 'en_proceso',
  FINALIZADA: 'finalizada',
  PAGADA: 'pagada'
};

// Transiciones válidas para Factura
const TRANSICIONES_FACTURA = {
  [ESTADOS_FACTURA.NO_INICIADA]: [ESTADOS_FACTURA.PLANIFICADA],
  [ESTADOS_FACTURA.PLANIFICADA]: [ESTADOS_FACTURA.EN_PROCESO, ESTADOS_FACTURA.NO_INICIADA],
  [ESTADOS_FACTURA.EN_PROCESO]: [ESTADOS_FACTURA.FINALIZADA, ESTADOS_FACTURA.PLANIFICADA],
  [ESTADOS_FACTURA.FINALIZADA]: [ESTADOS_FACTURA.PAGADA, ESTADOS_FACTURA.EN_PROCESO],
  [ESTADOS_FACTURA.PAGADA]: [] // Estado terminal
};

// ==================== ESTADOS DE INFORME ====================
const ESTADOS_INFORME = {
  PENDIENTE: 'pendiente',
  ENVIADO: 'enviado',
  APROBADO: 'aprobado',
  RECHAZADO: 'rechazado'
};

// Transiciones válidas para Informe
const TRANSICIONES_INFORME = {
  [ESTADOS_INFORME.PENDIENTE]: [ESTADOS_INFORME.ENVIADO],
  [ESTADOS_INFORME.ENVIADO]: [ESTADOS_INFORME.APROBADO, ESTADOS_INFORME.RECHAZADO],
  [ESTADOS_INFORME.APROBADO]: [], // Estado terminal
  [ESTADOS_INFORME.RECHAZADO]: [ESTADOS_INFORME.ENVIADO] // Puedo reenviar
};

// ==================== ESTADOS DE ASIGNACIÓN ====================
const ESTADOS_ASIGNACION = {
  PENDIENTE: 'pendiente',
  COMPLETADA: 'completada',
  NO_CUMPLIDA: 'no_cumplida',
  REPROGRAMADO: 'reprogramado'
};

const TRANSICIONES_ASIGNACION = {
  [ESTADOS_ASIGNACION.PENDIENTE]: [ESTADOS_ASIGNACION.COMPLETADA, ESTADOS_ASIGNACION.NO_CUMPLIDA, ESTADOS_ASIGNACION.REPROGRAMADO],
  [ESTADOS_ASIGNACION.COMPLETADA]: [],
  [ESTADOS_ASIGNACION.NO_CUMPLIDA]: [ESTADOS_ASIGNACION.PENDIENTE, ESTADOS_ASIGNACION.REPROGRAMADO],
  [ESTADOS_ASIGNACION.REPROGRAMADO]: [ESTADOS_ASIGNACION.PENDIENTE, ESTADOS_ASIGNACION.COMPLETADA, ESTADOS_ASIGNACION.NO_CUMPLIDA]
};

// ==================== MÁQUINA DE ESTADOS ====================

class StateMachine {
  constructor(entityType) {
    this.entityType = entityType;
    this.transiciones = this.getTransiciones(entityType);
    this.estados = this.getEstados(entityType);
  }

  getTransiciones(entityType) {
    switch (entityType) {
      case 'orden': return TRANSICIONES_ORDEN;
      case 'factura': return TRANSICIONES_FACTURA;
      case 'informe': return TRANSICIONES_INFORME;
      case 'asignacion': return TRANSICIONES_ASIGNACION;
      default: return {};
    }
  }

  getEstados(entityType) {
    switch (entityType) {
      case 'orden': return ESTADOS_ORDEN;
      case 'factura': return ESTADOS_FACTURA;
      case 'informe': return ESTADOS_INFORME;
      case 'asignacion': return ESTADOS_ASIGNACION;
      default: return {};
    }
  }

  /**
   * Verifica si una transición es válida
   * @param {string} estadoActual - Estado actual de la entidad
   * @param {string} nuevoEstado - Estado al que se quiere transiciónar
   * @returns {object} - { valido: boolean, message?: string }
   */
  validarTransicion(estadoActual, nuevoEstado) {
    if (!this.transiciones[estadoActual]) {
      return { 
        valido: false, 
        message: `Estado actual '${estadoActual}' no válido para ${this.entityType}` 
      };
    }

    const estadosPermitidos = this.transiciones[estadoActual];
    
    if (!estadosPermitidos.includes(nuevoEstado)) {
      return { 
        valido: false, 
        message: `No se puede transiciónar de '${estadoActual}' a '${nuevoEstado}'. Estados permitidos: ${estadosPermitidos.join(', ')}` 
      };
    }

    return { valido: true };
  }

  /**
   * Obtiene los estados permitidos desde el estado actual
   * @param {string} estadoActual 
   * @returns {string[]} - Lista de estados permitidos
   */
  getEstadosPermitidos(estadoActual) {
    return this.transiciones[estadoActual] || [];
  }

  /**
   * Valida y retorna error si no es válido
   * @throws Error si la transición no es válida
   */
  validarTransicionOrThrow(estadoActual, nuevoEstado) {
    const resultado = this.validarTransicion(estadoActual, nuevoEstado);
    if (!resultado.valido) {
      throw new Error(resultado.message);
    }
  }
}

// Instancias pre-configuradas
const ordenStateMachine = new StateMachine('orden');
const facturaStateMachine = new StateMachine('factura');
const informeStateMachine = new StateMachine('informe');
const asignacionStateMachine = new StateMachine('asignacion');

module.exports = {
  StateMachine,
  ordenStateMachine,
  facturaStateMachine,
  informeStateMachine,
  asignacionStateMachine,
  ESTADOS_ORDEN,
  ESTADOS_FACTURA,
  ESTADOS_INFORME,
  ESTADOS_ASIGNACION,
  TRANSICIONES_ORDEN,
  TRANSICIONES_FACTURA,
  TRANSICIONES_INFORME,
  TRANSICIONES_ASIGNACION
};