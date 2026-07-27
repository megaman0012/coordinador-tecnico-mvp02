/**
 * Página de Inventario - MVP Coordinador Técnico
 * Sistema centralizado de inventario técnico
 */

import React, { useState, useEffect, useMemo } from 'react';
import { inventarioService, InventarioItem, ResumenLocal, InventarioFilters } from '../services/inventario.service';
import FiltrosInventario from '../components/FiltrosInventario';
import TarjetaLocal from '../components/TarjetaLocal';
import TablaInventario from '../components/TablaInventario';
import FormularioInventario from '../components/FormularioInventario';
import ModalConfirmacion from '../components/ModalConfirmacion';
import ImportarInventario from '../components/ImportarInventario';
import { Search, Plus, Grid, List, Package, X, Upload } from 'lucide-react';

type VistaMode = 'agrupada' | 'detallada';

const Inventario: React.FC = () => {
  // Estado de datos
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [resumen, setResumen] = useState<ResumenLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado de UI
  const [vista, setVista] = useState<VistaMode>('agrupada');
  const [filtros, setFiltros] = useState<InventarioFilters>({
    cliente: '',
    ciudad: '',
    tipo_sistema: '',
    estado_operativo: '',
  });
  const [busqueda, setBusqueda] = useState('');
  const [localExpandido, setLocalExpandido] = useState<string | null>(null);
  const [detalleLocal, setDetalleLocal] = useState<InventarioItem[]>([]);

  // Estado del modal/formulario
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<InventarioItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showImportar, setShowImportar] = useState(false);

  // Cargar datos
  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [inventarioData, resumenData] = await Promise.all([
        inventarioService.getInventario(filtros),
        inventarioService.getResumen()
      ]);
      
      setInventario(inventarioData);
      setResumen(resumenData);
    } catch (err) {
      console.error('Error cargando inventario:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  // Obtener opciones para filtros
  const opciones = useMemo(() => {
    const clientes = Array.from(new Set(inventario.map(i => i.cliente).filter(Boolean) as string[]));
    const ciudades = Array.from(new Set(inventario.map(i => i.ciudad).filter(Boolean) as string[]));
    const tiposSistema = Array.from(new Set(inventario.map(i => i.tipo_sistema).filter(Boolean) as string[]));
    const estados = Array.from(new Set(inventario.map(i => i.estado_operativo).filter(Boolean) as string[]));
    
    return { clientes, ciudades, tiposSistema, estados };
  }, [inventario]);

  // Filtrar resumen por búsqueda
  const resumenFiltrado = useMemo(() => {
    if (!busqueda) return resumen;
    const lower = busqueda.toLowerCase();
    return resumen.filter(r => 
      r.nombre.toLowerCase().includes(lower) ||
      r.cliente.toLowerCase().includes(lower) ||
      r.id_externo.toLowerCase().includes(lower) ||
      r.ciudad?.toLowerCase().includes(lower)
    );
  }, [resumen, busqueda]);

  // Manejar click en local (vista agrupada)
  const handleLocalClick = async (local: ResumenLocal) => {
    if (localExpandido === local.id_externo) {
      setLocalExpandido(null);
      setDetalleLocal([]);
    } else {
      try {
        const detalle = await inventarioService.getInventarioByLocal(local.id_externo);
        setDetalleLocal(detalle);
        setLocalExpandido(local.id_externo);
      } catch (err) {
        console.error('Error al cargar detalle:', err);
      }
    }
  };

  // CRUD: Crear/Actualizar
  const handleSave = async (data: Partial<InventarioItem>) => {
    try {
      if (editItem) {
        await inventarioService.updateInventario(editItem.id, data);
      } else {
        await inventarioService.createInventario(data);
      }
      setShowModal(false);
      setEditItem(null);
      cargarDatos();
    } catch (err: any) {
      console.error('Error guardando:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Error al guardar el registro';
      alert(errorMessage);
    }
  };

  // CRUD: Eliminar
  const handleDelete = (id: number) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    
    try {
      await inventarioService.deleteInventario(deleteId);
      setShowDeleteModal(false);
      setDeleteId(null);
      cargarDatos();
    } catch (err) {
      console.error('Error eliminando:', err);
      alert('Error al eliminar el registro');
    }
  };

  // Editar
  const handleEdit = (item: InventarioItem) => {
    setEditItem(item);
    setShowModal(true);
  };

  // Nuevo registro
  const handleNew = () => {
    setEditItem(null);
    setShowModal(true);
  };

  if (loading && inventario.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-blue-600" />
            Inventario Técnico
          </h1>
          <p className="text-gray-500 text-sm">
            {inventario.length} componentes en {resumen.length} locales
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportar(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Upload size={20} />
            Importar Excel
          </button>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Nuevo Registro
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filtros */}
      <FiltrosInventario
        filtros={{
          cliente: filtros.cliente || '',
          ciudad: filtros.ciudad || '',
          tipo_sistema: filtros.tipo_sistema || '',
          estado_operativo: filtros.estado_operativo || '',
        }}
        onChange={(f) => setFiltros(f)}
        opciones={opciones}
      />

      {/* Barra de búsqueda y toggle vista */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, cliente, ID..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVista('agrupada')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${vista === 'agrupada' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Grid size={18} />
            <span className="hidden sm:inline">Agrupada</span>
          </button>
          <button
            onClick={() => setVista('detallada')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${vista === 'detallada' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <List size={18} />
            <span className="hidden sm:inline">Detallada</span>
          </button>
        </div>
      </div>

      {/* Vista */}
      {vista === 'agrupada' ? (
        <div className="space-y-4">
          {resumenFiltrado.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No se encontraron locales
            </div>
          ) : (
            resumenFiltrado.map((local) => (
              <div key={local.id_externo}>
                <TarjetaLocal
                  local={local}
                  onClick={() => handleLocalClick(local)}
                  expandido={localExpandido === local.id_externo}
                />
                
                {/* Detalle expandido */}
                {localExpandido === local.id_externo && (
                  <div className="mt-2 pl-4 border-l-2 border-blue-200">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-700">Componentes del local</h4>
                      <button
                        onClick={() => {
                          setLocalExpandido(null);
                          setDetalleLocal([]);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <TablaInventario
                      inventario={detalleLocal}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <TablaInventario
          inventario={inventario}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Modal de formulario */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <FormularioInventario
              item={editItem}
              onSave={handleSave}
              onCancel={() => {
                setShowModal(false);
                setEditItem(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && (
        <ModalConfirmacion
          titulo="Eliminar Registro"
          mensaje="¿Está seguro de eliminar este registro de inventario? Esta acción no se puede deshacer."
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteModal(false);
            setDeleteId(null);
          }}
          tipo="peligro"
        />
      )}

      {/* Modal de importación de Excel */}
      {showImportar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <ImportarInventario
              onImportacionCompleta={() => {
                setShowImportar(false);
                cargarDatos();
              }}
            />
            <button
              onClick={() => setShowImportar(false)}
              className="mt-4 w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventario;