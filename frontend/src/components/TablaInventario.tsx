/**
 * Componente de Tabla de Inventario (Vista Detallada)
 */

import React from 'react';
import { inventarioService, InventarioItem } from '../services/inventario.service';

interface TablaInventarioProps {
  inventario: InventarioItem[];
  onEdit: (item: InventarioItem) => void;
  onDelete: (id: number) => void;
}

const TablaInventario: React.FC<TablaInventarioProps> = ({ inventario, onEdit, onDelete }) => {
  const getSistemaBadge = (tipo?: string) => {
    const colores: Record<string, string> = {
      CCTV: 'bg-purple-100 text-purple-700',
      ALARMA: 'bg-red-100 text-red-700',
      ACCESO: 'bg-blue-100 text-blue-700',
      HUMO: 'bg-orange-100 text-orange-700',
    };
    return tipo ? (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colores[tipo] || 'bg-gray-100 text-gray-700'}`}>
        {tipo}
      </span>
    ) : null;
  };

  const getEstadoBadge = (estado?: string) => {
    const colores: Record<string, string> = {
      OPERATIVO: 'bg-green-100 text-green-700',
      CERRADO: 'bg-red-100 text-red-700',
    };
    return estado ? (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colores[estado] || 'bg-gray-100 text-gray-700'}`}>
        {estado}
      </span>
    ) : null;
  };

  if (inventario.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay registros de inventario
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Local</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ciudad</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sistema</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {inventario.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900">{item.id_externo}</td>
              <td className="px-4 py-3 text-sm text-gray-900">{item.nombre_local}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{item.cliente}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{item.ciudad || '-'}</td>
              <td className="px-4 py-3">{getSistemaBadge(item.tipo_sistema)}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{item.categoria || '-'}</td>
              <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.cantidad}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{item.marca || '-'}</td>
              <td className="px-4 py-3">{getEstadoBadge(item.estado_operativo)}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onEdit(item)}
                  className="text-blue-600 hover:text-blue-800 mr-2 text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TablaInventario;