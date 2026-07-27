/**
 * Servicio de API para Inventario
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tipos
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
  cantidad: number;
  marca?: string;
  detalle?: Record<string, any>;
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

// API
export const inventarioService = {
  // Obtener todo el inventario con filtros
  getInventario: async (filters?: InventarioFilters): Promise<InventarioItem[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const response = await api.get(`/inventario?${params.toString()}`);
    return response.data.data;
  },

  // Obtener resumen agrupado por local
  getResumen: async (): Promise<ResumenLocal[]> => {
    const response = await api.get('/inventario/resumen');
    return response.data.data;
  },

  // Obtener inventario de un local específico
  getInventarioByLocal: async (id_externo: string): Promise<InventarioItem[]> => {
    const response = await api.get(`/inventario/local/${id_externo}`);
    return response.data.data;
  },

  // Obtener un registro por ID
  getInventarioById: async (id: number): Promise<InventarioItem> => {
    const response = await api.get(`/inventario/${id}`);
    return response.data.data;
  },

  // Crear nuevo registro
  createInventario: async (data: Partial<InventarioItem>): Promise<InventarioItem> => {
    const response = await api.post('/inventario', data);
    return response.data.data;
  },

  // Actualizar registro
  updateInventario: async (id: number, data: Partial<InventarioItem>): Promise<InventarioItem> => {
    const response = await api.put(`/inventario/${id}`, data);
    return response.data.data;
  },

  // Eliminar registro
  deleteInventario: async (id: number): Promise<void> => {
    await api.delete(`/inventario/${id}`);
  },

  // Importar desde Excel
  importarExcel: async (file: File): Promise<{
    success: boolean;
    insertados: number;
    duplicados: number;
    errores: string[];
    logs: string[];
  }> => {
    const formData = new FormData();
    formData.append('archivo', file);
    
    const response = await api.post('/inventario/importar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.data;
  },

  // Descargar plantilla
  descargarPlantilla: async (): Promise<Blob> => {
    const response = await fetch('http://localhost:3002/api/inventario/plantilla');
    if (!response.ok) {
      throw new Error('Error al descargar plantilla');
    }
    return response.blob();
  },
};

export default inventarioService;