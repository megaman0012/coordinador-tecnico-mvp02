/**
 * Componente de Importación de Excel para Órdenes
 * Fase 1: Validar sin insertar
 * Fase 2: Ejecutar importación definitiva
 */

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader, FileCheck, FileX, Download } from 'lucide-react';
import { validarImportacionOrdenes, ejecutarImportacionOrdenes } from '../services/api';

interface ImportarOrdenesProps {
  onImportacionCompleta: () => void;
}

// Función para obtener URL dinámica según el navegador
const getApiUrl = () => {
  const hostname = window.location.hostname;
  const port = 3002;
  return `http://${hostname}:${port}/api`;
};

const ImportarOrdenes: React.FC<ImportarOrdenesProps> = ({ onImportacionCompleta }) => {
  const [file, setFile] = useState<File | null>(null);
  const [validando, setValidando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [resultadoValidacion, setResultadoValidacion] = useState<{
    errores: string[];
    total_filas: number;
    filas_validas: number;
  } | null>(null);
  const [resultadoImportacion, setResultadoImportacion] = useState<{
    success: boolean;
    message: string;
    importados: number;
    errores: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Función para descargar plantilla
  const descargarPlantilla = async () => {
    setDescargandoPlantilla(true);
    setError('');
    try {
      const response = await fetch(`${getApiUrl()}/ordenes/plantilla`, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText || 'Error al descargar plantilla'}`);
      }
      
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('La plantilla está vacía');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_ordenes.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error descargando plantilla:', err);
      setError(err.message || 'Error al descargar plantilla');
    } finally {
      setDescargandoPlantilla(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.xlsx?$/)) {
        setError('El archivo debe ser un Excel (.xlsx o .xls)');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResultadoValidacion(null);
      setResultadoImportacion(null);
    }
  };

  const handleValidar = async () => {
    if (!file) return;

    setValidando(true);
    setError(null);
    setResultadoValidacion(null);
    setResultadoImportacion(null);

    try {
      const result = await validarImportacionOrdenes(file) as any;
      const response = result.data;
      const data = response.data || response;
      setResultadoValidacion({
        errores: data.errores || [],
        total_filas: data.total_filas || 0,
        filas_validas: data.filas_validas || 0
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Error al validar el archivo');
    } finally {
      setValidando(false);
    }
  };

  const handleEjecutar = async () => {
    if (!file) return;

    setImportando(true);
    setError(null);

    try {
      const result = await ejecutarImportacionOrdenes(file) as any;
      const response = result.data;
      const data = response.data || response;
      
      setResultadoImportacion({
        success: data.success ?? response.success ?? true,
        message: data.message || '',
        importados: data.importados ?? 0,
        errores: data.errores ?? []
      });
      
      if ((data.success ?? response.success) || data.importados > 0) {
        onImportacionCompleta();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Error al importar el archivo');
    } finally {
      setImportando(false);
    }
  };

  const handleLimpiar = () => {
    setFile(null);
    setResultadoValidacion(null);
    setResultadoImportacion(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Upload className="text-blue-600" size={24} />
        Importar Órdenes desde Excel
      </h2>

      {/* Botón descargar plantilla */}
      <div className="mb-4">
        <button
          onClick={descargarPlantilla}
          disabled={descargandoPlantilla}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            descargandoPlantilla
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {descargandoPlantilla ? (
            <Loader className="animate-spin" size={20} />
          ) : (
            <Download size={20} />
          )}
          Descargar Plantilla con Ejemplos
        </button>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-medium">Proceso de importación en dos fases</p>
            <p className="mt-1">1. Primero valide el archivo para verificar errores. 2. Si es válido, ejecute la importación.</p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            file 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
          }`}
        >
          <FileSpreadsheet className={`mx-auto mb-2 ${file ? 'text-green-600' : 'text-gray-400'}`} size={48} />
          {file ? (
            <div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-600">Haz clic o arrastra un archivo Excel</p>
              <p className="text-sm text-gray-400">Archivos permitidos: .xlsx, .xls</p>
            </div>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={handleValidar}
          disabled={!file || validando}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            !file || validando
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-yellow-600 text-white hover:bg-yellow-700'
          }`}
        >
          {validando ? (
            <>
              <Loader className="animate-spin" size={20} />
              Validando...
            </>
          ) : (
            <>
              <FileCheck size={20} />
              Fase 1: Validar
            </>
          )}
        </button>

        <button
          onClick={handleEjecutar}
          disabled={!file || !resultadoValidacion || resultadoValidacion.errores.length > 0 || importando}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            !file || !resultadoValidacion || resultadoValidacion.errores.length > 0 || importando
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {importando ? (
            <>
              <Loader className="animate-spin" size={20} />
              Importando...
            </>
          ) : (
            <>
              <Upload size={20} />
              Fase 2: Importar
            </>
          )}
        </button>

        {(file || resultadoValidacion || resultadoImportacion) && (
          <button
            onClick={handleLimpiar}
            disabled={validando || importando}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 mb-4">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Resultado Validación */}
      {resultadoValidacion && (
        <div className={`border rounded-lg p-4 mb-4 ${resultadoValidacion.errores.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            {resultadoValidacion.errores.length > 0 ? (
              <>
                <AlertCircle className="text-yellow-600" size={24} />
                Validación con Errores
              </>
            ) : (
              <>
                <Check className="text-green-600" size={24} />
                Validación Exitosa
              </>
            )}
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-gray-600">{resultadoValidacion.total_filas}</p>
              <p className="text-sm text-gray-600">Total Filas</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-green-600">{resultadoValidacion.filas_validas}</p>
              <p className="text-sm text-gray-600">Filas Válidas</p>
            </div>
          </div>

          {resultadoValidacion.errores.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="font-medium text-red-700 mb-2">Errores encontrados:</p>
              <ul className="text-sm text-red-600 space-y-1 max-h-40 overflow-y-auto">
                {resultadoValidacion.errores.slice(0, 20).map((err, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <FileX size={14} className="flex-shrink-0 mt-1" />
                    <span>{err}</span>
                  </li>
                ))}
                {resultadoValidacion.errores.length > 20 && (
                  <li className="text-red-500 font-medium">...y {resultadoValidacion.errores.length - 20} errores más</li>
                )}
              </ul>
            </div>
          )}

          {resultadoValidacion.errores.length === 0 && (
            <p className="text-green-700 text-sm">✅ El archivo está listo para importar. Haga clic en "Fase 2: Importar"</p>
          )}
        </div>
      )}

      {/* Resultado Importación */}
      {resultadoImportacion && (
        <div className={`border rounded-lg p-4 ${resultadoImportacion.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            {resultadoImportacion.success ? (
              <>
                <Check className="text-green-600" size={24} />
                Importación Completada
              </>
            ) : (
              <>
                <AlertCircle className="text-red-600" size={24} />
                Importación con Errores
              </>
            )}
          </h3>

          <div className="mb-4">
            <p className="text-xl font-bold text-center text-green-600">{resultadoImportacion.importados}</p>
            <p className="text-sm text-gray-600 text-center">Órdenes importadas</p>
          </div>

          {resultadoImportacion.errores.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="font-medium text-red-700 mb-2">Errores durante importación:</p>
              <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
                {resultadoImportacion.errores.slice(0, 10).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Información */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
        <p className="font-medium mb-1">📋 Estructura esperada del Excel:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Obligatorios:</strong> numero_orden, id_cliente, id_local, tipo_trabajo, prioridad</li>
          <li><strong>Tipos válidos:</strong> visita_tecnica, implementacion, proyecto, correctivo, preventivo, gestion_operativa</li>
          <li><strong>Prioridades:</strong> baja, media, alta, urgente</li>
          <li><strong>Estados:</strong> pendiente, asignada, en_proceso, completada, no_cumplida, reprogramada</li>
        </ul>
      </div>
    </div>
  );
};

export default ImportarOrdenes;
