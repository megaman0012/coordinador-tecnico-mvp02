/**
 * Componente de Modal de Confirmación
 */

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ModalConfirmacionProps {
  titulo: string;
  mensaje: string;
  onConfirm: () => void;
  onCancel: () => void;
  tipo?: 'peligro' | 'advertencia' | 'info';
}

const ModalConfirmacion: React.FC<ModalConfirmacionProps> = ({
  titulo,
  mensaje,
  onConfirm,
  onCancel,
  tipo = 'advertencia'
}) => {
  const getIconColor = () => {
    switch (tipo) {
      case 'peligro': return 'text-red-600';
      case 'advertencia': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  const getBgColor = () => {
    switch (tipo) {
      case 'peligro': return 'bg-red-50';
      case 'advertencia': return 'bg-yellow-50';
      default: return 'bg-blue-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 p-2 rounded-full ${getBgColor()}`}>
              <AlertTriangle className={`w-6 h-6 ${getIconColor()}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{titulo}</h3>
              <p className="mt-2 text-sm text-gray-500">{mensaje}</p>
            </div>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-white rounded-md ${
                tipo === 'peligro' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmacion;