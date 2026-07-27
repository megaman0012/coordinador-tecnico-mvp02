// Tipos del sistema - MVP Coordinador Técnico v3.0

// ==================== USUARIO ====================
export interface Usuario {
  id: number;
  username: string;
  rol: 'admin' | 'coordinador' | 'tecnico';
  estado?: string;
  tecnico?: {
    id: number;
    nombre: string;
  };
}

export interface Cliente {
  id: number;
  nombre: string;
  ruc?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  estado: string;
  representantes?: Representante[];
}

export interface Local {
  id: number;
  id_cliente: number;
  nombre: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  tipo?: string;
  tipo_servicio?: 'monitoreo_24_7' | 'alarmas' | 'no_aplica';
  fecha_implementacion?: string;
  estado: string;
  fecha_baja?: string;
  cliente?: Cliente;
}

export interface Tecnico {
  id: number;
  nombre: string;
  cedula?: string;
  telefono?: string;
  email?: string;
  especialidad?: string;
  jornada_horaria: number;
  hora_entrada?: string;
  hora_salida?: string;
  estado: string;
}

// Tipos de trabajo
export type TipoTrabajo = 'correctivo' | 'preventivo' | 'visita_tecnica' | 'implementacion' | 'proyecto' | 'gestion_operativa';
export type Prioridad = 'baja' | 'media' | 'alta' | 'urgente';

// Estados de orden (workflow completo)
export type EstadoOrden = 'pendiente' | 'asignada' | 'en_proceso' | 'completada' | 'facturada' | 'no_cumplida' | 'reprogramada';

// Estados de facturación v3.1
export type EstadoFacturacion = 'no_iniciada' | 'validacion_cliente' | 'aprobada_cliente' | 'finalizada' | 'pagada';

// Estados de informe técnico
export type EstadoInforme = 'pendiente' | 'enviado' | 'aprobado' | 'rechazado';

// Estados de día (registro diario)
export type EstadoDia = 'pendiente' | 'en_proceso' | 'completado' | 'no_cumplido' | 'reprogramado' | 'dia_libre' | 'certificacion';

// ==================== ORDEN ====================
export interface Orden {
  id: number;
  numero_orden: string;
  id_cliente: number;
  id_local: number;
  id_tecnico?: number;
  tipo_trabajo: TipoTrabajo;
  prioridad: Prioridad;
  estado: EstadoOrden;
  descripcion?: string;
  fecha_creacion: string;
  fecha_programada?: string;
  cantidad_tecnicos?: number;
  horas_estimadas?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  resolucion?: string;
  facturable: boolean;
  estado_facturacion: EstadoFacturacion;
  numero_factura?: string;
  informe_adjunto: boolean;
  estado_informe: EstadoInforme;
  observaciones?: string;
  archivos_adjuntos?: string;
  cliente?: Cliente;
  local?: Local;
  tecnico?: Tecnico;
  asignaciones?: Asignacion[];
  registrosDiario?: RegistroDiario[];
  horasTecnico?: HoraTecnico[];
  historial?: HistorialOrden[];
  factura?: Factura;
}

// ==================== ASIGNACIÓN ====================
export interface Asignacion {
  id: number;
  id_orden: number;
  id_tecnico: number;
  fecha_asignacion: string;
  hora_inicio_programada?: string;
  hora_fin_programada?: string;
  estado: string;
  motivo_reprogramacion?: string;
  fecha_asignacion_real?: string;
  orden?: Orden;
  tecnico?: Tecnico;
  registrosDiario?: RegistroDiario[];
}

// ==================== REGISTRO DIARIO ====================
export interface RegistroDiario {
  id: number;
  id_asignacion?: number;
  id_orden: number;
  id_tecnico: number;
  fecha: string;
  estado_dia: EstadoDia;
  hora_llegada?: string;
  hora_salida?: string;
  hora_inicio_trabajo?: string;
  hora_fin_trabajo?: string;
  // Pausas para comidas
  hora_desayuno_inicio?: string;
  hora_desayuno_fin?: string;
  hora_almuerzo_inicio?: string;
  hora_almuerzo_fin?: string;
  hora_cena_inicio?: string;
  hora_cena_fin?: string;
  // Horas calculadas
  horas_normales: number;
  horas_extras: number;
  horas_almuerzo: number;
  horas_desayuno: number;
  horas_cena: number;
  // Días especiales
  es_fin_semana: boolean;
  es_dia_libre: boolean;
  // Certificación médica
  tiene_certificacion: boolean;
  motivo_certificacion?: string;
  observaciones?: string;
  evidencia_url?: string;
  orden?: Orden;
  tecnico?: Tecnico;
  asignacion?: Asignacion;
  // Campos adicionales para la UI
  horas_trabajadas?: number;
  total_horas_trabajadas?: number;
}

