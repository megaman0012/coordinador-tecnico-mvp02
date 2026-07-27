import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { getTareas, createTarea, updateTarea, deleteTarea, getClientes, getLocales, getTecnicos } from '../services/api';
import { Tarea, Cliente, Local, Tecnico, TipoTrabajo, Prioridad, EstadoTarea } from '../types';

const Tareas: React.FC = () => {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filtro, setFiltro] = useState({ estado: '', prioridad: '' });
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    id_cliente: '',
    id_local: '',
    id_tecnico: '',
    tipo_trabajo: 'visita_tecnica' as TipoTrabajo,
    prioridad: 'media' as Prioridad,
    descripcion: '',
    fecha_programada: '',
    cantidad_tecnicos: '1',
    horas_estimadas: '1'
  });

  useEffect(() => {
    loadData();
  }, [filtro]);

  const loadData = async () => {
    try {
      const [tareasRes, clientesRes, localesRes, tecnicosRes] = await Promise.all([
        getTareas(filtro.estado || filtro.prioridad ? filtro : undefined),
        getClientes(),
        getLocales(),
        getTecnicos()
      ]);
      setTareas(tareasRes.data as any);
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

    // Validar cantidad de técnicos
    const cantidadTecnicos = parseInt(formData.cantidad_tecnicos) || 0;
    if (cantidadTecnicos < 1) {
      setFormError('La cantidad de técnicos debe ser al menos 1');
      return;
    }

    // Validar horas estimadas
    const horasEstimadas = parseInt(formData.horas_estimadas) || 0;
    if (horasEstimadas < 1) {
      setFormError('Las horas estimadas deben ser al menos 1');
      return;
    }

    try {
      await createTarea({
        ...formData,
        id_cliente: parseInt(formData.id_cliente),
        id_local: parseInt(formData.id_local),
        id_tecnico: formData.id_tecnico ? parseInt(formData.id_tecnico) : undefined,
        cantidad_tecnicos: cantidadTecnicos,
        horas_estimadas: horasEstimadas
      });
      setShowModal(false);
      setFormData({
        id_cliente: '',
        id_local: '',
        id_tecnico: '',
        tipo_trabajo: 'visita_tecnica',
        prioridad: 'media',
        descripcion: '',
        fecha_programada: '',
        cantidad_tecnicos: '1',
        horas_estimadas: '1'
      });
      loadData();
    } catch (error: any) {
      console.error('Error creando tarea:', error);
      setFormError(error.response?.data?.error || 'Error al crear tarea');
    }
  };

  const getEstadoColor = (estado: EstadoTarea) => {
    switch (estado) {
      case 'completada': return 'bg-green-100 text-green-700';
      case 'en_proceso': return 'bg-blue-100 text-blue-700';
      case 'pendiente': return 'bg-gray-100 text-gray-700';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Tareas</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Nueva Tarea
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex gap-4">
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
            <option value="completada">Completada</option>
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
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Cliente</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tipo</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Prioridad</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Técnico</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Fecha Prog.</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tareas.map((tarea) => (
              <tr key={tarea.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">#{tarea.id}</td>
                <td className="px-4 py-3 text-sm">{tarea.cliente?.nombre || 'N/A'}</td>
                <td className="px-4 py-3 text-sm capitalize">{tarea.tipo_trabajo.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${getPrioridadColor(tarea.prioridad)}`}>
                    {tarea.prioridad}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${getEstadoColor(tarea.estado)}`}>
                    {tarea.estado.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{tarea.tecnico?.nombre || 'Sin asignar'}</td>
                <td className="px-4 py-3 text-sm">
                  {tarea.fecha_programada ? new Date(tarea.fecha_programada).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Eye size={18} />
                    </button>
                    <button className="p-1 text-yellow-600 hover:bg-yellow-50 rounded">
                      <Edit size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Nueva Tarea</h2>
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
                <select
                  value={formData.id_local}
                  onChange={(e) => setFormData({ ...formData, id_local: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  required
                >
                  <option value="">Seleccionar local</option>
                  {locales.filter(l => l.id_cliente === parseInt(formData.id_cliente)).map((l) => (
                    <option key={l.id} value={l.id}>{l.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Técnico</label>
                <select
                  value={formData.id_tecnico}
                  onChange={(e) => setFormData({ ...formData, id_tecnico: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                >
                  <option value="">Sin asignar</option>
                  {tecnicos.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
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
                  <label className="block text-sm font-medium text-gray-700">Técnicos</label>
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
              
              {formError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {formError}
                </div>
              )}
              
              <div className="flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(''); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Crear Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tareas;