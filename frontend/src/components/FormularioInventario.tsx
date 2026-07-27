/**
 * Componente de Formulario para Inventario
 */

import React, { useState, useEffect } from 'react';
import { InventarioItem } from '../services/inventario.service';

interface FormularioInventarioProps {
  item: InventarioItem | null;
  onSave: (data: Partial<InventarioItem>) => Promise<void>;
  onCancel: () => void;
}

const FormularioInventario: React.FC<FormularioInventarioProps> = ({ item, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<InventarioItem>>({
    id_externo: '',
    tipo_local: 'PDVLL',
    nombre_local: '',
    cliente: 'LOTERIA NACIONAL',
    provincia: '',
    ciudad: '',
    tipo_monitoreo: '',
    estado_operativo: 'OPERATIVO',
    direccion: '',
    gps: '',
    horario_apertura: '',
    horario_cierre: '',
    ip_1: '',
    ip_2: '',
    ip_3: '',
    contacto: '',
    correo: '',
    tipo_sistema: 'CCTV',
    categoria: '',
    cantidad: 1,
    marca: '',
  });

  useEffect(() => {
    if (item) {
      setFormData(item);
    }
  }, [item]);

  const handleChange = (campo: string, valor: string | number) => {
    setFormData({ ...formData, [campo]: valor });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">
        {item ? 'Editar Registro' : 'Nuevo Registro de Inventario'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Sección: Datos del Local */}
          <div className="md:col-span-2 lg:col-span-3">
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Datos del Local</h3>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID Externo *</label>
            <input
              type="text"
              value={formData.id_externo || ''}
              onChange={(e) => handleChange('id_externo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Local</label>
            <select
              value={formData.tipo_local || ''}
              onChange={(e) => handleChange('tipo_local', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PDVLL">PDVLL (Local)</option>
              <option value="PDVIL">PDVIL (Isla)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Local *</label>
            <input
              type="text"
              value={formData.nombre_local || ''}
              onChange={(e) => handleChange('nombre_local', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <input
              type="text"
              value={formData.cliente || ''}
              onChange={(e) => handleChange('cliente', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
            <input
              type="text"
              value={formData.provincia || ''}
              onChange={(e) => handleChange('provincia', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
            <input
              type="text"
              value={formData.ciudad || ''}
              onChange={(e) => handleChange('ciudad', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Monitoreo</label>
            <select
              value={formData.tipo_monitoreo || ''}
              onChange={(e) => handleChange('tipo_monitoreo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar</option>
              <option value="VISUAL 24/7">VISUAL 24/7</option>
              <option value="BAJO ALERTAS">BAJO ALERTAS</option>
              <option value="SIN MONITOREO">SIN MONITOREO</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado Operativo</label>
            <select
              value={formData.estado_operativo || ''}
              onChange={(e) => handleChange('estado_operativo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="OPERATIVO">OPERATIVO</option>
              <option value="CERRADO">CERRADO</option>
            </select>
          </div>
          
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              value={formData.direccion || ''}
              onChange={(e) => handleChange('direccion', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GPS</label>
            <input
              type="text"
              value={formData.gps || ''}
              onChange={(e) => handleChange('gps', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="lat,long"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horario Apertura</label>
            <input
              type="time"
              value={formData.horario_apertura || ''}
              onChange={(e) => handleChange('horario_apertura', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horario Cierre</label>
            <input
              type="time"
              value={formData.horario_cierre || ''}
              onChange={(e) => handleChange('horario_cierre', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IP 1</label>
            <input
              type="text"
              value={formData.ip_1 || ''}
              onChange={(e) => handleChange('ip_1', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IP 2</label>
            <input
              type="text"
              value={formData.ip_2 || ''}
              onChange={(e) => handleChange('ip_2', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IP 3</label>
            <input
              type="text"
              value={formData.ip_3 || ''}
              onChange={(e) => handleChange('ip_3', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
            <input
              type="text"
              value={formData.contacto || ''}
              onChange={(e) => handleChange('contacto', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
            <input
              type="email"
              value={formData.correo || ''}
              onChange={(e) => handleChange('correo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sección: Inventario Técnico */}
          <div className="md:col-span-2 lg:col-span-3 mt-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Inventario Técnico</h3>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Sistema</label>
            <select
              value={formData.tipo_sistema || ''}
              onChange={(e) => handleChange('tipo_sistema', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="CCTV">CCTV</option>
              <option value="ALARMA">ALARMA</option>
              <option value="HUMO">HUMO</option>
              <option value="ACCESO">ACCESO</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
            <input
              type="text"
              value={formData.categoria || ''}
              onChange={(e) => handleChange('categoria', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="camara, nvr, sensor, panel, etc."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
            <input
              type="number"
              min="0"
              value={formData.cantidad || 0}
              onChange={(e) => handleChange('cantidad', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
            <input
              type="text"
              value={formData.marca || ''}
              onChange={(e) => handleChange('marca', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="DT360, LOTERIA, etc."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {item ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormularioInventario;