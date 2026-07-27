/**
 * Componente de Tarjeta para Resumen de Local
 */

import React from 'react';
import { ResumenLocal } from '../services/inventario.service';

interface TarjetaLocalProps {
  local: ResumenLocal;
  onClick: () => void;
  expandido: boolean;
}

const TarjetaLocal: React.FC<TarjetaLocalProps> = ({ local, onClick, expandido }) => {
  const getEstadoColor = (estado?: string) => {
    switch (estado) {
      case 'OPERATIVO': return 'bg-green-100 text-green-700';
      case 'CERRADO': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSistemaIcon = (presente: boolean, nombre: string) => (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${presente ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
      {presente ? '✓' : '✗'} {nombre}
    </span>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div 
        className="p-4 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{local.nombre}</h3>
            <p className="text-sm text-gray-500">{local.cliente}</p>
          </div>
          {local.estado_operativo && (
            <span className={`px-2 py-1 rounded text-xs font-medium ${getEstadoColor(local.estado_operativo)}`}>
              {local.estado_operativo}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {getSistemaIcon(local.cctv, 'CCTV')}
          {getSistemaIcon(local.alarma, 'Alarma')}
          {getSistemaIcon(local.acceso, 'Acceso')}
          {getSistemaIcon(local.humo, 'Humo')}
        </div>

        <div className="text-sm text-gray-500">
          {local.ciudad && <span className="mr-3">📍 {local.ciudad}</span>}
          {local.tipo_monitoreo && <span>👁️ {local.tipo_monitoreo}</span>}
        </div>

        <div className="text-xs text-gray-400 mt-2">
          ID: {local.id_externo} • {local.componentes} componentes
        </div>
      </div>
    </div>
  );
};

export default TarjetaLocal;