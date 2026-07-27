import React, { useEffect, useState, useRef } from 'react';
import { Plus, Clock, Calendar, TrendingUp, Trash2, CheckCircle, AlertCircle, Camera, Edit } from 'lucide-react';
import { createAusencia, getTecnicos, getResumenDiario, getResumenSemanal, getResumenMensual, getResumenCustom, getAusencias, getAusenciasPendientes, getOrdenes, createJornadaGrupo, getJornadasGrupo, deleteJornada, getHoras, aprobarAusencia, rechazarAusencia, deleteAusencia } from '../services/api';
import { ResumenHoras, Ausencia, Orden } from '../types';

type TabType = 'resumen' | 'ausencias' | 'registros';

const TIPOS_AUSENCIA = [
  { value: 'dia_libre', label: '📅 Día libre', requiereFoto: false },
  { value: 'permiso_medico', label: '🏥 Permiso médico', requiereFoto: true },
  { value: 'vacacion', label: '🌴 Vacaciones', requiereFoto: false },
  { value: 'feriado', label: '🎉 Feriado', requiereFoto: false },
  { value: 'compensatorio', label: '⏰ Compensatorio', requiereFoto: false }
];

const Horas: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('resumen');
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [resumenDiario, setResumenDiario] = useState<ResumenHoras[]>([]);
  const [resumenSemanal, setResumenSemanal] = useState<ResumenHoras[]>([]);
  const [resumenMensual, setResumenMensual] = useState<ResumenHoras[]>([]);
  const [resumenCustom, setResumenCustom] = useState<ResumenHoras[]>([]);
  const [loading, setLoading] = useState(true);
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [ausenciasPendientes, setAusenciasPendientes] = useState<Ausencia[]>([]);
  const [showAusenciaModal, setShowAusenciaModal] = useState(false);
  const [vista, setVista] = useState<'diario' | 'semanal' | 'mensual' | 'custom'>('diario');
  const [fechaCustomInicio, setFechaCustomInicio] = useState('');
  const [fechaCustomFin, setFechaCustomFin] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: string; texto: string } | null>(null);
  const [esCoordinador, setEsCoordinador] = useState(false);
  const [filtroTecnico, setFiltroTecnico] = useState<string>('');
  const [formError, setFormError] = useState('');
  const [formAusencia, setFormAusencia] = useState({ id_tecnico: '', tipo: 'dia_libre', fecha_inicio: '', fecha_fin: '', descripcion: '' });
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para registro grupal
  const [showRegistroGrupal, setShowRegistroGrupal] = useState(false);
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [formGrupo, setFormGrupo] = useState({ fecha: new Date().toISOString().split('T')[0], hora_entrada: '08:00', hora_salida: '17:00', hora_almuerzo_inicio: '12:00', hora_almuerzo_fin: '13:00', observaciones: '' });
  const [edicionJornada, setEdicionJornada] = useState<number | null>(null);
  const [tecnicosSeleccionados, setTecnicosSeleccionados] = useState<number[]>([]);
  const [comidas, setComidas] = useState<{ tipo: string; hora_inicio: string; hora_fin: string }[]>([{ tipo: 'almuerzo', hora_inicio: '12:00', hora_fin: '13:00' }]);
  const [segmentos, setSegmentos] = useState<{ id_orden: number | undefined; descripcion: string; hora_inicio: string; hora_fin: string; tipo: string }[]>([]);
  
  // Estados para pestaña de Registros (horas individuales)
  const [registrosHoras, setRegistrosHoras] = useState<any[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [fechaRegistroInicio, setFechaRegistroInicio] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [fechaRegistroFin, setFechaRegistroFin] = useState(() => new Date().toISOString().split('T')[0]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); checkRol(); }, []);

  // Cargar registros cuando se entra a la pestaña 'registros'
  useEffect(() => {
    if (activeTab === 'registros' && esCoordinador) {
      loadRegistrosHoras();
    }
  }, [activeTab, esCoordinador]);

  const checkRol = () => {
    const usuarioStr = localStorage.getItem('usuario');
    if (usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr);
        setEsCoordinador(['admin', 'coordinador'].includes(usuario.rol || ''));
      } catch { setEsCoordinador(false); }
    } else { setEsCoordinador(false); }
  };