// ==================== HORA TÉCNICO ====================
export interface HoraTecnico {
  id: number;
  id_tecnico: number;
  id_orden?: number;
  fecha: string;
  hora_inicio: string;
  hora_fin?: string;
  horas_trabajadas: number;
  tipo: 'normal' | 'extra';
  es_fin_semana: boolean;
  observaciones?: string;
  tecnico?: Tecnico;
  orden?: Orden;
}

// ==================== FACTURA ====================
export interface Factura {
  id: number;
  id_orden: number;
  numero_factura?: string;
  estado: EstadoFacturacion;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  fecha_pago?: string;
  monto?: number;
  monto_pagado?: number;
  observaciones?: string;
  archivos_adjuntos?: string;
  orden?: Orden;
}

// ==================== HISTORIAL ====================
export interface HistorialOrden {
  id: number;
  id_orden: number;
  accion: string;
  estado_anterior?: string;
  estado_nuevo?: string;
  motivo?: string;
  fecha_cambio: string;
  usuario?: string;
}

// ==================== KPIs ====================
export interface KPIs {
  ordenes: {
    total: number;
    pendientes: number;
    enProceso: number;
    completadas: number;
    atrasadas: number;
  };
  tecnicos: {
    activos: number;
  };
  horas: {
    mes: number;
    extras: number;
  };
  facturacion: {
    pendientes: number;
    pagadas: number;
    montoFacturado: number;
    montoCobrado: number;
  };
  tareas_por_estado?: Record<string, number>;
  tareas_cumplidas?: number;
  tareas_no_cumplidas?: number;
  horas_extras?: number;
  tecnicos_mas_cargados?: { id: number; nombre: string; tareas_asignadas: number }[];
  facturables_pendientes?: number;
  tareas_periodo?: number;
  periodo?: { mes: number; año: number };
}

// ==================== RESUMEN HORAS ====================
export interface ResumenHoras {
  tecnico: Tecnico;
  total_horas: number;
  horas_normales: number;
  horas_extra: number;
  horas_extras: number;
  dias_trabajados: number;
  fin_semana: number;
  fines_semana: number;
}

// ==================== INFORME TÉCNICO ====================
export interface InformeTecnico {
  id: number;
  id_orden: number;
  id_tecnico: number;
  id_asignacion?: number;
  descripcion_trabajo?: string;
  materiales_usados?: string;
  estado_equipo?: string;
  recomendaciones?: string;
  proximo_mantenimiento?: string;
  firma_cliente?: string;
  nombre_cliente?: string;
  cedula_cliente?: string;
  fotos?: string;
  estado: EstadoInforme;
  fecha_informe: string;
  createdAt?: string;
  updatedAt?: string;
  orden?: Orden;
  tecnico?: Tecnico;
  asignacion?: Asignacion;
}

// Tipo para fotos parseadas
export interface FotoItem {
  foto: string;
  descripcion?: string;
}

// ==================== REPRESENTANTE ====================
export interface Representante {
  id: number;
  id_cliente: number;
  nombre: string;
  cedula?: string;
  telefono?: string;
  email?: string;
  cargo?: string;
  principal: boolean;
  estado: string;
  cliente?: Cliente;
}

// ==================== REGISTRO DE EVENTOS ====================
export interface RegistroEvento {
  id: number;
  id_tecnico: number;
  fecha_hora: string;
  tipo_evento: string;
  label?: string;
  descripcion?: string;
  foto_url?: string;
  jornada_id?: number;
  estado: 'pendiente' | 'aprobado' | 'observacion';
  observaciones_coordinador?: string;
  tecnico?: { id: number; nombre: string };
}

// ==================== JORNADA ====================
export interface Jornada {
  id: number;
  id_tecnico: number;
  fecha: string;
  hora_inicio: string;
  hora_fin?: string;
  jornada_continua_id?: string;
  estado: 'abierta' | 'cerrada' | 'pendiente' | 'observacion';
  total_horas: number;
  horas_trabajo: number;
  horas_extras: number;
  total_pausas: number;
  observaciones?: string;
  tecnico?: { id: number; nombre: string };
  eventos?: RegistroEvento[];
}

// ==================== AUSENCIA ====================
export interface Ausencia {
  id: number;
  id_tecnico: number;
  tipo: 'dia_libre' | 'permiso_medico' | 'vacacion' | 'feriado' | 'compensatorio';
  label?: string;
  fecha_inicio: string;
  fecha_fin: string;
  descripcion?: string;
  foto_url?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  observaciones?: string;
  tecnico?: { id: number; nombre: string };
}

// ==================== PAGINATION ====================
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Alias para compatibilidad
export type Tarea = Orden;
export type RegistroHora = RegistroDiario;
export type EstadoTarea = EstadoOrden;