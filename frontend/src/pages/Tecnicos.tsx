import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Phone, Mail, Briefcase, Clock, Eye, CheckCircle, XCircle } from 'lucide-react';
import { getTecnicos, createTecnico, updateTecnico, getOrdenes, getHoras } from '../services/api';
import { Tecnico, Orden, RegistroDiario } from '../types';

const Tecnicos: React.FC = () => {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<Tecnico | null>(null);
  const [ordenesTecnico, setOrdenesTecnico] = useState<Orden[]>([]);
  const [horasTecnico, setHorasTecnico] = useState<RegistroDiario[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [crearUsuario, setCrearUsuario] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    email: '',
    especialidad: '',
    jornada_horaria: 8
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await getTecnicos();
      setTecnicos(res.data as any);
    } catch (error) {
      console.error('Error cargando técnicos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validar nombre
    if (!formData.nombre.trim()) {
      setFormError('Debe ingresar el nombre del técnico');
      return;
    }

    // Validar cédula
    if (!formData.cedula.trim()) {
      setFormError('Debe ingresar la cédula del técnico');
      return;
    }

    // Validar teléfono
    if (!formData.telefono.trim()) {
      setFormError('Debe ingresar el teléfono del técnico');
      return;
    }

    // Validar formato de teléfono (mínimo 9 dígitos)
    const telefonoLimpio = formData.telefono.replace(/\D/g, '');
    if (telefonoLimpio.length < 9) {
      setFormError('El teléfono debe tener al menos 9 dígitos');
      return;
    }

    // Validar email
    if (!formData.email.trim()) {
      setFormError('Debe ingresar el email del técnico');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setFormError('Debe ingresar un email válido');
      return;
    }

    // Validar especialidad
    if (!formData.especialidad.trim()) {
      setFormError('Debe ingresar la especialidad del técnico');
      return;
    }

    // Validar jornada horaria
    if (!formData.jornada_horaria || formData.jornada_horaria <= 0) {
      setFormError('La jornada horaria debe ser mayor a 0');
      return;
    }

    if (formData.jornada_horaria > 12) {
      setFormError('La jornada horaria no puede exceder 12 horas');
      return;
    }

    try {
      if (editingId) {
        await updateTecnico(editingId, formData);
      } else {
        await createTecnico({ ...formData, crear_usuario: crearUsuario } as any);
        if (crearUsuario) {
          alert('Técnico creado exitosamente. Se ha creado un usuario con password: tec123456');
        }
      }
      setShowModal(false);
      setEditingId(null);
      setCrearUsuario(false);
      setFormData({ nombre: '', cedula: '', telefono: '', email: '', especialidad: '', jornada_horaria: 8 });
      loadData();
    } catch (error: any) {
      console.error('Error guardando técnico:', error);
      setFormError(error.response?.data?.error || 'Error al guardar técnico');
    }
  };

  const handleEdit = (tecnico: Tecnico) => {
    setEditingId(tecnico.id);
    setFormData({
      nombre: tecnico.nombre,
      cedula: tecnico.cedula || '',
      telefono: tecnico.telefono || '',
      email: tecnico.email || '',
      especialidad: tecnico.especialidad || '',
      jornada_horaria: tecnico.jornada_horaria
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Está seguro de dar de baja este técnico? Se cambiará su estado a inactivo y no aparecerá en las listas de asignación, pero se mantendrá su historial de tareas.')) {
      try {
        // En vez de eliminar, cambiamos el estado a inactivo
        await updateTecnico(id, { estado: 'inactivo' });
        loadData();
      } catch (error) {
        console.error('Error dando de baja técnico:', error);
      }
    }
  };

  const handleVerDetalle = async (tecnico: Tecnico) => {
    try {
      setTecnicoSeleccionado(tecnico);
      const [ordenesRes, horasRes] = await Promise.all([
        getOrdenes({ estado: tecnico.estado === 'activo' ? 'pendiente' : undefined }),
        getHoras({ id_tecnico: tecnico.id })
      ]);
      // Filter orders assigned to this technician
      const ordenesFiltradas = (ordenesRes.data as any).filter((o: Orden) => 
        o.asignaciones?.some(a => a.id_tecnico === tecnico.id)
      );
      setOrdenesTecnico(ordenesFiltradas);
      setHorasTecnico(horasRes.data as any);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error cargando detalle:', error);
    }
  };

  const getDisponibilidad = (tecnico: Tecnico) => {
    if (tecnico.estado !== 'activo') return { label: 'Inactivo', color: 'bg-gray-100 text-gray-700', icon: XCircle };
    return { label: 'Activo', color: 'bg-green-100 text-green-700', icon: CheckCircle };
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
        <h1 className="text-2xl font-bold text-gray-800">Técnicos</h1>
        <button
          onClick={() => { setEditingId(null); setCrearUsuario(false); setFormData({ nombre: '', cedula: '', telefono: '', email: '', especialidad: '', jornada_horaria: 8 }); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Nuevo Técnico
        </button>
      </div>

      {/* Grid de Técnicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tecnicos.map((tecnico) => (
          <div key={tecnico.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{tecnico.nombre}</h3>
                <p className="text-sm text-gray-500">{tecnico.especialidad || 'Sin especialidad'}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${tecnico.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {tecnico.estado}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              {tecnico.cedula && (
                <div className="flex items-center gap-2">
                  <Briefcase size={16} />
                  <span>{tecnico.cedula}</span>
                </div>
              )}
              {tecnico.telefono && (
                <div className="flex items-center gap-2">
                  <Phone size={16} />
                  <span>{tecnico.telefono}</span>
                </div>
              )}
              {tecnico.email && (
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  <span>{tecnico.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>Jornada: {tecnico.jornada_horaria}h</span>
              </div>
              {(() => {
                const disponibilidad = getDisponibilidad(tecnico);
                const Icon = disponibilidad.icon;
                return (
                  <div className={`flex items-center gap-2 mt-2 ${disponibilidad.color} px-2 py-1 rounded-full w-fit`}>
                    <Icon size={14} />
                    <span className="text-xs font-medium">{disponibilidad.label}</span>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t">
              <button
                onClick={() => handleVerDetalle(tecnico)}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-purple-600 hover:bg-purple-50 rounded-lg"
              >
                <Eye size={16} />
                Ver Detalle
              </button>
              <button
                onClick={() => handleEdit(tecnico)}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Edit size={16} />
                Editar
              </button>
              <button
                onClick={() => handleDelete(tecnico.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={16} />
                Dar de Baja
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar' : 'Nuevo'} Técnico</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  required
                />
              </div>
              {!editingId && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="crear_usuario"
                    checked={crearUsuario}
                    onChange={(e) => setCrearUsuario(e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="crear_usuario" className="text-sm text-gray-700">
                    Crear usuario automáticamente (password: tec123456)
                  </label>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cédula</label>
                  <input
                    type="text"
                    value={formData.cedula}
                    onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Especialidad</label>
                  <input
                    type="text"
                    value={formData.especialidad}
                    onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Jornada (horas)</label>
                  <input
                    type="number"
                    value={formData.jornada_horaria}
                    onChange={(e) => setFormData({ ...formData, jornada_horaria: parseInt(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    min={1}
                    max={12}
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
                  {editingId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle Técnico */}
      {showDetailModal && tecnicoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{tecnicoSeleccionado.nombre}</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Especialidad</p>
                <p className="font-medium">{tecnicoSeleccionado.especialidad || 'Sin especialidad'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Estado</p>
                <span className={`px-2 py-1 rounded-full text-xs ${tecnicoSeleccionado.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {tecnicoSeleccionado.estado}
                </span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Jornada</p>
                <p className="font-medium">{tecnicoSeleccionado.jornada_horaria}h</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Órdenes Asignadas</p>
                <p className="font-medium">{(ordenesTecnico || []).length}</p>
              </div>
            </div>

            {/* Órdenes Asignadas */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Órdenes Asignadas</h3>
              {(ordenesTecnico || []).length === 0 ? (
                <p className="text-gray-500 text-sm">No hay órdenes asignadas</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {ordenesTecnico.slice(0, 10).map((orden) => (
                    <div key={orden.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{orden.numero_orden}</p>
                        <p className="text-xs text-gray-500">{orden.cliente?.nombre}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        orden.estado === 'pendiente' ? 'bg-gray-100 text-gray-700' :
                        orden.estado === 'en_proceso' ? 'bg-blue-100 text-blue-700' :
                        orden.estado === 'completada' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {orden.estado}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Horas Registradas */}
            <div>
              <h3 className="font-semibold mb-3">Horas Registradas</h3>
              {(horasTecnico || []).length === 0 ? (
                <p className="text-gray-500 text-sm">No hay horas registradas</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {horasTecnico.slice(0, 10).map((hora) => (
                    <div key={hora.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{new Date(hora.fecha).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">{hora.hora_inicio_trabajo || '-'} - {hora.hora_fin_trabajo || '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{(hora.horas_normales + hora.horas_extras).toFixed(1)}h</p>
                        {hora.horas_extras > 0 && <p className="text-xs text-red-600">+{hora.horas_extras.toFixed(1)}h extra</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tecnicos;