// Pestañas simplificadas
const TABS = [
  { k: 'resumen', l: '📊 Resumen' },
  { k: 'ausencias', l: '🏖️ Ausencias' },
];

  const loadData = async () => {
    // Get role again in case it changed
    const usuarioStr = localStorage.getItem('usuario');
    let isCoord = false;
    if (usuarioStr) {
      try { isCoord = ['admin', 'coordinador'].includes(JSON.parse(usuarioStr).rol || ''); } catch { isCoord = false; }
    }
    
    const filtroParams = filtroTecnico ? { id_tecnico: parseInt(filtroTecnico) } : {};
    
    try {
      const [tRes, dRes, sRes, mRes, aRes, jRes, oRes, apRes] = await Promise.all([
        getTecnicos(), 
        getResumenDiario(filtroParams), 
        getResumenSemanal(filtroParams), 
        getResumenMensual(filtroParams),
        getAusencias(),
        isCoord ? getJornadasGrupo() : Promise.resolve({ data: [] }),
        getOrdenes(),
        isCoord ? getAusenciasPendientes() : Promise.resolve({ data: [] })
      ]);
      setTecnicos(tRes.data as any);
      setResumenDiario(dRes.data as any); setResumenSemanal(sRes.data as any); setResumenMensual(mRes.data as any);
      setAusencias(aRes.data as any);
      setAusenciasPendientes(apRes.data as any);
      setJornadas(jRes.data as any); setOrdenes(oRes.data as any);
    } catch (error) { console.error('Error:', error); } finally { setLoading(false); }
  };

  const handleCrearAusencia = async (e: React.FormEvent) => {
    e.preventDefault();
    const tipoSel = TIPOS_AUSENCIA.find(t => t.value === formAusencia.tipo);
    if (tipoSel?.requiereFoto && !fotoUrl) { setMensaje({ tipo: 'error', texto: 'Requiere foto del certificado' }); return; }
    if (!formAusencia.id_tecnico || !formAusencia.fecha_inicio || !formAusencia.fecha_fin) { setMensaje({ tipo: 'error', texto: 'Complete todos los campos' }); return; }
    setProcesando(true);
    try {
      await createAusencia({ id_tecnico: parseInt(formAusencia.id_tecnico), tipo: formAusencia.tipo, fecha_inicio: formAusencia.fecha_inicio, fecha_fin: formAusencia.fecha_fin, descripcion: formAusencia.descripcion || undefined, foto_url: fotoUrl || undefined });
      setMensaje({ tipo: 'success', texto: 'Solicitud enviada' });
      setShowAusenciaModal(false); setFormAusencia({ id_tecnico: formAusencia.id_tecnico, tipo: 'dia_libre', fecha_inicio: '', fecha_fin: '', descripcion: '' }); setFotoUrl(null); loadData();
    } catch (error: any) { setMensaje({ tipo: 'error', texto: error.response?.data?.error || 'Error' }); } finally { setProcesando(false); }
  };

  const formatearHoras = (h: number) => { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return `${hh}h ${mm}m`; };
  const getAusenciaLabel = (t: string) => TIPOS_AUSENCIA.find(a => a.value === t)?.label || t;
  
  // Función para formatear fecha SIN conversión UTC (evita que muestre un día menos)
  const formatearFecha = (fechaIso: string) => {
    if (!fechaIso) return '-';
    // Extraer fecha directamente del string ISO sin usar new Date() que convierte a UTC
    const fecha = fechaIso.split('T')[0];
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  };

  // Aprobar ausencia
  const handleAprobarAusencia = async (id: number) => {
    try {
      await aprobarAusencia(id, '');
      loadData();
    } catch (error) { console.error('Error aprobando:', error); }
  };

  // Rechazar ausencia
  const handleRechazarAusencia = async (id: number) => {
    const motivo = prompt('Motivo del rechazo:');
    if (!motivo) return;
    try {
      await rechazarAusencia(id, motivo);
      loadData();
    } catch (error) { console.error('Error rechazando:', error); }
  };

  // eslint-disable-next-line no-restricted-globals
  const handleEliminarAusencia = async (id: number) => {
    console.log('Eliminando ausencia con ID:', id, 'Tipo:', typeof id);
    // eslint-disable-next-line no-restricted-globals
    if (confirm('¿Está seguro de eliminar esta solicitud de ausencia?')) {
      try {
        console.log('Llamando a deleteAusencia con ID:', Number(id));
        const res = await deleteAusencia(Number(id));
        setMensaje({ tipo: 'success', texto: 'Ausencia eliminada correctamente' });
        loadData();
      } catch (error: any) {
        console.error('Error eliminando ausencia:', error);
        console.log('URL была:', error.config?.url);
        const msgError = error.response?.data?.error || error.response?.data?.details || 'Error al eliminar la ausencia';
        setMensaje({ tipo: 'error', texto: msgError });
      }
    }
  };

  const getResumenActual = () => { 
    switch (vista) { 
      case 'diario': return resumenDiario; 
      case 'semanal': return resumenSemanal; 
      case 'mensual': return resumenMensual; 
      case 'custom': return resumenCustom;
      default: return []; 
    } 
  };

  const loadResumenCustom = async () => {
    if (!fechaCustomInicio || !fechaCustomFin) {
      setMensaje({ tipo: 'error', texto: 'Por favor seleccione fecha de inicio y fin' });
      return;
    }
    setProcesando(true);
    try {
      const res = await getResumenCustom({ fecha_inicio: fechaCustomInicio, fecha_fin: fechaCustomFin });
      setResumenCustom(res.data as any);
    } catch (error) { 
      console.error('Error cargando resumen custom:', error); 
      setMensaje({ tipo: 'error', texto: 'Error al cargar datos' });
    } finally { setProcesando(false); }
  };

  const loadRegistrosHoras = async () => {
    setLoadingRegistros(true);
    try {
      const res = await getHoras({ fecha_inicio: fechaRegistroInicio, fecha_fin: fechaRegistroFin });
      setRegistrosHoras(res.data as any);
    } catch (error) { console.error('Error cargando registros:', error); }
    finally { setLoadingRegistros(false); }
  };

  // Funciones para registro grupal
  const toggleTecnico = (id: number) => { setTecnicosSeleccionados(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]); };
  const agregarComida = () => { setComidas([...comidas, { tipo: 'almuerzo', hora_inicio: '12:00', hora_fin: '13:00' }]); };
  const eliminarComida = (index: number) => { setComidas(comidas.filter((_, i) => i !== index)); };
  const actualizarComida = (index: number, campo: string, valor: string) => { const nuevas = [...comidas]; (nuevas[index] as any)[campo] = valor; setComidas(nuevas); };
  const agregarSegmento = () => { setSegmentos([...segmentos, { id_orden: undefined, descripcion: '', hora_inicio: formGrupo.hora_entrada, hora_fin: formGrupo.hora_salida, tipo: 'normal' }]); };
  const eliminarSegmento = (index: number) => { setSegmentos(segmentos.filter((_, i) => i !== index)); };
  const actualizarSegmento = (index: number, campo: string, valor: any) => { const nuevos = [...segmentos]; (nuevos[index] as any)[campo] = valor; setSegmentos(nuevos); };

  const handleSubmitGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if ((tecnicosSeleccionados || []).length === 0) { setFormError('Seleccione al menos un técnico'); return; }
    setProcesando(true);
    try {
      // Solo incluir comidas que el usuario haya definido en el array (verificar que no fue eliminada)
      // Filtrar comidas existentes y agregar solo si tienen valores válidos
      const comidasValidas = comidas.filter(c => c.hora_inicio && c.hora_fin);
      const comidasFinal = comidasValidas.length > 0 ? comidasValidas : undefined;
      
      await createJornadaGrupo({
        fecha: formGrupo.fecha, hora_entrada: formGrupo.hora_entrada, hora_salida: formGrupo.hora_salida,
        observaciones: formGrupo.observaciones || undefined,
        tecnicos: tecnicosSeleccionados.map(id => ({ id_tecnico: id })),
        comidas: comidasFinal,
        segmentos: segmentos.length > 0 ? segmentos.map(s => ({ ...s, id_orden: s.id_orden || undefined })) : undefined
      });
      setMensaje({ tipo: 'success', texto: 'Registro grupal guardado correctamente' });
      setShowRegistroGrupal(false);
      setFormGrupo({ fecha: new Date().toISOString().split('T')[0], hora_entrada: '08:00', hora_salida: '17:00', hora_almuerzo_inicio: '12:00', hora_almuerzo_fin: '13:00', observaciones: '' });
      setTecnicosSeleccionados([]); setComidas([{ tipo: 'almuerzo', hora_inicio: '12:00', hora_fin: '13:00' }]); setSegmentos([]);
      loadData();
    } catch (error: any) { setFormError(error.response?.data?.error || 'Error al guardar'); } finally { setProcesando(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">⏱️ Control de Horas</h1>
        <div className="flex gap-2 flex-wrap">
          {esCoordinador && (
            <button onClick={() => setShowRegistroGrupal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <Plus size={18} /> Registro
            </button>
          )}
          <button onClick={() => setShowAusenciaModal(true)} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"><Calendar size={18} /> Ausencia</button>
        </div>
      </div>

      {mensaje && <div className={`p-4 rounded-lg flex items-center gap-2 ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}><AlertCircle size={18} />{mensaje.texto}</div>}

      {/* Modal: Registro Grupal */}
      {showRegistroGrupal && esCoordinador && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">📝 Registro de Jornada Grupal</h2>
              <button onClick={() => setShowRegistroGrupal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmitGrupo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Técnicos *</label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-gray-50 max-h-32 overflow-y-auto">
                  {tecnicos.filter(t => t.estado === 'activo').map(t => (
                    <button key={t.id} type="button" onClick={() => toggleTecnico(t.id)} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${tecnicosSeleccionados.includes(t.id) ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'}`}>
                      {tecnicosSeleccionados.includes(t.id) ? '✓ ' : ''}{t.nombre}
                    </button>
                  ))}
                </div>
                {(tecnicosSeleccionados || []).length > 0 && <p className="text-xs text-green-600 mt-1">{(tecnicosSeleccionados || []).length} técnico(s) seleccionado(s)</p>}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha *</label>
                  <input type="date" value={formGrupo.fecha} onChange={e => setFormGrupo({...formGrupo, fecha: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-1" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hora Entrada *</label>
                  <input type="time" value={formGrupo.hora_entrada} onChange={e => setFormGrupo({...formGrupo, hora_entrada: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-1" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hora Salida *</label>
                  <input type="time" value={formGrupo.hora_salida} onChange={e => setFormGrupo({...formGrupo, hora_salida: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-1" required />
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">🍽️ Comidas / Pausas</label>
                  <button type="button" onClick={agregarComida} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"><Plus size={16} /> Agregar</button>
                </div>
                {(comidas || []).length === 0 ? <p className="text-sm text-gray-400 italic">Sin pausas</p> : (
                  <div className="space-y-2">
                    {comidas.map((comida, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg flex-wrap">
                        <select value={comida.tipo} onChange={e => actualizarComida(idx, 'tipo', e.target.value)} className="border rounded px-2 py-1 text-sm">
                          <option value="desayuno">Desayuno</option><option value="almuerzo">Almuerzo</option><option value="cena">Cena</option>
                        </select>
                        <span className="text-sm">Desde:</span>
                        <input type="time" value={comida.hora_inicio} onChange={e => actualizarComida(idx, 'hora_inicio', e.target.value)} className="border rounded px-2 py-1 text-sm" />
                        <span className="text-sm">Hasta:</span>
                        <input type="time" value={comida.hora_fin} onChange={e => actualizarComida(idx, 'hora_fin', e.target.value)} className="border rounded px-2 py-1 text-sm" />
                        <button type="button" onClick={() => eliminarComida(idx)} className="text-red-500 ml-auto"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">🔧 Órdenes</label>
                  <button type="button" onClick={agregarSegmento} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"><Plus size={16} /> Agregar</button>
                </div>
                {segmentos.length === 0 ? <p className="text-sm text-gray-400 italic">Sin órdenes</p> : (
                  <div className="space-y-2">
                    {segmentos.map((seg, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg flex-wrap">
                        <select value={seg.id_orden || ''} onChange={e => actualizarSegmento(idx, 'id_orden', e.target.value ? parseInt(e.target.value) : undefined)} className="border rounded px-2 py-1 text-sm min-w-[150px]">
                          <option value="">Orden...</option>
                          {ordenes.filter(o => o.estado !== 'completada').map(o => <option key={o.id} value={o.id}>{o.numero_orden}</option>)}
                        </select>
                        <input type="text" value={seg.descripcion} onChange={e => actualizarSegmento(idx, 'descripcion', e.target.value)} placeholder="Desc" className="border rounded px-2 py-1 text-sm flex-1" />
                        <span className="text-sm">De:</span>
                        <input type="time" value={seg.hora_inicio} onChange={e => actualizarSegmento(idx, 'hora_inicio', e.target.value)} className="border rounded px-2 py-1 text-sm" />
                        <span className="text-sm">A:</span>
                        <input type="time" value={seg.hora_fin} onChange={e => actualizarSegmento(idx, 'hora_fin', e.target.value)} className="border rounded px-2 py-1 text-sm" />
                        <button type="button" onClick={() => eliminarSegmento(idx)} className="text-red-500"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                <textarea value={formGrupo.observaciones} onChange={e => setFormGrupo({...formGrupo, observaciones: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-1" rows={2} />
              </div>
              {formError && <p className="text-red-600 text-sm">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowRegistroGrupal(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" disabled={procesando} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{procesando ? 'Guardando...' : '💾 Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-2 flex flex-wrap gap-1">
        {[
          ...TABS,
          ...(esCoordinador ? [{ k: 'registros', l: '📝 Registros' }] : [])
        ].map(tab => (
          <button key={tab.k} onClick={() => setActiveTab(tab.k as TabType)} className={`px-4 py-2 rounded-lg ${activeTab === tab.k ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{tab.l}</button>
        ))}
      </div>

      {/* Tab: Resumen */}
      {activeTab === 'resumen' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Clock className="text-blue-600" size={24} /></div><div><p className="text-sm text-gray-500">Total Horas</p><p className="text-xl font-bold">{getResumenActual().reduce((s, r) => s + (r.total_horas || 0), 0).toFixed(1)}h</p></div></div></div>
            <div className="bg-white rounded-xl shadow-sm p-4"><div className="flex items-center gap-3"><div className="p-2 bg-red-100 rounded-lg"><TrendingUp className="text-red-600" size={24} /></div><div><p className="text-sm text-gray-500">Horas Extras</p><p className="text-xl font-bold">{getResumenActual().reduce((s, r) => s + (r.horas_extras || 0), 0).toFixed(1)}h</p></div></div></div>
            <div className="bg-white rounded-xl shadow-sm p-4"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="text-green-600" size={24} /></div><div><p className="text-sm text-gray-500">Cumplen 8h</p><p className="text-xl font-bold">{getResumenActual().filter(r => (r.horas_normales || 0) >= 8).length}/{getResumenActual().length}</p></div></div></div>
            <div className="bg-white rounded-xl shadow-sm p-4"><div className="flex items-center gap-3"><div className="p-2 bg-yellow-100 rounded-lg"><Calendar className="text-yellow-600" size={24} /></div><div><p className="text-sm text-gray-500">Incompleto</p><p className="text-xl font-bold">{getResumenActual().filter(r => (r.horas_normales || 0) < 8 && (r.horas_normales || 0) > 0).length}</p></div></div></div>
            <div className="bg-white rounded-xl shadow-sm p-4"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><Calendar className="text-purple-600" size={24} /></div><div><p className="text-sm text-gray-500">Técnicos</p><p className="text-xl font-bold">{getResumenActual().length}</p></div></div></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex gap-2 mb-4 flex-wrap items-end">
              <button onClick={() => setVista('diario')} className={`px-4 py-2 rounded-lg ${vista === 'diario' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Diario</button>
              <button onClick={() => setVista('semanal')} className={`px-4 py-2 rounded-lg ${vista === 'semanal' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Semanal</button>
              <button onClick={() => setVista('mensual')} className={`px-4 py-2 rounded-lg ${vista === 'mensual' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Mensual</button>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-gray-500 mb-1">Filtrar por técnico</label>
                <select
                  value={filtroTecnico}
                  onChange={(e) => setFiltroTecnico(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Todos los técnicos</option>
                  {tecnicos.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => setVista('custom')} className={`px-4 py-2 rounded-lg ${vista === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Custom</button>
            </div>
            {vista === 'custom' && (
              <div className="flex gap-2 mb-4 items-center">
                <input type="date" value={fechaCustomInicio} onChange={e => setFechaCustomInicio(e.target.value)} className="border rounded px-2 py-1" />
                <span>hasta</span>
                <input type="date" value={fechaCustomFin} onChange={e => setFechaCustomFin(e.target.value)} className="border rounded px-2 py-1" />
                <button onClick={loadResumenCustom} className="px-3 py-1 bg-blue-600 text-white rounded">Buscar</button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Técnico</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Normales</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Extras</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Total</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Estado</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {getResumenActual().map((r, i) => {
                    const horasNormales = r.horas_normales || 0;
                    const cumplimiento = horasNormales >= 8 ? '✅' : horasNormales > 0 ? '⚠️' : '❌';
                    return (
                      <tr key={i}>
                        <td className="px-4 py-3 text-sm">{r.tecnico?.nombre || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{formatearHoras(horasNormales)}</td>
                        <td className="px-4 py-3 text-sm text-red-600">{formatearHoras(r.horas_extras || 0)}</td>
                        <td className="px-4 py-3 text-sm font-bold">{formatearHoras(r.total_horas || 0)}</td>
                        <td className="px-4 py-3 text-sm">{cumplimiento} {horasNormales >= 8 ? 'Cumplió' : horasNormales > 0 ? '<8h' : 'Sin registro'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab: Ausencias */}
      {activeTab === 'ausencias' && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* Sección de aprobaciones para coordinador - siempre visible si es coordinador */}
          {esCoordinador && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-orange-700">✈️ Solicitudes Pendientes de Aprobación</h2>
              {ausenciasPendientes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay solicitudes pendientes</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-orange-50"><tr><th className="px-4 py-3 text-left text-sm font-medium text-orange-700">Técnico</th><th className="px-4 py-3 text-left text-sm font-medium text-orange-700">Tipo</th><th className="px-4 py-3 text-left text-sm font-medium text-orange-700">Fechas</th><th className="px-4 py-3 text-left text-sm font-medium text-orange-700">Descripción</th><th className="px-4 py-3 text-center text-sm font-medium text-orange-700">Acciones</th></tr></thead>
                    <tbody className="divide-y divide-orange-100">
                      {ausenciasPendientes.map((a) => (
                        <tr key={a.id} className="hover:bg-orange-50">
                          <td className="px-4 py-3 text-sm font-medium">{a.tecnico?.nombre || `Técnico #${a.id_tecnico}`}</td>
                          <td className="px-4 py-3 text-sm">{getAusenciaLabel(a.tipo)}</td>
                          <td className="px-4 py-3 text-sm">{a.fecha_inicio ? formatearFecha(a.fecha_inicio) : '-'} - {a.fecha_fin ? formatearFecha(a.fecha_fin) : '-'}</td>
                          <td className="px-4 py-3 text-sm max-w-xs truncate">{a.descripcion || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleAprobarAusencia(a.id)} className="mr-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">✓ Aprobar</button>
                            <button onClick={() => handleRechazarAusencia(a.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">✗ Rechazar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <h2 className="text-lg font-semibold mb-4">Mis Solicitudes de Ausencia</h2>
          {ausencias.length === 0 ? <p className="text-gray-500 text-center py-8">No hay solicitudes</p> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Técnico</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tipo</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Fecha Inicio</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Fecha Fin</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Estado</th>{esCoordinador && <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Acciones</th>}</tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {ausencias.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{a.tecnico?.nombre || `Técnico #${a.id_tecnico}`}</td>
                      <td className="px-4 py-3 text-sm">{getAusenciaLabel(a.tipo)}</td>
                      <td className="px-4 py-3 text-sm">{a.fecha_inicio ? formatearFecha(a.fecha_inicio) : '-'}</td>
                      <td className="px-4 py-3 text-sm">{a.fecha_fin ? formatearFecha(a.fecha_fin) : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${a.estado === 'aprobado' ? 'bg-green-100 text-green-700' : a.estado === 'rechazado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {a.estado === 'aprobado' ? '✓ Aprobado' : a.estado === 'rechazado' ? '✗ Rechazado' : '⏳ Pendiente'}
                        </span>
                      </td>
                      {esCoordinador && (
                        <td className="px-4 py-3">
                          <button onClick={() => { console.log('Click eliminar, ID:', a.id); handleEliminarAusencia(Number(a.id)); }} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Eliminar">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Solicitar Ausencia */}
      {showAusenciaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Solicitar Ausencia</h2>
            <form onSubmit={handleCrearAusencia} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Técnico</label>
                <select value={formAusencia.id_tecnico} onChange={(e) => setFormAusencia({...formAusencia, id_tecnico: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-1" required>
                  <option value="">Seleccionar técnico</option>
                  {tecnicos.map((t) => (<option key={t.id} value={t.id}>{t.nombre}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de Ausencia</label>
                <select value={formAusencia.tipo} onChange={(e) => setFormAusencia({...formAusencia, tipo: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-1">
                  {TIPOS_AUSENCIA.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
                {TIPOS_AUSENCIA.find(t => t.value === formAusencia.tipo)?.requiereFoto && (
                  <p className="text-xs text-orange-600 mt-1">⚠️ Este tipo requiere foto del certificado</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
                  <input type="date" value={formAusencia.fecha_inicio} onChange={(e) => setFormAusencia({...formAusencia, fecha_inicio: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-1" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Fin</label>
                  <input type="date" value={formAusencia.fecha_fin} onChange={(e) => setFormAusencia({...formAusencia, fecha_fin: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-1" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Descripción (opcional)</label>
                <textarea value={formAusencia.descripcion} onChange={(e) => setFormAusencia({...formAusencia, descripcion: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-1" rows={2} placeholder="Motivo de la ausencia" />
              </div>
              {TIPOS_AUSENCIA.find(t => t.value === formAusencia.tipo)?.requiereFoto && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Foto del certificado <span className="text-red-500">*</span></label>
                  <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setFotoUrl(r.result as string); r.readAsDataURL(f); }}} accept="image/*" className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 mt-1">
                    <Camera size={18} />{fotoUrl ? 'Cambiar foto' : 'Subir foto'}
                  </button>
                  {fotoUrl && <img src={fotoUrl} alt="Preview" className="mt-2 w-20 h-20 object-cover rounded-lg border" />}
                </div>
              )}
              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => { setShowAusenciaModal(false); setFotoUrl(null); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={procesando} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">{procesando ? 'Enviando...' : 'Enviar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Registros */}
      {activeTab === 'registros' && esCoordinador && (
        <div className="space-y-6">
          {/* Sección: Registros Individuales con Desglose */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-lg font-semibold mb-4">📋 Registros de Horas Individuales</h2>
            <div className="flex gap-2 mb-4 items-center flex-wrap">
              <label className="text-sm font-medium">Desde:</label>
              <input type="date" value={fechaRegistroInicio} onChange={e => setFechaRegistroInicio(e.target.value)} className="border rounded px-2 py-1" />
              <label className="text-sm font-medium">Hasta:</label>
              <input type="date" value={fechaRegistroFin} onChange={e => setFechaRegistroFin(e.target.value)} className="border rounded px-2 py-1" />
              <button onClick={loadRegistrosHoras} disabled={loadingRegistros} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                {loadingRegistros ? 'Cargando...' : 'Buscar'}
              </button>
            </div>
            {registrosHoras.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay registros en el período seleccionado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Fecha</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Técnico</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Entrada</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Almuerzo</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Salida</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">H. Normal</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">H. Extra</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Total</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Orden</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosHoras.map((r: any, i: number) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2">{r.fecha}</td>
                        <td className="px-3 py-2">{r.tecnico?.nombre || 'N/A'}</td>
                        <td className="px-3 py-2">{r.hora_inicio || '-'}</td>
                        <td className="px-3 py-2">{r.hora_almuerzo_inicio && r.hora_almuerzo_fin ? `${r.hora_almuerzo_inicio}-${r.hora_almuerzo_fin}` : '-'}</td>
                        <td className="px-3 py-2">{r.hora_fin || '-'}</td>
                        <td className="px-3 py-2">{r.horas_normales?.toFixed(1) || '0'}h</td>
                        <td className="px-3 py-2 text-red-600">{r.horas_extras?.toFixed(1) || '0'}h</td>
                        <td className="px-3 py-2 font-medium">{((r.horas_normales || 0) + (r.horas_extras || 0)).toFixed(1)}h</td>
                        <td className="px-3 py-2">{r.orden?.numero_orden || r.id_orden || '-'}</td>
                        <td className="px-3 py-2">
                          {r.es_dia_libre ? '🟢 Libre' : r.tiene_certificacion ? '🔵 Certif.' : r.tipo === 'extra' ? '🔴 Extra' : '🟡 Normal'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Horas;