import React, { useEffect, useState, useRef } from 'react';
import { Building, MapPin, Users, User, Key, Trash2, UserCheck, Pencil, Download, Upload } from 'lucide-react';
import { getClientes, createCliente, updateCliente, getLocales, createLocal, getUsuarios, createUsuario, deleteUsuario, cambiarMiPassword, resetearPassword, getTecnicos, getRepresentantes, createRepresentante, deleteRepresentante, updateLocal, updateRepresentante, exportarLocales, importarLocales } from '../services/api';
import { Cliente, Local, Usuario, Tecnico, Representante } from '../types';
import { useAuth } from '../context/AuthContext';

const Configuracion: React.FC = () => {
  const { usuario, hasRole } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [representantes, setRepresentantes] = useState<Representante[]>([]);
  const [activeTab, setActiveTab] = useState<'clientes' | 'locales' | 'usuarios' | 'representantes' | 'perfil'>('clientes');
  const [showModal, setShowModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);

  // Form states
  const [clienteForm, setClienteForm] = useState({ nombre: '', ruc: '', telefono: '', email: '', direccion: '' });
  const [clienteEditandoId, setClienteEditandoId] = useState<number | null>(null);
  const [localEditandoId, setLocalEditandoId] = useState<number | null>(null);
  const [localForm, setLocalForm] = useState({ id_cliente: '', nombre: '', direccion: '', ciudad: '', provincia: '', tipo: 'Local - PDVLL', tipo_servicio: 'no_aplica' as 'monitoreo_24_7' | 'alarmas' | 'no_aplica', fecha_implementacion: '' });
  const [usuarioForm, setUsuarioForm] = useState({ username: '', password: '', rol: 'tecnico', id_tecnico: '' as string });
  const [representanteForm, setRepresentanteForm] = useState({ id: 0, id_cliente: '', nombre: '', telefono: '', email: '', cargo: '', principal: false, modoEdicion: false });
  const [passwordForm, setPasswordForm] = useState({ passwordActual: '', passwordNuevo: '', confirmarPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [filtroLocales, setFiltroLocales] = useState<'todos' | 'activo' | 'inactivo'>('activo');
  const [busquedaInput, setBusquedaInput] = useState('');
  const [importando, setImportando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const [clientesRes, localesRes, tecnicosRes, representantesRes] = await Promise.all([
        getClientes(), getLocales(), getTecnicos(), getRepresentantes()
      ]);
      const clientesData = clientesRes?.data ?? clientesRes;
      const localesData = localesRes?.data ?? localesRes;
      const tecnicosData = tecnicosRes?.data ?? tecnicosRes;
      const representantesData = representantesRes?.data ?? representantesRes;
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setLocales(Array.isArray(localesData) ? localesData : []);
      setTecnicos(Array.isArray(tecnicosData) ? tecnicosData : []);
      setRepresentantes(Array.isArray(representantesData) ? representantesData : []);
      
      // Cargar usuarios si es admin o coordinador
      if (hasRole(['admin', 'coordinador'])) {
        const usuariosRes = await getUsuarios();
        const usuariosData = usuariosRes?.data ?? usuariosRes;
        setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
      }
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error al cargar datos';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setFormError('');
    try {
      switch (activeTab) {
        case 'clientes':
          // Validar nombre
          if (!clienteForm.nombre.trim()) {
            setFormError('Debe ingresar el nombre del cliente');
            return;
          }
          // Validar RUC
          if (!clienteForm.ruc.trim()) {
            setFormError('Debe ingresar el RUC del cliente');
            return;
          }
          // Validar teléfono
          if (!clienteForm.telefono.trim()) {
            setFormError('Debe ingresar el teléfono del cliente');
            return;
          }
          // Validar formato de teléfono
          const telefonoLimpio = clienteForm.telefono.replace(/\D/g, '');
          if (telefonoLimpio.length < 9) {
            setFormError('El teléfono debe tener al menos 9 dígitos');
            return;
          }
          // Validar email
          if (!clienteForm.email.trim()) {
            setFormError('Debe ingresar el email del cliente');
            return;
          }
          // Validar formato de email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(clienteForm.email)) {
            setFormError('Debe ingresar un email válido');
            return;
          }
          // Crear o actualizar cliente
          if (clienteEditandoId) {
            await updateCliente(clienteEditandoId, clienteForm);
          } else {
            await createCliente(clienteForm);
          }
          setClienteForm({ nombre: '', ruc: '', telefono: '', email: '', direccion: '' });
          setClienteEditandoId(null);
          break;
        case 'locales':
          if (!localForm.id_cliente) {
            setFormError('Debe seleccionar un cliente');
            return;
          }
          if (!localForm.nombre.trim()) {
            setFormError('El nombre es obligatorio');
            return;
          }
          try {
            if (localEditandoId) {
              await updateLocal(localEditandoId, { ...localForm, id_cliente: parseInt(localForm.id_cliente) });
            } else {
              await createLocal({ ...localForm, id_cliente: parseInt(localForm.id_cliente) });
            }
            setLocalForm({ id_cliente: '', nombre: '', direccion: '', ciudad: '', provincia: '', tipo: 'Local - PDVLL', tipo_servicio: 'no_aplica', fecha_implementacion: '' });
            setLocalEditandoId(null);
          } catch (error: any) {
            setFormError(error.response?.data?.error || 'Error al procesar local');
            return;
          }
          break;
        case 'usuarios':
          await createUsuario({
            username: usuarioForm.username,
            password: usuarioForm.password,
            rol: usuarioForm.rol,
            id_tecnico: usuarioForm.id_tecnico ? parseInt(usuarioForm.id_tecnico) : undefined
          });
          setUsuarioForm({ username: '', password: '', rol: 'tecnico', id_tecnico: '' });
          break;
        case 'representantes':
          if (!representanteForm.id_cliente) {
            setFormError('Debe seleccionar un cliente');
            return;
          }
          if (!representanteForm.nombre.trim()) {
            setFormError('El nombre es obligatorio');
            return;
          }
          if (representanteForm.modoEdicion) {
            await updateRepresentante(representanteForm.id, {
              nombre: representanteForm.nombre,
              telefono: representanteForm.telefono || undefined,
              email: representanteForm.email || undefined,
              cargo: representanteForm.cargo || undefined,
              principal: representanteForm.principal
            });
          } else {
            await createRepresentante({
              id_cliente: parseInt(representanteForm.id_cliente),
              nombre: representanteForm.nombre,
              telefono: representanteForm.telefono || undefined,
              email: representanteForm.email || undefined,
              cargo: representanteForm.cargo || undefined,
              principal: representanteForm.principal
            });
          }
          setRepresentanteForm({ id: 0, id_cliente: '', nombre: '', telefono: '', email: '', cargo: '', principal: false, modoEdicion: false });
          break;
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error creando:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error al guardar';
      alert(errorMsg);
    }
  };

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    if (passwordForm.passwordNuevo !== passwordForm.confirmarPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }
    
    if (passwordForm.passwordNuevo.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await cambiarMiPassword(passwordForm.passwordNuevo);
      setPasswordSuccess('Contraseña actualizada correctamente');
      setPasswordForm({ passwordActual: '', passwordNuevo: '', confirmarPassword: '' });
    } catch (error: any) {
      setPasswordError(error.response?.data?.error || 'Error al cambiar contraseña');
    }
  };

  const handleEliminarUsuario = async (id: number) => {
    if (window.confirm('¿Está seguro de eliminar este usuario?')) {
      try {
        await deleteUsuario(id);
        loadData();
      } catch (error: any) {
        console.error('Error eliminando usuario:', error);
        const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error al eliminar';
        alert(errorMsg);
      }
    }
  };

  const handleResetearPassword = async (id: number) => {
    if (window.confirm('¿Está seguro de resetear la contraseña de este usuario? Se establecerá a "123456"')) {
      try {
        await resetearPassword(id);
        alert(`Contraseña reseteada. Nueva contraseña: 123456`);
      } catch (error: any) {
        console.error('Error reseteando contraseña:', error);
        const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error al resetear contraseña';
        alert(errorMsg);
      }
    }
  };

  const handleEliminarRepresentante = async (id: number) => {
    if (window.confirm('¿Está seguro de dar de baja este representante?')) {
      try {
        await deleteRepresentante(id);
        loadData();
      } catch (error: any) {
        console.error('Error eliminando representante:', error);
        const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error al eliminar';
        alert(errorMsg);
      }
    }
  };

  const handleEditarRepresentante = (representante: Representante) => {
    setRepresentanteForm({
      id: representante.id,
      id_cliente: String(representante.id_cliente),
      nombre: representante.nombre,
      telefono: representante.telefono || '',
      email: representante.email || '',
      cargo: representante.cargo || '',
      principal: representante.principal,
      modoEdicion: true
    });
    setShowModal(true);
  };

  const handleDarDeBajaLocal = async (id: number) => {
    if (window.confirm('¿Está seguro de dar de baja este local? Se cambiará su estado a inactivo.')) {
      try {
        await updateLocal(id, { estado: 'inactivo', fecha_baja: new Date().toISOString() });
        loadData();
      } catch (error: any) {
        console.error('Error dando de baja local:', error);
        const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error al dar de baja';
        alert(errorMsg);
      }
    }
  };

  const handleExportarLocales = async () => {
    try {
      const response = await exportarLocales();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'locales_export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      console.error('Error exportando locales:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error al exportar locales';
      alert(errorMsg);
    }
  };

  const handleImportarLocales = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    
    setImportando(true);
    try {
      const response = await importarLocales(archivo);
      alert(response.data.message || 'Importación completada');
      loadData();
    } catch (error: any) {
      console.error('Error importando locales:', error);
      alert(error.response?.data?.error || 'Error al importar locales');
    } finally {
      setImportando(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEditarCliente = (cliente: Cliente) => {
    setClienteForm({
      nombre: cliente.nombre,
      ruc: cliente.ruc || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || ''
    });
    setClienteEditandoId(cliente.id);
    setShowModal(true);
  };

  const handleEditarLocal = (local: Local) => {
    setLocalForm({
      id_cliente: String(local.id_cliente),
      nombre: local.nombre,
      direccion: local.direccion || '',
      ciudad: local.ciudad || '',
      provincia: local.provincia || '',
      tipo: local.tipo || 'Local - PDVLL',
      tipo_servicio: local.tipo_servicio || 'no_aplica',
      fecha_implementacion: local.fecha_implementacion || ''
    });
    setLocalEditandoId(local.id);
    setShowModal(true);
  };

  const resetForm = () => {
    setClienteForm({ nombre: '', ruc: '', telefono: '', email: '', direccion: '' });
    setClienteEditandoId(null);
    setLocalForm({ id_cliente: '', nombre: '', direccion: '', ciudad: '', provincia: '', tipo: 'Local - PDVLL', tipo_servicio: 'no_aplica', fecha_implementacion: '' });
    setLocalEditandoId(null);
    setUsuarioForm({ username: '', password: '', rol: 'tecnico', id_tecnico: '' });
    setRepresentanteForm({ id: 0, id_cliente: '', nombre: '', telefono: '', email: '', cargo: '', principal: false, modoEdicion: false });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Configuración</h1>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm w-fit flex-wrap">
        <button
          onClick={() => setActiveTab('clientes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === 'clientes' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
        >
          <Building size={18} />
          Clientes ({(clientes || []).length})
        </button>
        <button
          onClick={() => setActiveTab('locales')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === 'locales' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
        >
          <MapPin size={18} />
          Locales ({(locales || []).length})
        </button>
        <button
          onClick={() => setActiveTab('representantes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === 'representantes' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
        >
          <UserCheck size={18} />
          Representantes ({(representantes || []).length})
        </button>
        {hasRole(['admin', 'coordinador']) && (
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === 'usuarios' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
          >
            <Users size={18} />
            Usuarios ({usuarios.length})
          </button>
        )}
        <button
          onClick={() => setActiveTab('perfil')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === 'perfil' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
        >
          <User size={18} />
          Mi Perfil
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold capitalize">{activeTab === 'perfil' ? 'Mi Perfil' : activeTab}</h2>
          {activeTab !== 'perfil' && (
            <button
              onClick={() => { resetForm(); setShowModal(true); setFormError(''); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Agregar
            </button>
          )}
        </div>

        {activeTab === 'clientes' && (
          <div className="overflow-x-auto">
            <input type="text" placeholder="Buscar..." value={busquedaInput} onChange={e => setBusquedaInput(e.target.value)} className="mb-3 w-full border rounded px-3 py-2" />
            <table className="w-full min-w-[500px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">RUC</th>
                  <th className="px-4 py-2 text-left">Teléfono</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.filter(c => !busquedaInput || c.nombre.toLowerCase().includes(busquedaInput.toLowerCase()) || (c.ruc || '').toLowerCase().includes(busquedaInput.toLowerCase()) || (c.email || '').toLowerCase().includes(busquedaInput.toLowerCase())).map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-2">{c.nombre}</td>
                    <td className="px-4 py-2">{c.ruc || '-'}</td>
                    <td className="px-4 py-2">{c.telefono || '-'}</td>
                    <td className="px-4 py-2">{c.email || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${c.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => handleEditarCliente(c)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'locales' && (
          <div>
            <input type="text" placeholder="Buscar..." value={busquedaInput} onChange={e => setBusquedaInput(e.target.value)} className="mb-3 w-full border rounded px-3 py-2" />
            {/* Filtro de locales y botones de import/export */}
            <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setFiltroLocales('activo')}
                  className={`px-3 py-1 rounded text-sm ${filtroLocales === 'activo' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  Activos ({locales.filter(l => l.estado === 'activo').length})
                </button>
                <button
                  onClick={() => setFiltroLocales('inactivo')}
                  className={`px-3 py-1 rounded text-sm ${filtroLocales === 'inactivo' ? 'bg-red-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  Inactivos ({locales.filter(l => l.estado === 'inactivo').length})
                </button>
                <button
                  onClick={() => setFiltroLocales('todos')}
                  className={`px-3 py-1 rounded text-sm ${filtroLocales === 'todos' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  Todos ({(locales || []).length})
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportarLocales}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  disabled={(locales || []).length === 0}
                >
                  <Download size={16} />
                  Exportar
                </button>
                <label
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm cursor-pointer"
                >
                  <Upload size={16} />
                  {importando ? 'Importando...' : 'Importar'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportarLocales}
                    className="hidden"
                    disabled={importando}
                  />
                </label>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Nombre</th>
                    <th className="px-4 py-2 text-left">Cliente</th>
                    <th className="px-4 py-2 text-left">Ciudad</th>
                    <th className="px-4 py-2 text-left">Tipo</th>
                    <th className="px-4 py-2 text-left">Estado</th>
                    <th className="px-4 py-2 text-left">Fecha Baja</th>
                    <th className="px-4 py-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {locales
                    .filter(l => (filtroLocales === 'todos' || l.estado === filtroLocales) && (!busquedaInput || l.nombre.toLowerCase().includes(busquedaInput.toLowerCase()) || (l.cliente?.nombre || '').toLowerCase().includes(busquedaInput.toLowerCase()) || (l.ciudad || '').toLowerCase().includes(busquedaInput.toLowerCase())))
                    .map((l) => (
                      <tr key={l.id} className="border-t">
                        <td className="px-4 py-2">{l.nombre}</td>
                        <td className="px-4 py-2">{l.cliente?.nombre || '-'}</td>
                        <td className="px-4 py-2">{l.ciudad || '-'}</td>
                        <td className="px-4 py-2">{l.tipo || '-'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${l.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {l.estado}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {l.fecha_baja ? new Date(l.fecha_baja).toLocaleDateString('es-EC') : '-'}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button onClick={() => handleEditarLocal(l)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                              <Pencil size={16} />
                            </button>
                            {l.estado === 'activo' && (
                              <button
                                onClick={() => handleDarDeBajaLocal(l.id)}
                                className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'representantes' && (
          <div className="overflow-x-auto">
            <input type="text" placeholder="Buscar..." value={busquedaInput} onChange={e => setBusquedaInput(e.target.value)} className="mb-3 w-full border rounded px-3 py-2" />
            <table className="w-full min-w-[500px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Cliente</th>
                  <th className="px-4 py-2 text-left">Teléfono</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Cargo</th>
                  <th className="px-4 py-2 text-left">Principal</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {representantes.filter(r => !busquedaInput || r.nombre.toLowerCase().includes(busquedaInput.toLowerCase()) || (r.cliente?.nombre || '').toLowerCase().includes(busquedaInput.toLowerCase()) || (r.email || '').toLowerCase().includes(busquedaInput.toLowerCase())).map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2">{r.nombre}</td>
                    <td className="px-4 py-2">{r.cliente?.nombre || '-'}</td>
                    <td className="px-4 py-2">{r.telefono || '-'}</td>
                    <td className="px-4 py-2">{r.email || '-'}</td>
                    <td className="px-4 py-2">{r.cargo || '-'}</td>
                    <td className="px-4 py-2">
                      {r.principal && <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">Principal</span>}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${r.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {r.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        {r.estado === 'activo' && (
                          <button
                            onClick={() => handleEditarRepresentante(r)}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                        )}
                        {r.estado === 'activo' && (
                          <button
                            onClick={() => handleEliminarRepresentante(r.id)}
                            className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            Dar de Baja
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'usuarios' && hasRole(['admin', 'coordinador']) && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Usuario</th>
                  <th className="px-4 py-2 text-left">Rol</th>
                  <th className="px-4 py-2 text-left">Técnico</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-2">{u.username}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        u.rol === 'admin' ? 'bg-purple-100 text-purple-700' :
                        u.rol === 'coordinador' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-2">{u.tecnico?.nombre || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${u.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                        {u.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResetearPassword(u.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          title="Resetear contraseña"
                        >
                          Resetear
                        </button>
                        <button
                          onClick={() => handleEliminarUsuario(u.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="max-w-md">
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Información del Usuario</h3>
              <p><span className="text-gray-500">Usuario:</span> {usuario?.username}</p>
              <p><span className="text-gray-500">Rol:</span> <span className="capitalize">{usuario?.rol}</span></p>
              {usuario?.tecnico && <p><span className="text-gray-500">Técnico:</span> {usuario.tecnico.nombre}</p>}
            </div>
            
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Key size={18} />
              Cambiar Contraseña
            </h3>
            
            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4">
                {passwordSuccess}
              </div>
            )}
            
            <form onSubmit={handleCambiarPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nueva Contraseña</label>
                <input
                  type="password"
                  value={passwordForm.passwordNuevo}
                  onChange={(e) => setPasswordForm({...passwordForm, passwordNuevo: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirmar Contraseña</label>
                <input
                  type="password"
                  value={passwordForm.confirmarPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmarPassword: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="Repita la contraseña"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Cambiar Contraseña
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {clienteEditandoId ? 'Editar' : 'Agregar'} {activeTab === 'clientes' ? 'Cliente' : activeTab === 'locales' ? 'Local' : activeTab.slice(0, -1)}
            </h2>
            
            {activeTab === 'clientes' && (
              <div className="space-y-3">
                <input placeholder="Nombre" value={clienteForm.nombre} onChange={(e) => setClienteForm({...clienteForm, nombre: e.target.value})} className="w-full border rounded px-3 py-2" />
                <input placeholder="RUC" value={clienteForm.ruc} onChange={(e) => setClienteForm({...clienteForm, ruc: e.target.value})} className="w-full border rounded px-3 py-2" />
                <input placeholder="Teléfono" value={clienteForm.telefono} onChange={(e) => setClienteForm({...clienteForm, telefono: e.target.value})} className="w-full border rounded px-3 py-2" />
                <input placeholder="Email" value={clienteForm.email} onChange={(e) => setClienteForm({...clienteForm, email: e.target.value})} className="w-full border rounded px-3 py-2" />
                <input placeholder="Dirección" value={clienteForm.direccion} onChange={(e) => setClienteForm({...clienteForm, direccion: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
            )}

            {activeTab === 'locales' && (
              <div className="space-y-3">
                <select value={localForm.id_cliente} onChange={(e) => setLocalForm({...localForm, id_cliente: e.target.value})} className="w-full border rounded px-3 py-2">
                  <option value="">Seleccionar cliente</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <input placeholder="Nombre" value={localForm.nombre} onChange={(e) => setLocalForm({...localForm, nombre: e.target.value})} className="w-full border rounded px-3 py-2" />
                <input placeholder="Ciudad" value={localForm.ciudad} onChange={(e) => setLocalForm({...localForm, ciudad: e.target.value})} className="w-full border rounded px-3 py-2" />
                <input placeholder="Provincia" value={localForm.provincia} onChange={(e) => setLocalForm({...localForm, provincia: e.target.value})} className="w-full border rounded px-3 py-2" />
                <select value={localForm.tipo} onChange={(e) => setLocalForm({...localForm, tipo: e.target.value})} className="w-full border rounded px-3 py-2">
                  <option value="Islands - PDVILL">Islands - PDVILL</option>
                  <option value="Local - PDVLL">Local - PDVLL</option>
                  <option value="Local CC - PDVLL CC">Local CC - PDVLL CC</option>
                  <option value="Local CC Exterior - PDVLL CCX">Local CC Exterior - PDVLL CCX</option>
                  <option value="Matriz">Matriz</option>
                  <option value="Planta">Planta</option>
                  <option value="Hospital">Hospital</option>
                  <option value="U.Educativa">U.Educativa</option>
                </select>
                <select value={localForm.tipo_servicio} onChange={(e) => setLocalForm({...localForm, tipo_servicio: e.target.value as any})} className="w-full border rounded px-3 py-2">
                  <option value="no_aplica">No Aplica</option>
                  <option value="monitoreo_24_7">Monitoreo 24/7</option>
                  <option value="alarmas">Alarmas</option>
                </select>
                <input type="date" value={localForm.fecha_implementacion} onChange={(e) => setLocalForm({...localForm, fecha_implementacion: e.target.value})} className="w-full border rounded px-3 py-2" placeholder="Fecha implementación" />
              </div>
            )}

            {activeTab === 'usuarios' && (
              <div className="space-y-3">
                <input 
                  placeholder="Usuario" 
                  value={usuarioForm.username} 
                  onChange={(e) => setUsuarioForm({...usuarioForm, username: e.target.value})} 
                  className="w-full border rounded px-3 py-2" 
                />
                <input 
                  type="password"
                  placeholder="Contraseña" 
                  value={usuarioForm.password} 
                  onChange={(e) => setUsuarioForm({...usuarioForm, password: e.target.value})} 
                  className="w-full border rounded px-3 py-2" 
                />
                <select 
                  value={usuarioForm.rol} 
                  onChange={(e) => setUsuarioForm({...usuarioForm, rol: e.target.value})} 
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="tecnico">Técnico</option>
                  <option value="coordinador">Coordinador</option>
                  <option value="admin">Administrador</option>
                </select>
                {usuarioForm.rol === 'tecnico' && (
                  <select 
                    value={usuarioForm.id_tecnico} 
                    onChange={(e) => setUsuarioForm({...usuarioForm, id_tecnico: e.target.value})} 
                    className="w-full border rounded px-3 py-2 mt-2"
                  >
                    <option value="">Seleccionar técnico (opcional)</option>
                    {tecnicos.filter(t => t.estado === 'activo').map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre} - {t.especialidad}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {activeTab === 'representantes' && (
              <div className="space-y-3">
                <select 
                  value={representanteForm.id_cliente} 
                  onChange={(e) => setRepresentanteForm({...representanteForm, id_cliente: e.target.value})} 
                  className="w-full border rounded px-3 py-2"
                  disabled={representanteForm.modoEdicion}
                >
                  <option value="">Seleccionar cliente</option>
                  {clientes.filter(c => c.estado === 'activo').map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                <input 
                  placeholder="Nombre del representante" 
                  value={representanteForm.nombre} 
                  onChange={(e) => setRepresentanteForm({...representanteForm, nombre: e.target.value})} 
                  className="w-full border rounded px-3 py-2" 
                />
                <input 
                  placeholder="Teléfono" 
                  value={representanteForm.telefono} 
                  onChange={(e) => setRepresentanteForm({...representanteForm, telefono: e.target.value})} 
                  className="w-full border rounded px-3 py-2" 
                />
                <input 
                  placeholder="Email" 
                  type="email"
                  value={representanteForm.email} 
                  onChange={(e) => setRepresentanteForm({...representanteForm, email: e.target.value})} 
                  className="w-full border rounded px-3 py-2" 
                />
                <input 
                  placeholder="Cargo" 
                  value={representanteForm.cargo} 
                  onChange={(e) => setRepresentanteForm({...representanteForm, cargo: e.target.value})} 
                  className="w-full border rounded px-3 py-2" 
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="principal"
                    checked={representanteForm.principal}
                    onChange={(e) => setRepresentanteForm({...representanteForm, principal: e.target.checked})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="principal" className="text-sm text-gray-700">
                    Representante principal
                  </label>
                </div>
              </div>
            )}

            {formError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {formError}
              </div>
            )}

            <div className="flex gap-4 justify-end mt-4">
              <button onClick={() => { setShowModal(false); setFormError(''); setRepresentanteForm({ id: 0, id_cliente: '', nombre: '', telefono: '', email: '', cargo: '', principal: false, modoEdicion: false }); }} className="px-4 py-2 border rounded">Cancelar</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded">
                {representanteForm.modoEdicion ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracion;