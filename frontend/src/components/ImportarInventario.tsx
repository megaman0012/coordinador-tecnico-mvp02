/**
 * Componente de Importación de Excel para Inventario
 */

import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader, Download } from 'lucide-react';
import { inventarioService } from '../services/inventario.service';

interface ImportarInventarioProps {
  onImportacionCompleta: () => void;
}

const ImportarInventario: React.FC<ImportarInventarioProps> = ({ onImportacionCompleta }) => {
  const [file, setFile] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [resultado, setResultado] = useState<{
    success: boolean;
    insertados: number;
    duplicados: number;
    errores: string[];
    logs: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.xlsx?$/)) {
        setError('El archivo debe ser un Excel (.xlsx o .xls)');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResultado(null);
    }
  };

  const handleImportar = async () => {
    if (!file) return;

    setImportando(true);
    setError(null);
    setResultado(null);

    try {
      const result = await inventarioService.importarExcel(file);
      setResultado(result);
      
      if (result.success) {
        onImportacionCompleta();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al importar el archivo');
    } finally {
      setImportando(false);
    }
  };

  const handleDescargarPlantilla = async () => {
    setDescargando(true);
    setError(null);
    try {
      console.log('[DOWNLOAD] Iniciando descarga de plantilla...');
      
      // Usar la misma URL del api.ts
      const hostname = window.location.hostname;
      const apiUrl = `http://${hostname}:3002/api`;
      console.log('[DOWNLOAD] URL:', `${apiUrl}/inventario/plantilla`);
      
      const response = await fetch(`${apiUrl}/inventario/plantilla`);
      console.log('[DOWNLOAD] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Error al descargar: ' + response.status);
      }
      
      const blob = await response.blob();
      console.log('[DOWNLOAD] Blob recibido:', blob.size, blob.type);
      
      if (blob.size === 0) {
        throw new Error('El archivo está vacío');
      }
      
      const url = window.URL.createObjectURL(blob);
      console.log('[DOWNLOAD] URL:', url);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_inventario.xlsx';
      document.body.appendChild(a);
      
      console.log('[DOWNLOAD] Disparando click...');
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        console.log('[DOWNLOAD] Completado');
      }, 100);
      
    } catch (err: any) {
      console.error('[DOWNLOAD] Error:', err);
      setError(err.message || 'Error al descargar la plantilla');
    } finally {
      setDescargando(false);
    }
  };

  const handleLimpiar = () => {
    setFile(null);
    setResultado(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Upload className="text-blue-600" size={24} />
        Importar Inventario desde Excel
      </h2>

      {/* Botón descargar plantilla */}
      <div className="mb-4">
        <button
          onClick={handleDescargarPlantilla}
          disabled={descargando}
          className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-700 rounded-lg hover:bg-green-50"
        >
          {descargando ? (
            <Loader className="animate-spin" size={20} />
          ) : (
            <Download size={20} />
          )}
          Descargar Plantilla
        </button>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-medium">Solo se permite subir archivos generados desde la plantilla</p>
            <p className="mt-1">Descargue la plantilla oficial, complete los datos y súbala aquí.</p>
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
          onClick={handleImportar}
          disabled={!file || importando}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            !file || importando
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
              Importar Inventario
            </>
          )}
        </button>

        {(file || resultado) && (
          <button
            onClick={handleLimpiar}
            disabled={importando}
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

      {/* Resultado */}
      {resultado && (
        <div className={`border rounded-lg p-4 ${resultado.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            {resultado.success ? (
              <>
                <Check className="text-green-600" size={24} />
                Importación Completada
              </>
            ) : (
              <>
                <AlertCircle className="text-yellow-600" size={24} />
                Importación con Advertencias
              </>
            )}
          </h3>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-green-600">{resultado.insertados}</p>
              <p className="text-sm text-gray-600">Insertados</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{resultado.duplicados}</p>
              <p className="text-sm text-gray-600">Duplicados</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-red-600">{resultado.errores}</p>
              <p className="text-sm text-gray-600">Errores</p>
            </div>
          </div>

          {/* Logs detallados */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-blue-600">
              Ver detalles de la importación
            </summary>
            <div className="mt-2 bg-gray-900 text-gray-100 p-4 rounded-lg max-h-64 overflow-y-auto text-xs font-mono">
              {resultado.logs.map((log, idx) => (
                <div key={idx} className="mb-1">{log}</div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Información */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
        <p className="font-medium mb-1">📋 Campos de la plantilla:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Obligatorios:</strong> id_externo, nombre_local, tipo_sistema, categoria, cantidad</li>
          <li><strong>Sistemas válidos:</strong> CCTV, ALARMA, HUMO, ACCESO</li>
          <li><strong>Ejemplo:</strong> 001, PDVLL, LOCAL EJEMPLO, LOTERIA NACIONAL, GUAYAS, GUAYAQUIL, etc.</li>
        </ul>
      </div>
    </div>
  );
};

export default ImportarInventario;