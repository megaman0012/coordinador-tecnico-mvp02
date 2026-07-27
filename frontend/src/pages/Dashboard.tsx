import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { CheckCircle, Clock, AlertTriangle, Users, FileText, TrendingUp, Calendar, Plus, ArrowRight, AlertCircle, Wrench, DollarSign, ChevronDown, ChevronUp, Building } from 'lucide-react';
import { getKPIs, getTareasRecientes, getOrdenesAtrasadas, getResumenMensual, getTecnicos, getHistorialAsignaciones, getResumenPorCliente } from '../services/api';
import { KPIs, Orden, ResumenHoras, Tecnico } from '../types';
import GraficoEstadoClientes from '../components/GraficoEstadoClientes';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899'];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [ordenesRecientes, setOrdenesRecientes] = useState<Orden[]>([]);
  const [ordenesAtrasadas, setOrdenesAtrasadas] = useState<Orden[]>([]);
  const [resumenHoras, setResumenHoras] = useState<ResumenHoras[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para historial de asignaciones
  const [historialAsignaciones, setHistorialAsignaciones] = useState<any[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [filtrosHistorial, setFiltrosHistorial] = useState({
    buscar: '',
    id_tecnico: '',
    id_orden: '',
    estado: '',
    fecha_inicio: '',
    fecha_fin: ''
  });

  // Estado para resumen por cliente
  const [resumenCliente, setResumenCliente] = useState<any[]>([]);
  const [clienteExpandido, setClienteExpandido] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [kpisRes, recientesRes, atrasadasRes, horasRes, tecnicosRes, resumenRes] = await Promise.all([
        getKPIs(),
        getTareasRecientes(5),
        getOrdenesAtrasadas(),
        getResumenMensual(),
        getTecnicos(),
        getResumenPorCliente()
      ]);
      setKpis(kpisRes.data as any || {});
      setOrdenesRecientes(recientesRes.data as any || []);
      setOrdenesAtrasadas(atrasadasRes.data as any || []);
      setResumenHoras(horasRes.data as any || []);
      setTecnicos(tecnicosRes.data as any || []);
      setResumenCliente(resumenRes.data as any || []);
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error al cargar datos';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Cargar historial de asignaciones con filtros
  const loadHistorial = async () => {
    setHistorialLoading(true);
    try {
      const params: any = {};
      if (filtrosHistorial.id_tecnico) params.id_tecnico = parseInt(filtrosHistorial.id_tecnico);
      if (filtrosHistorial.id_orden) params.id_orden = parseInt(filtrosHistorial.id_orden);
      if (filtrosHistorial.estado) params.estado = filtrosHistorial.estado;
      
      const res = await getHistorialAsignaciones(params);
      let data: any = res.data?.data || res.data || [];
      
      // Filtrar por búsqueda de texto si existe
      if (filtrosHistorial.buscar) {
        const buscar = filtrosHistorial.buscar.toLowerCase();
        data = (data || []).filter((a: any) => 
          a.orden?.numero_orden?.toLowerCase().includes(buscar) ||
          a.orden?.cliente?.nombre?.toLowerCase().includes(buscar) ||
          a.orden?.local?.nombre?.toLowerCase().includes(buscar) ||
          a.tecnico?.nombre?.toLowerCase().includes(buscar)
        );
      }
      
      // Filtrar por fecha_asignacion de la asignación (no por fecha_programada de la orden)
      if (filtrosHistorial.fecha_inicio || filtrosHistorial.fecha_fin) {
        const fechaInicio = filtrosHistorial.fecha_inicio ? new Date(filtrosHistorial.fecha_inicio + 'T00:00:00') : null;
        const fechaFin = filtrosHistorial.fecha_fin ? new Date(filtrosHistorial.fecha_fin + 'T23:59:59') : null;
        
        data = (data || []).filter((a: any) => {
          const fechaAsignacion = a.fecha_asignacion ? new Date(a.fecha_asignacion) : null;
          if (!fechaAsignacion) return false;
          
          if (fechaInicio && fechaAsignacion < fechaInicio) return false;
          if (fechaFin && fechaAsignacion > fechaFin) return false;
          return true;
        });
      }
      
      setHistorialAsignaciones((data || []) as any);
    } catch (error: any) {
      console.error('Error cargando historial:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error al cargar historial';
      setError(errorMsg);
    } finally {
      setHistorialLoading(false);
    }
  };

  // Cargar historial cuando cambian los filtros
  useEffect(() => {
    loadHistorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrosHistorial]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Datos para gráficos - solo renderizar si hay datos válidos
  const estadoData = kpis?.ordenes && (kpis.ordenes.pendientes > 0 || kpis.ordenes.enProceso > 0 || kpis.ordenes.completadas > 0 || kpis.ordenes.atrasadas > 0) ? [
    { name: 'Pendientes', value: kpis.ordenes.pendientes },
    { name: 'En Proceso', value: kpis.ordenes.enProceso },
    { name: 'Completadas', value: kpis.ordenes.completadas },
    { name: 'Atrasadas', value: kpis.ordenes.atrasadas }
  ] : [];

  const facturacionData = kpis?.facturacion && (kpis.facturacion.pendientes > 0 || kpis.facturacion.pagadas > 0) ? [
    { name: 'Pendientes', value: kpis.facturacion.pendientes },
    { name: 'Pagadas', value: kpis.facturacion.pagadas }
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard</h1>
        <span className="text-xs sm:text-sm text-gray-500">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Mostrar error si existe */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Error al cargar datos:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Acciones Rápidas */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">ACCIONES RÁPIDAS</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/ordenes')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            Nueva Orden
          </button>
          <button
            onClick={() => navigate('/horas')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Clock size={18} />
            Registrar Horas
          </button>
          <button
            onClick={() => navigate('/asignaciones')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Wrench size={18} />
            Nueva Asignación
          </button>
          <button
            onClick={() => navigate('/facturas')}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            <DollarSign size={18} />
            Nueva Factura
          </button>
        </div>
      </div>

      {/* Alertas y Notificaciones */}
      {(kpis?.ordenes?.atrasadas || 0) > 0 || (kpis?.facturacion?.pendientes || 0) > 0 ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="text-red-600" size={20} />
            <h2 className="text-sm font-semibold text-red-800">ATENCIÓN REQUERIDA</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {(kpis?.ordenes?.atrasadas || 0) > 0 && (
              <button
                onClick={() => navigate('/ordenes')}
                className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
              >
                <AlertTriangle size={16} />
                {kpis?.ordenes?.atrasadas || 0} órdenes atrasadas
                <ArrowRight size={14} />
              </button>
            )}
            {(kpis?.facturacion?.pendientes || 0) > 0 && (
              <button
                onClick={() => navigate('/facturas')}
                className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-sm"
              >
                <DollarSign size={16} />
                {kpis?.facturacion?.pendientes || 0} facturas pendientes
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* KPIs Cards - Órdenes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completadas</p>
              <p className="text-2xl font-bold text-green-600">{kpis?.ordenes?.completadas || 0}</p>
            </div>
            <CheckCircle className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Atrasadas</p>
              <p className="text-2xl font-bold text-red-600">{kpis?.ordenes?.atrasadas || 0}</p>
            </div>
            <AlertTriangle className="text-red-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Horas Extras Mes</p>
              <p className="text-2xl font-bold text-yellow-600">{(kpis?.horas?.extras || 0).toFixed(1)}h</p>
            </div>
            <Clock className="text-yellow-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Facturación Pend.</p>
              <p className="text-2xl font-bold text-blue-600">{kpis?.facturacion?.pendientes || 0}</p>
            </div>
            <FileText className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Técnicos Activos</p>
              <p className="text-2xl font-bold text-purple-600">{kpis?.tecnicos?.activos || 0}</p>
            </div>
            <Users className="text-purple-500" size={32} />
          </div>
        </div>
      </div>

      {/* Gráfico de Estado de Trabajos por Cliente */}
      <GraficoEstadoClientes 
        clientes={resumenCliente} 
        onClienteExpandido={setClienteExpandido} 
        clienteExpandidoActual={clienteExpandido} 
      />

      {/* Resumen por Cliente */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building className="text-gray-600" size={20} />
          <h2 className="text-lg font-semibold">Resumen por Cliente</h2>
        </div>
        
        {(resumenCliente || []).length === 0 ? (
          <p className="text-gray-500 text-sm">No hay datos de órdenes</p>
        ) : (
          <div className="space-y-2">
            {resumenCliente.map((cliente) => (
              <div key={cliente.id} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => setClienteExpandido(clienteExpandido === cliente.id ? null : cliente.id)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building className="text-blue-600" size={18} />
                    <div className="text-left">
                      <p className="font-medium text-gray-800">{cliente.nombre}</p>
                      <p className="text-xs text-gray-500">RUC: {cliente.ruc || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2 text-sm">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">{cliente.pendientes} pend.</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{cliente.asignadas} asig.</span>
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">{cliente.enProceso} en proc.</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">{cliente.completadas} compl.</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">{cliente.total} total</span>
                    </div>
                    {clienteExpandido === cliente.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>
                
                {clienteExpandido === cliente.id && (
                  <div className="p-4 bg-white border-t">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      <div className="p-3 bg-yellow-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-yellow-600">{cliente.pendientes}</p>
                        <p className="text-xs text-yellow-700">Pendientes</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-blue-600">{cliente.asignadas}</p>
                        <p className="text-xs text-blue-700">Asignadas</p>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-orange-600">{cliente.enProceso}</p>
                        <p className="text-xs text-orange-700">En Proceso</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-green-600">{cliente.completadas}</p>
                        <p className="text-xs text-green-700">Completadas</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-red-600">{cliente.noCumplidas}</p>
                        <p className="text-xs text-red-700">No Cumplidas</p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-purple-600">{cliente.facturadas}</p>
                        <p className="text-xs text-purple-700">Facturadas</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de Asignaciones */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Historial de Asignaciones</h2>
          <FileText className="text-gray-400" size={20} />
        </div>
        
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
          <div>
            <input
              type="text"
              placeholder="Buscar..."
              value={filtrosHistorial.buscar}
              onChange={(e) => setFiltrosHistorial({ ...filtrosHistorial, buscar: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <select
              value={filtrosHistorial.id_tecnico}
              onChange={(e) => setFiltrosHistorial({ ...filtrosHistorial, id_tecnico: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos los técnicos</option>
              {tecnicos.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={filtrosHistorial.estado}
              onChange={(e) => setFiltrosHistorial({ ...filtrosHistorial, estado: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="completada">Completada</option>
              <option value="no_cumplida">No Cumplida</option>
              <option value="reprogramado">Reprogramado</option>
            </select>
          </div>
          <div>
            <input
              type="date"
              value={filtrosHistorial.fecha_inicio}
              onChange={(e) => setFiltrosHistorial({ ...filtrosHistorial, fecha_inicio: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Fecha inicio"
            />
          </div>
          <div>
            <input
              type="date"
              value={filtrosHistorial.fecha_fin}
              onChange={(e) => setFiltrosHistorial({ ...filtrosHistorial, fecha_fin: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Fecha fin"
            />
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setFiltrosHistorial({ buscar: '', id_tecnico: '', id_orden: '', estado: '', fecha_inicio: '', fecha_fin: '' })}
              className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Orden</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Cliente</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Local</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Técnico</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Fecha Asignación</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Horario</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historialLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-gray-500">Cargando...</td>
                </tr>
              ) : (historialAsignaciones || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-gray-500">No hay asignaciones</td>
                </tr>
              ) : (
                historialAsignaciones.slice(0, 20).map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm">{a.orden?.numero_orden || '-'}</td>
                    <td className="px-3 py-2 text-sm">{a.orden?.cliente?.nombre || '-'}</td>
                    <td className="px-3 py-2 text-sm">{a.orden?.local?.nombre || '-'}</td>
                    <td className="px-3 py-2 text-sm">{a.tecnico?.nombre || '-'}</td>
                    <td className="px-3 py-2 text-sm">
                      {a.fecha_asignacion ? new Date(a.fecha_asignacion).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {a.hora_inicio_programada && a.hora_fin_programada 
                        ? `${a.hora_inicio_programada} - ${a.hora_fin_programada}` 
                        : '-'}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        a.estado === 'completada' ? 'bg-green-100 text-green-700' :
                        a.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                        a.estado === 'no_cumplida' ? 'bg-red-100 text-red-700' :
                        a.estado === 'reprogramado' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {a.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {(historialAsignaciones || []).length > 20 && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Mostrando 20 de {(historialAsignaciones || []).length} asignaciones
          </p>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Órdenes por Estado */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Órdenes por Estado</h2>
          <div className="h-64">
            {estadoData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={estadoData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {estadoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No hay órdenes registradas
              </div>
            )}
          </div>
        </div>

        {/* Facturación */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Estado de Facturación</h2>
          <div className="h-64">
            {facturacionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={facturacionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {facturacionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No hay datos de facturación
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Monto Facturado</p>
              <p className="text-lg font-bold text-green-600">${(kpis?.facturacion?.montoFacturado || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Monto Cobrado</p>
              <p className="text-lg font-bold text-blue-600">${(kpis?.facturacion?.montoCobrado || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Órdenes Atrasadas y Recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Órdenes Atrasadas */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-red-600">Órdenes Atrasadas</h2>
            <AlertTriangle className="text-red-500" size={20} />
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(ordenesAtrasadas || []).length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay órdenes atrasadas</p>
            ) : (
              ordenesAtrasadas.slice(0, 5).map((orden) => (
                <div key={orden.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{orden.numero_orden}</p>
                    <p className="text-xs text-gray-500">{orden.cliente?.nombre} - {orden.local?.nombre}</p>
                  </div>
                  <span className="text-xs text-red-600">
                    {orden.fecha_programada ? new Date(orden.fecha_programada).toLocaleDateString() : 'Sin fecha'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Órdenes Recientes */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Órdenes Recientes</h2>
            <Calendar className="text-gray-400" size={20} />
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(ordenesRecientes || []).length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay órdenes recientes</p>
            ) : (
              ordenesRecientes.map((orden) => (
                <div key={orden.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{orden.numero_orden}</p>
                    <p className="text-xs text-gray-500">{orden.cliente?.nombre}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    orden.estado === 'completada' ? 'bg-green-100 text-green-700' :
                    orden.estado === 'en_proceso' ? 'bg-blue-100 text-blue-700' :
                    orden.estado === 'pendiente' ? 'bg-gray-100 text-gray-700' :
                    orden.estado === 'no_cumplida' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {orden.estado}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Resumen de Horas del Mes */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Resumen del Mes</h2>
          <TrendingUp className="text-gray-400" size={20} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Total Órdenes</p>
            <p className="text-2xl font-bold text-gray-800">{kpis?.ordenes?.total || 0}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Horas Trabajadas</p>
            <p className="text-2xl font-bold text-blue-600">{(kpis?.horas?.mes || 0).toFixed(1)}h</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Horas Extras</p>
            <p className="text-2xl font-bold text-yellow-600">{(kpis?.horas?.extras || 0).toFixed(1)}h</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Pendiente Cobro</p>
            <p className="text-2xl font-bold text-red-600">${((kpis?.facturacion?.montoFacturado || 0) - (kpis?.facturacion?.montoCobrado || 0)).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Carga de Trabajo por Técnico */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Carga de Trabajo por Técnico</h2>
          <Users className="text-gray-400" size={20} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tecnicos.filter(t => t.estado === 'activo').map((tecnico) => {
            const horasTecnico = resumenHoras.find(h => h.tecnico?.id === tecnico.id);
            const jornada = tecnico.jornada_horaria * 22; // ~22 días laborables
            const porcentaje = horasTecnico ? Math.min(100, (horasTecnico.total_horas / jornada) * 100) : 0;
            const getColor = (pct: number) => {
              if (pct >= 90) return 'bg-red-500';
              if (pct >= 70) return 'bg-yellow-500';
              return 'bg-green-500';
            };
            return (
              <div key={tecnico.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="font-medium text-gray-800">{tecnico.nombre}</p>
                    <p className="text-xs text-gray-500">{tecnico.especialidad || 'Sin especialidad'}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-600">
                    {horasTecnico ? horasTecnico.total_horas.toFixed(1) : 0}h
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getColor(porcentaje)}`}
                    style={{ width: `${porcentaje}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>0h</span>
                  <span>{jornada}h (meta)</span>
                </div>
              </div>
            );
          })}
          {(tecnicos || []).filter(t => t.estado === 'activo').length === 0 && (
            <p className="text-gray-500 text-center py-4 col-span-3">No hay técnicos activos</p>
          )}
        </div>
      </div>

      {/* Productividad - Gráfico de Barras */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Horas por Técnico (Mes Actual)</h2>
          <Clock className="text-gray-400" size={20} />
        </div>
        <div className="h-64">
          {resumenHoras.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resumenHoras.map(h => ({
                nombre: h.tecnico?.nombre || 'Sin nombre',
                horas: h.total_horas || 0,
                extras: h.horas_extras || h.horas_extra || 0
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="horas" name="Horas Normales" fill="#3B82F6" stackId="a" />
                <Bar dataKey="extras" name="Horas Extras" fill="#F59E0B" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No hay datos de horas registradas
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;