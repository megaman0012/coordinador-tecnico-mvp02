import axios, { AxiosError } from 'axios';
import { Cliente, Local, Tecnico, Orden, Asignacion, RegistroDiario, Factura, KPIs, ResumenHoras, InformeTecnico, Usuario, Representante } from '../types';

// URL dinámica según el entorno
// El frontend usa la misma IP/host del navegador para conectar al backend
// Esto permite acceso tanto desde local como por IP pública sin NAT loopback
const getApiUrl = () => {
  const hostname = window.location.hostname;
  const port = 3002;
  return `http://${hostname}:${port}/api`;
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000 // Timeout de 30 segundos
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  console.error('Error en solicitud:', error);
  return Promise.reject(error);
});

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    // NO transformar si es blob (descargas)
    if (response.config.responseType === 'blob') {
      return response;
    }
    
    // Para endpoints con paginación, NO transformar
    const url = response.config.url || '';
    if (url.includes('/informes')) {
      return response;
    }
    
    // Verificar si la respuesta tiene el formato { success: true, data: ... }
    // y extraer automáticamente los datos
    const data = response.data;
    if (data && typeof data === 'object' && 'success' in data && data.success === true && 'data' in data) {
      response.data = data.data;
    }
    
    // Verificar si la respuesta tiene el formato nuevo { success: false, message }
    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
      console.warn('API Error:', data.message);
    }
    
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      // Error del servidor
      const status = error.response.status;
      const data = error.response.data as any;
      
      let mensaje = '';
      
      // Manejar nuevo formato de respuesta { success: false, message }
      if (data?.success === false && data?.message) {
        mensaje = data.message;
      } else {
        // Formato legacy
        switch (status) {
          case 401:
            mensaje = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            break;
          case 403:
            mensaje = data?.error || 'No tienes permisos para realizar esta acción';
            break;
          case 404:
            mensaje = data?.error || 'Recurso no encontrado';
            break;
          case 422:
            mensaje = data?.error || 'Datos inválidos';
            break;
          case 500:
            mensaje = data?.error || 'Error interno del servidor';
            break;
          default:
            mensaje = data?.error || 'Error desconocido';
        }
      }
      
      console.error(`Error ${status}:`, mensaje);
    } else if (error.request) {
      console.error('Error de conexión: No se puede conectar al servidor');
    } else {
      console.error('Error de configuración:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const login = (username: string, password: string) => 
  api.post('/auth/login', { username, password });

export const register = (username: string, password: string, rol: string) => 
  api.post('/auth/registrar', { username, password, rol });

// ==================== CLIENTES ====================
// ==================== CLIENTES ====================
export const getClientes = () => api.get<{ success: boolean; data: Cliente[] }>('/clientes');
export const getCliente = (id: number) => api.get<Cliente>(`/clientes/${id}`);
export const createCliente = (data: Partial<Cliente>) => api.post('/clientes', data);
export const updateCliente = (id: number, data: Partial<Cliente>) => api.put(`/clientes/${id}`, data);
export const deleteCliente = (id: number) => api.delete(`/clientes/${id}`);

// ==================== LOCALES ====================
export const getLocales = (params?: { id_cliente?: number; ciudad?: string }) => 
  api.get<{ success: boolean; data: Local[] }>('/locales', { params });
export const getLocal = (id: number) => api.get<Local>(`/locales/${id}`);
export const createLocal = (data: Partial<Local>) => api.post('/locales', data);
export const updateLocal = (id: number, data: Partial<Local>) => api.put(`/locales/${id}`, data);
export const deleteLocal = (id: number) => api.delete(`/locales/${id}`);
export const exportarLocales = () => api.get('/locales/exportar', { responseType: 'blob' });
export const importarLocales = (archivo: File) => {
  const formData = new FormData();
  formData.append('archivo', archivo);
  return api.post('/locales/importar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// ==================== TÉCNICOS ====================
export const getTecnicos = (params?: { estado?: string; especialidad?: string }) => 
  api.get<{ success: boolean; data: Tecnico[] }>('/tecnicos', { params });
export const getTecnico = (id: number) => api.get<{ success: boolean; data: Tecnico }>(`/tecnicos/${id}`);
export const createTecnico = (data: Partial<Tecnico>) => api.post('/tecnicos', data);
export const updateTecnico = (id: number, data: Partial<Tecnico>) => api.put(`/tecnicos/${id}`, data);
export const deleteTecnico = (id: number) => api.delete(`/tecnicos/${id}`);

// ==================== ÓRDENES ====================
// Obtener todas las órdenes (con filtros opcionales)
export const getOrden = (params?: { estado?: string; prioridad?: string; id_cliente?: number; estado_facturacion?: string }) => 
  api.get<{ success: boolean; data: Orden[] }>('/ordenes', { params });
export const getOrdenById = (id: number) => api.get<Orden>(`/ordenes/${id}`);
export const createOrden = (data: Partial<Orden>) => api.post('/ordenes', data);
export const updateOrden = (id: number, data: Partial<Orden>) => api.put(`/ordenes/${id}`, data);
export const deleteOrden = (id: number) => api.delete(`/ordenes/${id}`);
export const getOrdenHistorial = (id: number) => api.get(`/ordenes/${id}/historial`);

// Alias para compatibilidad (getOrdeness para coincidir con búsquedas)
export const getOrdeness = (params?: { estado?: string; prioridad?: string; id_cliente?: number; estado_facturacion?: string }) => 
  api.get<{ success: boolean; data: Orden[] }>('/ordenes', { params });

// Alias para compatibilidad con código existente que usa getOrdenes (plural)
export const getOrdenessFacturables = () => api.get<{ success: boolean; data: Orden[] }>("/ordenes/facturables-pendientes");
export const getOrdenes = (params?: { estado?: string; prioridad?: string; id_cliente?: number; estado_facturacion?: string }) => 
  api.get<{ success: boolean; data: Orden[] }>('/ordenes', { params });

export const iniciarOrden = (id: number) => api.put(`/ordenes/${id}/iniciar`, {});
export const completarOrden = (id: number, data: { resolucion?: string; observaciones?: string; informe_adjunto?: boolean; estado_informe?: string }) => 
  api.put(`/ordenes/${id}/completar`, data);
export const reprogramarOrden = (id: number, data: { fecha_programada: string; hora_programada?: string; motivo?: string }) => 
  api.put(`/ordenes/${id}/reprogramar`, data);
export const cancelarOrden = (id: number, motivo: string) => 
  api.put(`/ordenes/${id}/cancelar`, { motivo });

export const enviarAFacturacion = (id: number) => api.put(`/ordenes/${id}/enviar-facturacion`, {});
export const actualizarEstadoFacturacion = (id: number, data: { estado_facturacion: string; numero_factura?: string }) => 
  api.put(`/ordenes/${id}/actualizar-facturacion`, data);

export const getOrdenesAtrasadas = () => api.get<{ success: boolean; data: Orden[] }>('/ordenes/atrasadas');
export const getOrdenesFacturables = () => api.get<{ success: boolean; data: Orden[] }>('/ordenes/facturables-pendientes');
export const getHistorialOrden = (id: number) => api.get(`/ordenes/${id}/historial`);

// ==================== ASIGNACIONES ====================
export const getAsignaciones = (params?: { id_tecnico?: number; id_orden?: number; estado?: string }) => 
  api.get<{ success: boolean; data: Asignacion[] }>('/asignaciones', { params });
export const getAsignacion = (id: number) => api.get<Asignacion>(`/asignaciones/${id}`);
export const createAsignacion = (data: Partial<Asignacion>) => api.post('/asignaciones', data);
export const updateAsignacion = (id: number, data: Partial<Asignacion>) => api.put(`/asignaciones/${id}`, data);
export const deleteAsignacion = (id: number) => api.delete(`/asignaciones/${id}`);

export const completarAsignacion = (id: number) => api.put(`/asignaciones/${id}/completar`, {});
export const reprogramarAsignacion = (id: number, data: { fecha_asignacion: string; hora_inicio_programada?: string; hora_fin_programada?: string; motivo_reprogramacion?: string }) => 
  api.put(`/asignaciones/${id}/reprogramar`, data);
export const noCumplirAsignacion = (id: number, motivo: string) => 
  api.put(`/asignaciones/${id}/no-cumplir`, { motivo });

export const getAgendaDia = (fecha: string) => api.get<Asignacion[]>(`/asignaciones/agenda/${fecha}`);
export const getAgendaTecnico = (id: number, params?: { fecha_inicio?: string; fecha_fin?: string }) => 
  api.get<Asignacion[]>(`/asignaciones/tecnico/${id}`, { params });
export const getCargaTrabajo = () => api.get('/asignaciones/carga-trabajo');

// Historial de asignaciones con todos los datos
export const getHistorialAsignaciones = (params?: { 
  id_tecnico?: number; 
  id_orden?: number; 
  estado?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  buscar?: string;
}) => api.get<{ success: boolean; data: Asignacion[] }>('/asignaciones', { params });

// ==================== REGISTROS DIARIOS ====================
export const getRegistrosDiarios = (params?: { id_tecnico?: number; id_orden?: number; estado_dia?: string; fecha_inicio?: string; fecha_fin?: string }) => 
  api.get<RegistroDiario[]>('/registros-diarios', { params });
export const getRegistroDiario = (id: number) => api.get<RegistroDiario>(`/registros-diarios/${id}`);
export const createRegistroDiario = (data: Partial<RegistroDiario>) => api.post('/registros-diarios', data);
export const updateRegistroDiario = (id: number, data: Partial<RegistroDiario>) => api.put(`/registros-diarios/${id}`, data);
export const deleteRegistroDiario = (id: number) => api.delete(`/registros-diarios/${id}`);

export const getRegistrosDelDia = (fecha: string) => api.get<RegistroDiario[]>(`/registros-diarios/dia/${fecha}`);
export const getRegistrosPorTecnico = (id: number, params?: { fecha_inicio?: string; fecha_fin?: string }) => 
  api.get<RegistroDiario[]>(`/registros-diarios/tecnico/${id}`, { params });
export const getResumenHorasTecnico = (id: number, params?: { fecha_inicio?: string; fecha_fin?: string }) => 
  api.get<ResumenHoras>(`/registros-diarios/resumen/${id}`, { params });

// ==================== FACTURAS ====================
export const getFacturas = (params?: { 
  estado?: string; 
  fecha_inicio?: string;
  fecha_fin?: string;
}) => 
  api.get<Factura[]>('/facturas', { params });
export const getFactura = (id: number) => api.get<Factura>(`/facturas/${id}`);

// createFactura - v3.1 con nuevos campos
export const createFactura = (data: { 
  id_orden: number; 
  monto?: number; 
  observaciones?: string;
  numero_factura?: string;
  orden_compra_cliente?: string;
  tiene_oc?: boolean;
  archivo_cotizacion?: string;
}) => api.post('/facturas', data);

export const updateFactura = (id: number, data: Partial<Factura>) => api.put(`/facturas/${id}`, data);
export const deleteFactura = (id: number) => api.delete(`/facturas/${id}`);

// Workflow v3.1
export const planificarFacturacion = (id: number, data: { fecha_vencimiento?: string; monto?: number; observaciones?: string }) => 
  api.put(`/facturas/${id}/planificar`, data);

// iniciarFacturacion ahora es "aprobar desde cliente"
export const iniciarFacturacion = (id: number, data?: { orden_compra_cliente?: string; tiene_oc?: boolean; observaciones?: string; archivo_aprobacion?: string }) => 
  api.put(`/facturas/${id}/iniciar`, data || {});

export const finalizarFacturacion = (id: number, data: { numero_factura?: string; monto?: number; observaciones?: string }) => 
  api.put(`/facturas/${id}/finalizar`, data);

export const registrarPago = (id: number, data: { monto_pagado: number; observaciones?: string }) => 
  api.put(`/facturas/${id}/pagar`, data);

export const getFacturasPendientes = () => api.get<Factura[]>('/facturas/pendientes/lista');
export const getFacturasVencidas = () => api.get<Factura[]>('/facturas/vencidas/lista');
export const getResumenFacturacion = (params?: { año?: number; mes?: number }) => 
  api.get('/facturas/resumen/estadisticas', { params });
export const generarFacturasAuto = () => api.post('/facturas/auto/generar');

// Historial de factura (ruta en index.js)
export const getHistorialFactura = (id: number) => 
  api.get<{ id: number; estado_anterior: string | null; estado_nuevo: string; observaciones: string | null; usuario: string | null; createdAt: string }[]>(`/facturas/${id}/historial`);

// ==================== DASHBOARD ====================
// KPIs retorna { success: true, data: { ordenes, tecnicos, horas, facturacion, ... } }
export const getKPIs = () => api.get<{ success: boolean; data: KPIs }>('/dashboard/kpis');
// Tareas recientes retorna { success: true, data: Orden[] }
export const getTareasRecientes = (limite?: number) => 
  api.get<{ success: boolean; data: Orden[] }>('/dashboard/tareas-recientes', { params: { limite } });
// Resumen por cliente retorna { success: true, data: [...] }
export const getResumenPorCliente = () => api.get<{ success: boolean; data: any[] }>('/dashboard/resumen-cliente');
// Tareas por estado retorna { success: true, data: [...] }
export const getTareasPorEstado = () => api.get<{ success: boolean; data: any[] }>('/dashboard/tareas-estado');
// Tareas cumplimiento retorna { success: true, data: { ... } }
export const getTareasCumplimiento = () => api.get<{ success: boolean; data: any }>('/dashboard/tareas-cumplimiento');
// Horas extras retorna { success: true, data: { ... } }
export const getHorasExtras = () => api.get<{ success: boolean; data: any }>('/dashboard/horas-extras');
// Técnicos cargados retorna { success: true, data: [...] }
export const getTecnicosCargados = () => api.get<{ success: boolean; data: any[] }>('/dashboard/tecnicos-carga');
// Facturables pendientes retorna { success: true, data: Orden[] }
export const getFacturablesPendientes = () => api.get<{ success: boolean; data: Orden[] }>('/dashboard/facturables-pendientes');

// ==================== HORAS ====================
export const getHoras = (params?: { id_tecnico?: number; fecha_inicio?: string; fecha_fin?: string }) => 
  api.get<{ success: boolean; data: RegistroDiario[] }>('/horas', { params });

export const createHora = (data: { 
  id_tecnico: number; 
  id_orden?: number; 
  fecha: string; 
  hora_inicio: string; 
  hora_fin: string; 
  hora_desayuno_inicio?: string;
  hora_desayuno_fin?: string;
  hora_almuerzo_inicio?: string;
  hora_almuerzo_fin?: string;
  hora_cena_inicio?: string;
  hora_cena_fin?: string;
  tipo?: 'normal' | 'extra'; 
  es_dia_libre?: boolean;
  tiene_certificacion?: boolean;
  motivo_certificacion?: string;
  observaciones?: string 
}) => api.post('/horas', data);

export const updateHora = (id: number, data: Partial<{
  id_tecnico: number;
  id_orden?: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  hora_desayuno_inicio?: string;
  hora_desayuno_fin?: string;
  hora_almuerzo_inicio?: string;
  hora_almuerzo_fin?: string;
  hora_cena_inicio?: string;
  hora_cena_fin?: string;
  tipo: 'normal' | 'extra';
  es_fin_semana: boolean;
  es_dia_libre: boolean;
  tiene_certificacion: boolean;
  motivo_certificacion?: string;
  observaciones: string;
}>) => api.put(`/horas/${id}`, data);

export const deleteHora = (id: number) => api.delete(`/horas/${id}`);

export const getResumenDiario = (params?: { fecha?: string; id_tecnico?: number }) => 
  api.get<ResumenHoras[]>('/horas/resumen/diario', { params });

export const getResumenSemanal = (params?: { fecha_inicio?: string; fecha_fin?: string; id_tecnico?: number }) => 
  api.get<ResumenHoras[]>('/horas/resumen/semanal', { params });

export const getResumenMensual = (params?: { año?: number; mes?: number; id_tecnico?: number }) => 
  api.get<{ success: boolean; data: ResumenHoras[] }>('/horas/resumen/mensual', { params });

export const getResumenCustom = (params: { fecha_inicio: string; fecha_fin: string }) => 
  api.get<{ success: boolean; data: ResumenHoras[] }>('/horas/resumen/custom', { params });

// ==================== TAREAS (Alias de Órdenes) ====================
// Tareas usa la misma estructura que Órdenes
export const getTareas = (params?: { estado?: string; prioridad?: string; id_cliente?: number; estado_facturacion?: string }) => 
  api.get<{ success: boolean; data: Orden[] }>('/ordenes', { params });
export const createTarea = createOrden;
export const updateTarea = updateOrden;
export const deleteTarea = deleteOrden;

// ==================== INFORMES TÉCNICOS ====================
// Sin tipo para obtener respuesta completa con paginación
export const getInformes = (params?: { id_tecnico?: number; id_orden?: number; estado?: string; page?: number; limit?: number }) => 
  api.get('/informes', { params });
export const getInforme = (id: number) => api.get<InformeTecnico>(`/informes/${id}`);
export const createInforme = (data: Partial<InformeTecnico>) => api.post('/informes', data);
export const updateInforme = (id: number, data: Partial<InformeTecnico>) => api.put(`/informes/${id}`, data);
export const deleteInforme = (id: number) => api.delete(`/informes/${id}`);

// Endpoint especial: Completar asignación con informe
export const completarConInforme = (data: {
  id_asignacion: number;
  id_orden: number;
  id_tecnico: number;
  descripcion_trabajo: string;
  materiales_usados?: string;
  estado_equipo?: string;
  recomendaciones?: string;
  proximo_mantenimiento?: string;
  firma_cliente?: string;
  nombre_cliente?: string;
  cedula_cliente?: string;
  fotos?: string; // JSON string con bloques {foto, descripcion}
}) => api.post('/informes/completar-con-informe', data);

// Consultas especiales
export const getInformesPorOrden = (id_orden: number) => api.get<InformeTecnico[]>(`/informes/orden/${id_orden}`);
export const getInformesPorTecnico = (id_tecnico: number) => api.get<InformeTecnico[]>(`/informes/tecnico/${id_tecnico}`);
export const actualizarEstadoInforme = (id: number, estado: string) => 
  api.put(`/informes/${id}/estado`, { estado });

// ==================== USUARIOS ====================
export const getUsuarios = () => api.get<{ success: boolean; data: Usuario[] }>('/usuarios');
export const getUsuario = (id: number) => api.get<Usuario>(`/usuarios/${id}`);
export const createUsuario = (data: { username: string; password: string; rol?: string; id_tecnico?: number }) => 
  api.post('/usuarios', data);
export const updateUsuario = (id: number, data: Partial<Usuario> & { password?: string }) => 
  api.put(`/usuarios/${id}`, data);
export const deleteUsuario = (id: number) => api.delete(`/usuarios/${id}`);

export const cambiarPassword = (id: number, data: { passwordActual?: string; passwordNuevo: string }) => 
  api.put(`/usuarios/${id}/cambiar-password`, data);

export const cambiarMiPassword = (passwordNuevo: string) => 
  api.post('/usuarios/cambiar-mi-password', { passwordNuevo });

export const resetearPassword = (id: number, nuevaPassword?: string) => 
  api.post(`/usuarios/resetear-password/${id}`, { nuevaPassword });

// ==================== REPRESENTANTES ====================
export const getRepresentantes = (params?: { id_cliente?: number; estado?: string }) => 
  api.get<{ success: boolean; data: Representante[] }>('/representantes', { params });
export const getRepresentante = (id: number) => api.get<Representante>(`/representantes/${id}`);
export const createRepresentante = (data: { id_cliente: number; nombre: string; cedula?: string; telefono?: string; email?: string; cargo?: string; principal?: boolean }) => 
  api.post('/representantes', data);
export const updateRepresentante = (id: number, data: Partial<Representante>) => 
  api.put(`/representantes/${id}`, data);
export const deleteRepresentante = (id: number) => api.delete(`/representantes/${id}`);

// ==================== ACTIVIDADES ====================
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

export interface Jornada {
  id: number;
  id_tecnico: number;
  fecha: string;
  hora_inicio: string;
  hora_fin?: string;
  jornada_continua_id?: string;
  estado: 'abierta' | 'cerrada' | 'observacion';
  total_horas: number;
  horas_trabajo: number;
  horas_extras: number;
  total_pausas: number;
  observaciones?: string;
  tecnico?: { id: number; nombre: string };
  eventos?: RegistroEvento[];
}

export const createEvento = (data: { id_tecnico: number; tipo_evento: string; descripcion?: string; foto_url?: string; jornada_continua?: boolean }) => 
  api.post('/actividades', data);
export const getEventos = (params?: { id_tecnico?: number; fecha?: string; jornada_id?: number; estado?: string }) => 
  api.get<RegistroEvento[]>('/actividades', { params });
export const getJornadas = (params?: { id_tecnico?: number; fecha_inicio?: string; fecha_fin?: string; estado?: string }) => 
  api.get<Jornada[]>('/actividades/jornadas', { params });
export const getTiposEvento = () => api.get<{ value: string; label: string }[]>('/actividades/tipos');
export const aprobarEvento = (id: number, observaciones?: string) => 
  api.put(`/actividades/${id}/aprobar`, { observaciones });
export const observarEvento = (id: number, observaciones: string) => 
  api.put(`/actividades/${id}/observar`, { observaciones });
export const aprobarJornada = (id: number, observaciones?: string) => 
  api.put(`/actividades/jornadas/${id}/aprobar`, { observaciones });
export const observarJornada = (id: number, observaciones: string) => 
  api.put(`/actividades/jornadas/${id}/observar`, { observaciones });
export const getActividadesPendientes = () => api.get<Jornada[]>('/actividades/pendientes');

// ==================== AUSENCIAS ====================
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

export const createAusencia = (data: { id_tecnico: number; tipo: string; fecha_inicio: string; fecha_fin: string; descripcion?: string; foto_url?: string }) => 
  api.post('/ausencias', data);
export const getAusencias = (params?: { id_tecnico?: number; tipo?: string; estado?: string; fecha_inicio?: string; fecha_fin?: string }) => 
  api.get<Ausencia[]>('/ausencias', { params });
export const getTiposAusencia = () => api.get<{ value: string; label: string }[]>('/ausencias/tipos');
export const aprobarAusencia = (id: number, observaciones?: string) => 
  api.put(`/ausencias/${id}/aprobar`, { observaciones });
export const rechazarAusencia = (id: number, observaciones: string) => 
  api.put(`/ausencias/${id}/rechazar`, { observaciones });
export const getAusenciasPendientes = () => api.get<Ausencia[]>('/ausencias/pendientes');
export const deleteAusencia = (id: number) => api.delete(`/ausencias/${id}`);

// ==================== JORNADAS GRUPALES ====================
export interface TecnicoJornada {
  id?: number;
  id_registro?: number;
  id_tecnico: number;
  hora_llegada?: string;
  hora_salida?: string;
  observaciones?: string;
  tecnico?: { id: number; nombre: string };
}

export interface ComidaJornada {
  id?: number;
  id_registro?: number;
  tipo: 'desayuno' | 'almuerzo' | 'cena';
  hora_inicio: string;
  hora_fin: string;
}

export interface SegmentoTrabajo {
  id?: number;
  id_registro?: number;
  id_orden?: number | null;
  descripcion?: string;
  hora_inicio: string;
  hora_fin: string;
  tipo?: 'normal' | 'extra';
  orden?: { id: number; numero_orden: string; cliente?: { nombre: string }; local?: { nombre: string } };
}

export interface RegistroJornada {
  id: number;
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
  observaciones?: string;
  estado: string;
  createdAt?: string;
  tecnicos: TecnicoJornada[];
  comidas: ComidaJornada[];
  segmentos: SegmentoTrabajo[];
}

export const createJornadaGrupo = (data: {
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
  observaciones?: string;
  tecnicos: { id_tecnico: number; hora_llegada?: string; hora_salida?: string; observaciones?: string }[];
  comidas?: { tipo: string; hora_inicio: string; hora_fin: string }[];
  segmentos?: { id_orden?: number; descripcion?: string; hora_inicio: string; hora_fin: string; tipo?: string }[];
}) => api.post<RegistroJornada>('/horas/jornada-grupo', data);

export const getJornadasGrupo = (params?: { fecha_inicio?: string; fecha_fin?: string }) => 
  api.get<RegistroJornada[]>('/horas/jornadas', { params });

export const getJornada = (id: number) => api.get<RegistroJornada>(`/horas/jornada/${id}`);

export const updateJornada = (id: number, data: {
  fecha?: string;
  hora_entrada?: string;
  hora_salida?: string;
  observaciones?: string;
  tecnicos?: { id_tecnico: number; hora_llegada?: string; hora_salida?: string; observaciones?: string }[];
  comidas?: { tipo: string; hora_inicio: string; hora_fin: string }[];
  segmentos?: { id_orden?: number; descripcion?: string; hora_inicio: string; hora_fin: string; tipo?: string }[];
}) => api.put<RegistroJornada>(`/horas/jornada/${id}`, data);

export const deleteJornada = (id: number) => api.delete(`/horas/jornada/${id}`);

// ==================== INVENTARIO ====================
export interface Inventario {
  id?: number;
  id_externo: string;
  tipo_local: string;
  nombre_local: string;
  cliente: string;
  provincia?: string;
  ciudad?: string;
  tipo_monitoreo?: string;
  estado_operativo?: string;
  fecha_implementacion?: string;
  fecha_cierre?: string;
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
  cantidad?: number;
  marca?: string;
  detalle?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventarioResumen {
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

export const getInventario = (params?: {
  cliente?: string;
  ciudad?: string;
  tipo_sistema?: string;
  estado_operativo?: string;
  provincia?: string;
  id_externo?: string;
}) => api.get<Inventario[]>('/inventario', { params });

export const getInventarioById = (id: number) => api.get<Inventario>(`/inventario/${id}`);

export const getInventarioByLocal = (id_externo: string) => api.get<Inventario[]>(`/inventario/local/${id_externo}`);

export const createInventario = (data: Partial<Inventario>) => api.post<Inventario>('/inventario', data);

export const updateInventario = (id: number, data: Partial<Inventario>) => api.put<Inventario>(`/inventario/${id}`, data);

export const deleteInventario = (id: number) => api.delete(`/inventario/${id}`);

export const getInventarioResumen = () => api.get<InventarioResumen[]>('/inventario/resumen');

// ==================== IMPORTACIÓN DE ÓRDENES ====================
export const validarImportacionOrdenes = (file: File) => {
  const formData = new FormData();
  formData.append('archivo', file);
  return api.post<{ success: boolean; data: { errores: string[]; total_filas: number; filas_validas: number } }>('/ordenes/importar/validar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const ejecutarImportacionOrdenes = (file: File) => {
  const formData = new FormData();
  formData.append('archivo', file);
  return api.post<{ success: boolean; message: string; data: { importados: number; errores: string[] } }>('/ordenes/importar/ejecutar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// ==================== ARCHIVOS ====================
export const subirArchivo = async (file: File) => {
  const formData = new FormData();
  formData.append('archivo', file);
  return api.post<{ success: boolean; url: string; filename: string }>('/archivos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export default api;