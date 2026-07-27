/**
 * Tipos para Inventario
 */

export interface InventarioItem {
  id: number;
  id_externo: string;
  tipo_local: string;
  nombre_local: string;
  cliente: string;
  provincia?: string;
  ciudad?: string;
  tipo_monitoreo?: string;
  estado_operativo?: string;
  fecha_implementacion?: string | null;
  fecha_cierre?: string | null;
  observacion?: string;
  direccion?: string;
  gps?: string;
  horario_apertura?: string;
  horario_cierre?: string;
  ip_1?: string;
  ip_2?: string;
  ip_3?: string;
  contacto?: string;
  correo?: string;
  tipo_sistema?: string;
  categoria?: string;
  cantidad: number;
  marca?: string;
  detalle?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ResumenLocal {
  id_externo: string;
  nombre: string;
  cliente: string;
  provincia?: string;
  ciudad?: string;
  tipo_monitoreo?: string;
  estado_operativo?: string;
  cctv: boolean;
  alarma: boolean;
  acceso: boolean;
  humo: boolean;
  componentes: number;
}

export interface InventarioFilters {
  cliente?: string;
  ciudad?: string;
  tipo_sistema?: string;
  estado_operativo?: string;
  provincia?: string;
  id_externo?: string;
}