/**
 * Componente de Filtros para Inventario
 */

import React from 'react';
import { InventarioFilters } from '../services/inventario.service';

interface FiltrosInventarioProps {
  filtros: InventarioFilters;
  onChange: (filtros: InventarioFilters) => void;
  opciones: {
    clientes: string[];
    ciudades: string[];
    tiposSistema: string[];
    estados: string[];
  };
}

const FiltrosInventario: React.FC<FiltrosInventarioProps> = ({ filtros, onChange, opciones }) => {
  const handleChange = (campo: keyof InventarioFilters, valor: string) => {
    onChange({ ...filtros, [campo]: valor });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Cliente */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
          <select
            value={filtros.cliente}
            onChange={(e) => handleChange('cliente', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {opciones.clientes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Ciudad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
          <select
            value={filtros.ciudad}
            onChange={(e) => handleChange('ciudad', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            {opciones.ciudades.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Tipo de Sistema */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Sistema</label>
          <select
            value={filtros.tipo_sistema}
            onChange={(e) => handleChange('tipo_sistema', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {opciones.tiposSistema.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Estado Operativo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select
            value={filtros.estado_operativo}
            onChange={(e) => handleChange('estado_operativo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {opciones.estados.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default FiltrosInventario;