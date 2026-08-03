import React, { useEffect, useState } from 'react';
import { Plus, Filter, Edit, Eye, Play, CheckCircle, AlertTriangle, Clock, ArrowRight, UserPlus, Download, Upload, Trash2, FileText } from 'lucide-react';
import { getOrdenes, createOrden, updateOrden, deleteOrden, getClientes, getLocales, getTecnicos, getHistorialOrden, createAsignacion, subirArchivo, getInformesPorOrden } from '../services/api';
import { Orden, Cliente, Local, Tecnico, TipoTrabajo, Prioridad, EstadoOrden, HistorialOrden } from '../types';
import * as XLSX from 'xlsx';
import ImportarOrdenes from '../components/ImportarOrdenes';

const Ordenes: React.FC = () => {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [showImportarModal, setShowImportarModal] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<Orden | null>(null);
  const [historial, setHistorial] = useState<HistorialOrden[]>([]);
  const [informesRelacionados, setInformesRelacionados] = useState<any[]>([]);
  const [filtro, setFiltro] = useState({ estado: '', prioridad: '' });
  const [busquedaRapida, setBusquedaRapida] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'numero_orden', direction: 'asc' });
  const [formError, setFormError] = useState('');
  const [asignarAhora, setAsignarAhora] = useState(false);
  const [asignarError, setAsignarError] = useState('');
  const [asignarData, setAsignarData] = useState({ id_tecnico: [] as number[], fecha_asignacion: new Date().toISOString().split('T')[0], hora_inicio: '08:00', hora_fin: '17:00' });
  const [formData, setFormData] = useState({
    id_cliente: '',
    id_local: '',
    tipo_trabajo: 'visita_tecnica' as TipoTrabajo,
    prioridad: 'media' as Prioridad,
    descripcion: '',
    fecha_programada: '',
    cantidad_tecnicos: '1',
    horas_estimadas: '1'
  });
  
  // Estados para búsqueda de local
  const [busquedaLocal, setBusquedaLocal] = useState('');
  const [showDropdownLocal, setShowDropdownLocal] = useState(false);
  
  // Filtrar locales según búsqueda y cliente seleccionado
  const localesFiltrados = React.useMemo(() => {
    let filtered = locales;
    // Filtrar por cliente si hay uno seleccionado
    if (formData.id_cliente) {
      filtered = filtered.filter(l => l.id_cliente === parseInt(formData.id_cliente));
    }
    // Filtrar por búsqueda
    if (busquedaLocal) {
      const search = busquedaLocal.toLowerCase();
      filtered = filtered.filter(l => 
        l.nombre.toLowerCase().includes(search) || 
        (l.direccion && l.direccion.toLowerCase().includes(search))
      );
    }
    return filtered;
  }, [locales, formData.id_cliente, busquedaLocal]);

  // Handler de ordenamiento
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Órdenes filtradas y ordenadas
  const ordenesFiltradas = React.useMemo(() => {
    let filtered = ordenes;
    
    // Filtros existentes
    if (filtro.estado) filtered = filtered.filter(o => o.estado === filtro.estado);
    if (filtro.prioridad) filtered = filtered.filter(o => o.prioridad === filtro.prioridad);
    
    // Búsqueda rápida
    if (busquedaRapida) {
      const texto = busquedaRapida.toLowerCase();
      filtered = filtered.filter(o => 
        o.numero_orden?.toLowerCase().includes(texto) ||
        o.cliente?.nombre?.toLowerCase().includes(texto) ||
        o.local?.nombre?.toLowerCase().includes(texto)
      );
    }
    
    // Ordenamiento
    return filtered.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof Orden];
      const bVal = b[sortConfig.key as keyof Orden];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [ordenes, filtro, busquedaRapida, sortConfig]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-local')) {
        setShowDropdownLocal(false);
      }
    };
    if (showDropdownLocal) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdownLocal]);

  // Limpiar búsqueda cuando cambia el cliente
  useEffect(() => {
    setBusquedaLocal('');
    setShowDropdownLocal(false);
  }, [formData.id_cliente]);

  const loadData = async () => {
    try {
      const [ordenesRes, clientesRes, localesRes, tecnicosRes] = await Promise.all([
        getOrdenes(filtro.estado || filtro.prioridad ? filtro : undefined),
        getClientes(),
        getLocales(),
        getTecnicos()
      ]);
      setOrdenes(ordenesRes.data as any);
      setClientes(clientesRes.data as any);
      setLocales(localesRes.data as any);
      setTecnicos(tecnicosRes.data as any);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    // Validar cliente
    if (!formData.id_cliente) {
      setFormError('Debe seleccionar un cliente');
      return;
    }
    // Validar local
    if (!formData.id_local) {
      setFormError('Debe seleccionar un local');
      return;
    }
    
    try {
      const ordenData = {
        ...formData,
        id_cliente: parseInt(formData.id_cliente),
        id_local: parseInt(formData.id_local),
        cantidad_tecnicos: parseInt(formData.cantidad_tecnicos) || 1,
        horas_estimadas: parseInt(formData.horas_estimadas) || 1
      };
      
      let ordenId: number;
      
      if (ordenSeleccionada) {
        // Editar orden existente
        await updateOrden(ordenSeleccionada.id, ordenData);
        ordenId = ordenSeleccionada.id;
      } else {
        // Crear nueva orden
        const ordenRes = await createOrden(ordenData);
        ordenId = ordenRes.data.id;
      }
      
      // Si marcada la opción de asignar ahora
      if (asignarAhora && asignarData.id_tecnico.length > 0 && asignarData.fecha_asignacion) {
        // Asignar todos los técnicos seleccionados
        for (const idTecnico of asignarData.id_tecnico) {
          await createAsignacion({
            id_orden: ordenId,
            id_tecnico: idTecnico,
            fecha_asignacion: asignarData.fecha_asignacion
          });
        }
      }
      
      setShowModal(false);
      setOrdenSeleccionada(null);
      setBusquedaLocal('');
      setShowDropdownLocal(false);
      setAsignarAhora(false);
      setAsignarData({ id_tecnico: [], fecha_asignacion: new Date().toISOString().split('T')[0], hora_inicio: '08:00', hora_fin: '17:00' });
      setFormData({
        id_cliente: '',
        id_local: '',
        tipo_trabajo: 'visita_tecnica',
        prioridad: 'media',
        descripcion: '',
        fecha_programada: '',
        cantidad_tecnicos: '1',
        horas_estimadas: '1'
      });
      loadData();
    } catch (error: any) {
      console.error('Error guardando orden:', error);
      setFormError(error.response?.data?.error || 'Error al guardar orden');
    }
  };

  const getEstadoColor = (estado: EstadoOrden) => {
    switch (estado) {
      case 'completada': return 'bg-green-100 text-green-700';
      case 'en_proceso': return 'bg-blue-100 text-blue-700';
      case 'pendiente': return 'bg-gray-100 text-gray-700';
      case 'asignada': return 'bg-purple-100 text-purple-700';
      case 'no_cumplida': return 'bg-red-100 text-red-700';
      case 'reprogramada': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPrioridadColor = (prioridad: Prioridad) => {
    switch (prioridad) {
      case 'urgente': return 'bg-red-100 text-red-700';
      case 'alta': return 'bg-orange-100 text-orange-700';
      case 'media': return 'bg-yellow-100 text-yellow-700';
      case 'baja': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleVerDetalle = async (orden: Orden) => {
    setOrdenSeleccionada(orden);
    setInformesRelacionados([]);
    try {
      const informes = await getInformesPorOrden(orden.id);
      setInformesRelacionados(informes.data || []);
    } catch (error) {
      console.error('Error al cargar informes:', error);
    }
    setShowDetailModal(true);
  };

  const handleEditar = (orden: Orden) => {
    setOrdenSeleccionada(orden);
    setFormError('');
    setAsignarAhora(false);
    
    // Cargar el nombre del local para la búsqueda
    const localEncontrado = locales.find(l => l.id === orden.id_local);
    
    setFormData({
      id_cliente: orden.id_cliente.toString(),
      id_local: orden.id_local.toString(),
      tipo_trabajo: orden.tipo_trabajo as TipoTrabajo,
      prioridad: orden.prioridad as Prioridad,
      descripcion: orden.descripcion || '',
      fecha_programada: orden.fecha_programada ? (() => {
        const d = new Date(orden.fecha_programada);
        const userTimezoneOffset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() + userTimezoneOffset).toISOString().split('T')[0];
      })() : '',
      cantidad_tecnicos: orden.cantidad_tecnicos?.toString() || '1',
      horas_estimadas: orden.horas_estimadas?.toString() || '1'
    });
    setBusquedaLocal(localEncontrado?.nombre || '');
    setShowModal(true);
  };

  const handleCambiarEstado = async (orden: Orden, nuevoEstado: EstadoOrden) => {
    try {
      await updateOrden(orden.id, { estado: nuevoEstado });
      loadData();
    } catch (error) {
      console.error('Error cambiando estado:', error);
    }
  };

  const handleEliminar = async (orden: Orden) => {
    const confirmDelete = window.confirm(`¿Está seguro de eliminar la orden "${orden.numero_orden}"? Esta acción no se puede deshacer.`);
    if (!confirmDelete) return;
    
    try {
      await deleteOrden(orden.id);
      loadData();
    } catch (error: any) {
      console.error('Error eliminando orden:', error);
      const mensaje = error.response?.data?.error || error.message || 'Error al eliminar la orden';
      alert(mensaje);
    }
  };

  const handleVerHistorial = async (orden: Orden) => {
    try {
      setOrdenSeleccionada(orden);
      const res = await getHistorialOrden(orden.id);
      setHistorial(res.data);
      setShowHistorialModal(true);
    } catch (error) {
      console.error('Error cargando historial:', error);
    }
  };

  const handleAsignarTecnico = async () => {
    if (!ordenSeleccionada || asignarData.id_tecnico.length === 0) return;
    setAsignarError('');
    try {
      // Asignar todos los técnicos seleccionados
      for (const idTecnico of asignarData.id_tecnico) {
        await createAsignacion({
          id_orden: ordenSeleccionada.id,
          id_tecnico: idTecnico,
          fecha_asignacion: asignarData.fecha_asignacion,
          hora_inicio_programada: asignarData.hora_inicio,
          hora_fin_programada: asignarData.hora_fin
        });
      }
      // Update orden state to 'asignada'
      await updateOrden(ordenSeleccionada.id, { estado: 'asignada' });
      setShowAsignarModal(false);
      setAsignarData({ id_tecnico: [], fecha_asignacion: new Date().toISOString().split('T')[0], hora_inicio: '08:00', hora_fin: '17:00' });
      loadData();
    } catch (error: any) {
      console.error('Error asignando técnico:', error);
      setAsignarError(error.response?.data?.error || 'Error al asignar técnico');
    }
  };

  // Exportar a Excel
  const handleExportExcel = () => {
    if ((ordenes || []).length === 0) {
      alert('No hay órdenes para exportar. Ajusta los filtros o verifica que existan órdenes.');
      return;
    }
    
    // Validar que los datos sean válidos
    const datosValidos = ordenes.every(o => o && o.numero_orden && o.cliente);
    if (!datosValidos) {
      alert('Algunos datos de las órdenes no están completos. La exportación podría tener errores.');
    }
    
    const datos = ordenes.map((orden) => ({
      'Número Orden': orden.numero_orden,
      'Cliente': orden.cliente?.nombre || 'N/A',
      'Local': orden.local?.nombre || 'N/A',
      'Tipo': orden.tipo_trabajo.replace('_', ' '),
      'Prioridad': orden.prioridad,
      'Estado': orden.estado,
      'N° Técnicos': orden.cantidad_tecnicos || 1,
      'Horas Est.': orden.horas_estimadas || 1,
      'Fecha Programada': orden.fecha_programada 
        ? (() => {
            const d = new Date(orden.fecha_programada);
            const userTimezoneOffset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() + userTimezoneOffset).toLocaleDateString();
          })()
        : 'Sin fecha',
      'Descripción': orden.descripcion || '',
      'Facturable': orden.facturable ? 'Sí' : 'No',
      'Estado Facturación': orden.estado_facturacion || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(datos);
    
    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 15 }, // Número Orden
      { wch: 25 }, // Cliente
      { wch: 20 }, // Local
      { wch: 18 }, // Tipo
      { wch: 12 }, // Prioridad
      { wch: 15 }, // Estado
      { wch: 10 }, // N° Técnicos
      { wch: 10 }, // Horas Est.
      { wch: 15 }, // Fecha Programada
      { wch: 40 }, // Descripción
      { wch: 12 }, // Facturable
      { wch: 18 }  // Estado Facturación
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Órdenes');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `ordenes_${fecha}.xlsx`);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getQuickActions = (orden: Orden) => {
    const actions = [];
    if (orden.estado === 'pendiente') {
      actions.push({ label: 'Asignar', icon: UserPlus, action: () => { setOrdenSeleccionada(orden); setShowAsignarModal(true); }, color: 'bg-purple-100 text-purple-700' });
    }
    if (orden.estado === 'asignada' || orden.estado === 'pendiente') {
      actions.push({ label: 'Iniciar', icon: Play, action: () => handleCambiarEstado(orden, 'en_proceso'), color: 'bg-blue-100 text-blue-700' });
    }
    if (orden.estado === 'en_proceso') {
      actions.push({ label: 'Completar', icon: CheckCircle, action: () => handleCambiarEstado(orden, 'completada'), color: 'bg-green-100 text-green-700' });
    }
    if (orden.estado === 'en_proceso') {
      actions.push({ label: 'No Cumplida', icon: AlertTriangle, action: () => handleCambiarEstado(orden, 'no_cumplida'), color: 'bg-red-100 text-red-700' });
    }
    return actions;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Gestión de Órdenes</h1>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowImportarModal(true)}
            className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
          >
            <Upload size={20} />
            Importar
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Nueva Orden
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-400" />
          <select
            value={filtro.estado}
            onChange={(e) => setFiltro({ ...filtro, estado: e.target.value })}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="asignada">Asignada</option>
            <option value="en_proceso">En Proceso</option>
            <option value="completada">Completado</option>
            <option value="no_cumplida">No Cumplida</option>
            <option value="reprogramada">Reprogramada</option>
          </select>
        </div>
        <select
          value={filtro.prioridad}
          onChange={(e) => setFiltro({ ...filtro, prioridad: e.target.value })}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">Todas las prioridades</option>
          <option value="urgente">Urgente</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="🔍 Buscar por número, cliente o local..."
            value={busquedaRapida}
            onChange={(e) => setBusquedaRapida(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <button
          onClick={handleExportExcel}
          disabled={(ordenes || []).length === 0}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
        >
          <Download size={18} />
          Exportar Excel
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('id')}>ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('cliente')}>Cliente {sortConfig.key === 'cliente' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('local')}>Local {sortConfig.key === 'local' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tipo</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('prioridad')}>Prioridad {sortConfig.key === 'prioridad' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('estado')}>Estado {sortConfig.key === 'estado' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">N° Técnicos</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('fecha_programada')}>Fecha Prog. {sortConfig.key === 'fecha_programada' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ordenesFiltradas.map((orden) => (
              <tr key={orden.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{orden.numero_orden}</td>
                <td className="px-4 py-3 text-sm">{orden.cliente?.nombre || 'N/A'}</td>
                <td className="px-4 py-3 text-sm">{orden.local?.nombre || 'N/A'}</td>
                <td className="px-4 py-3 text-sm capitalize">{orden.tipo_trabajo.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${getPrioridadColor(orden.prioridad)}`}>
                    {orden.prioridad}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <select
                    value={orden.estado}
                    onChange={async (e) => {
                      const nuevoEstado = e.target.value;
                      try {
                        const { updateOrden } = await import('../services/api');
                        await updateOrden(orden.id, { estado: nuevoEstado as 'pendiente' | 'asignada' | 'en_proceso' | 'completada' | 'no_cumplida' | 'reprogramada' });
                        loadData();
                      } catch (error) {
                        console.error('Error actualizando estado:', error);
                        alert('Error al actualizar estado');
                      }
                    }}
                    className={`px-2 py-1 rounded-full text-xs cursor-pointer font-medium ${getEstadoColor(orden.estado)}`}
                    style={{ minWidth: '100px' }}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="asignada">Asignada</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="completada">Completada</option>
                    <option value="no_cumplida">No Cumplida</option>
                    <option value="reprogramada">Reprogramada</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-sm">{orden.cantidad_tecnicos || 1}</td>
                <td className="px-4 py-3 text-sm">
                  {orden.fecha_programada ? (() => {
                    const d = new Date(orden.fecha_programada);
                    const userTimezoneOffset = d.getTimezoneOffset() * 60000;
                    return new Date(d.getTime() + userTimezoneOffset).toLocaleDateString();
                  })() : '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleVerDetalle(orden)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Ver detalles"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => handleEditar(orden)}
                      className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => handleVerHistorial(orden)}
                      className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                      title="Ver historial"
                    >
                      <Clock size={18} />
                    </button>
                    <button 
                      onClick={() => handleEliminar(orden)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalle */}
      {showDetailModal && ordenSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Detalle de Orden</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Número de Orden</p>
                  <p className="font-medium">{ordenSeleccionada.numero_orden}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${getEstadoColor(ordenSeleccionada.estado as EstadoOrden)}`}>
                    {ordenSeleccionada.estado}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium">{ordenSeleccionada.cliente?.nombre || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Local</p>
                  <p className="font-medium">{ordenSeleccionada.local?.nombre || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo de Trabajo</p>
                  <p className="font-medium capitalize">{ordenSeleccionada.tipo_trabajo.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Prioridad</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${getPrioridadColor(ordenSeleccionada.prioridad as Prioridad)}`}>
                    {ordenSeleccionada.prioridad}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Descripción</p>
                  <p className="font-medium">{ordenSeleccionada.descripcion || 'Sin descripción'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha Programada</p>
                  <p className="font-medium">
                    {ordenSeleccionada.fecha_programada 
                      ? (() => {
                          const d = new Date(ordenSeleccionada.fecha_programada);
                          const userTimezoneOffset = d.getTimezoneOffset() * 60000;
                          return new Date(d.getTime() + userTimezoneOffset).toLocaleDateString();
                        })()
                      : 'Sin fecha'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Facturable</p>
                  <p className="font-medium">{ordenSeleccionada.facturable ? 'Sí' : 'No'}</p>
                </div>
              </div>

              {/* Sección de Informes Relacionados */}
              <div className="mt-6 border-t pt-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Informes Técnica
                </h3>
                {!Array.isArray(informesRelacionados) || informesRelacionados.length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay informes técnicos para esta orden</p>
                ) : (
                  <div className="space-y-2">
                    {informesRelacionados.map((informe) => (
                      <div key={informe.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div>
                          <p className="font-medium">Informe #{informe.id}</p>
                          <p className="text-sm text-gray-500">
                            Técnico: {informe.tecnico?.nombre || 'N/A'} • Fecha: {informe.fecha_informe ? new Date(informe.fecha_informe).toLocaleDateString() : 'Sin fecha'}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${informe.estado === 'aprobado' ? 'bg-green-100 text-green-700' : informe.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                          {informe.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{ordenSeleccionada ? 'Editar Orden' : 'Nueva Orden'}</h2>
              <button 
                onClick={() => { 
                  setShowModal(false); 
                  setOrdenSeleccionada(null);
                  setFormError('');
                  setAsignarAhora(false);
                  setAsignarData({ id_tecnico: [], fecha_asignacion: new Date().toISOString().split('T')[0], hora_inicio: '08:00', hora_fin: '17:00' });
                  setFormData({
                    id_cliente: '',
                    id_local: '',
                    tipo_trabajo: 'visita_tecnica',
                    prioridad: 'media',
                    descripcion: '',
                    fecha_programada: '',
                    cantidad_tecnicos: '1',
                    horas_estimadas: '1'
                  });
                }} 
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Cliente</label>
                <select
                  value={formData.id_cliente}
                  onChange={(e) => setFormData({ ...formData, id_cliente: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  required
                >
                  <option value="">Seleccionar cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Local</label>
                <div className="relative dropdown-local">
                  <input
                    type="text"
                    value={busquedaLocal}
                    onChange={(e) => setBusquedaLocal(e.target.value)}
                    onFocus={() => setShowDropdownLocal(true)}
                    placeholder="Buscar local..."
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                  {showDropdownLocal && (localesFiltrados || []).length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {localesFiltrados.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, id_local: l.id.toString() });
                            setBusquedaLocal(l.nombre);
                            setShowDropdownLocal(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50"
                        >
                          {l.nombre}
                          <span className="text-gray-500 text-sm ml-2">- {l.direccion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo de Trabajo</label>
                  <select
                    value={formData.tipo_trabajo}
                    onChange={(e) => setFormData({ ...formData, tipo_trabajo: e.target.value as TipoTrabajo })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  >
                    <option value="visita_tecnica">Visita Técnica</option>
                    <option value="implementacion">Implementación</option>
                    <option value="proyecto">Proyecto</option>
                    <option value="correctivo">Correctivo</option>
                    <option value="preventivo">Preventivo</option>
                    <option value="gestion_operativa">Gestión Operativa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prioridad</label>
                  <select
                    value={formData.prioridad}
                    onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as Prioridad })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Programada</label>
                  <input
                    type="date"
                    value={formData.fecha_programada}
                    onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Número de Técnicos</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.cantidad_tecnicos}
                    onChange={(e) => setFormData({ ...formData, cantidad_tecnicos: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Horas Est.</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.horas_estimadas}
                    onChange={(e) => setFormData({ ...formData, horas_estimadas: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
              </div>

              {/* Archivos adjuntos */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Archivos Adjuntos</label>
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  multiple
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    
                    const nuevosArchivos: string[] = [];
                    for (let i = 0; i < files.length; i++) {
                      try {
                        const { subirArchivo } = await import('../services/api');
                        const res = await subirArchivo(files[i]);
                        if (res.data.url) {
                          nuevosArchivos.push(res.data.url);
                        }
                      } catch (error) {
                        console.error('Error subiendo archivo:', error);
                      }
                    }
                    
                    if (nuevosArchivos.length > 0) {
                      const archivosActuales = ordenSeleccionada?.archivos_adjuntos 
                        ? JSON.parse(ordenSeleccionada.archivos_adjuntos) 
                        : [];
                      const todosArchivos = [...archivosActuales, ...nuevosArchivos];
                      setFormData({ ...formData, archivos_adjuntos: JSON.stringify(todosArchivos) } as any);
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
                {ordenSeleccionada?.archivos_adjuntos && (
                  <div className="mt-2 space-y-1">
                    {JSON.parse(ordenSeleccionada.archivos_adjuntos).map((url: string, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          📎 Archivo {idx + 1}
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const archivos = JSON.parse(ordenSeleccionada.archivos_adjuntos || '[]').filter((_: any, i: number) => i !== idx);
                            setFormData({ ...formData, archivos_adjuntos: JSON.stringify(archivos) } as any);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Sección de asignación opcional */}
              <div className="border-t pt-4 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={asignarAhora}
                    onChange={(e) => setAsignarAhora(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Asignar técnico ahora</span>
                </label>
                
                {asignarAhora && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Técnico(s)</label>
                      <div className="mt-1 border rounded-lg p-2 max-h-40 overflow-y-auto">
                        {tecnicos.map((t) => (
                          <label key={t.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={asignarData.id_tecnico.includes(t.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAsignarData({ ...asignarData, id_tecnico: [...asignarData.id_tecnico, t.id] });
                                } else {
                                  setAsignarData({ ...asignarData, id_tecnico: asignarData.id_tecnico.filter(id => id !== t.id) });
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{t.nombre} - {t.especialidad || 'Sin especialidad'}</span>
                          </label>
                        ))}
                      </div>
                      {asignarData.id_tecnico.length === 0 && (
                        <p className="text-red-500 text-xs mt-1">Seleccione al menos un técnico</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha Asignación</label>
                      <input
                        type="date"
                        value={asignarData.fecha_asignacion}
                        onChange={(e) => setAsignarData({ ...asignarData, fecha_asignacion: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {formError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {formError}
                </div>
              )}
              
              <div className="flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {ordenSeleccionada ? 'Actualizar Orden' : 'Crear Orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historial */}
      {showHistorialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Historial de Cambios</h2>
              <button onClick={() => setShowHistorialModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3">
              {historial.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay historial registrado</p>
              ) : (
                historial.map((h, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{h.accion}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(h.fecha_cambio).toLocaleString()}
                      </span>
                    </div>
                    {h.estado_anterior && h.estado_nuevo && (
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="text-red-500">{h.estado_anterior}</span>
                        <ArrowRight size={14} className="inline mx-1" />
                        <span className="text-green-500">{h.estado_nuevo}</span>
                      </div>
                    )}
                    {h.motivo && (
                      <p className="text-xs text-gray-500 mt-1">Motivo: {h.motivo}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar Técnico */}
      {showAsignarModal && ordenSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Asignar Técnico</h2>
              <button onClick={() => setShowAsignarModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">Orden: <span className="font-medium">{ordenSeleccionada.numero_orden}</span></p>
                <p className="text-sm text-gray-500 mb-2">Cliente: <span className="font-medium">{ordenSeleccionada.cliente?.nombre}</span></p>
                <p className="text-sm text-gray-500 mb-2">Límite: <span className="font-medium">{(ordenSeleccionada.cantidad_tecnicos || 0)} técnicos × {(ordenSeleccionada.horas_estimadas || 0)} horas = {((ordenSeleccionada.cantidad_tecnicos || 0) * (ordenSeleccionada.horas_estimadas || 0))} horas técnicas</span></p>
              </div>
              {asignarError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {asignarError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Técnico(s)</label>
                <div className="mt-1 border rounded-lg p-2 max-h-40 overflow-y-auto">
                  {tecnicos.filter(t => t.estado === 'activo').map((t) => (
                    <label key={t.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={asignarData.id_tecnico.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAsignarData({ ...asignarData, id_tecnico: [...asignarData.id_tecnico, t.id] });
                          } else {
                            setAsignarData({ ...asignarData, id_tecnico: asignarData.id_tecnico.filter(id => id !== t.id) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{t.nombre} - {t.especialidad}</span>
                    </label>
                  ))}
                </div>
                {asignarData.id_tecnico.length === 0 && (
                  <p className="text-red-500 text-xs mt-1">Seleccione al menos un técnico</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha</label>
                <input
                  type="date"
                  value={asignarData.fecha_asignacion}
                  onChange={(e) => setAsignarData({ ...asignarData, fecha_asignacion: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hora Inicio</label>
                  <input
                    type="time"
                    value={asignarData.hora_inicio}
                    onChange={(e) => setAsignarData({ ...asignarData, hora_inicio: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hora Fin</label>
                  <input
                    type="time"
                    value={asignarData.hora_fin}
                    onChange={(e) => setAsignarData({ ...asignarData, hora_fin: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-4 justify-end mt-6">
                <button onClick={() => { setShowAsignarModal(false); setAsignarError(''); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleAsignarTecnico} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  Asignar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar Órdenes */}
      {showImportarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Importar Órdenes desde Excel</h2>
              <button onClick={() => setShowImportarModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                &times;
              </button>
            </div>
            <ImportarOrdenes 
              onImportacionCompleta={() => {
                setShowImportarModal(false);
                loadData();
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Ordenes;