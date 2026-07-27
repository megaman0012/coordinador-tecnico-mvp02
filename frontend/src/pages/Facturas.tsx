import React, { useEffect, useState } from 'react';
import { FileText, DollarSign, Clock, CheckCircle, Plus, Filter, AlertTriangle, ArrowRight, Check, Circle, Play, CreditCard, X, Package, Calendar, UserCheck, History, Download } from 'lucide-react';
import { getFacturas, createFactura, getOrdenesFacturables, getResumenFacturacion, planificarFacturacion, iniciarFacturacion, finalizarFacturacion, registrarPago, getHistorialFactura, subirArchivo, updateFactura } from '../services/api';
import { Factura, Orden, EstadoFacturacion } from '../types';
import { generarInformeWord } from '../utils/generarWord';

// Workflow steps v3.1
const WORKFLOW_STEPS = [
  { key: 'no_iniciada', label: 'Creada', icon: Circle },
  { key: 'validacion_cliente', label: 'Validación Cliente', icon: UserCheck },
  { key: 'aprobada_cliente', label: 'Aprobada', icon: Check },
  { key: 'finalizada', label: 'Finalizada', icon: FileText },
  { key: 'pagada', label: 'Pagada', icon: CreditCard }
];

// Interface para datos extendidos de orden (con fechas de proyecto)
interface OrdenExtendida extends Orden {
  informe_aprobado?: boolean;
  fecha_inicio_proyecto?: string;
  fecha_fin_proyecto?: string;
  descripcion?: string;
  informe?: {
    id: number;
    descripcion_trabajo?: string;
    fotos?: string;
  } | null;
}

const Facturas: React.FC = () => {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [ordenesFacturables, setOrdenesFacturables] = useState<OrdenExtendida[]>([]);
  const [busquedaOrden, setBusquedaOrden] = useState('');
  
  // Órdenes filtradas por búsqueda
  const ordenesFiltradas = ordenesFacturables.filter(o => {
    if (!busquedaOrden) return true;
    const texto = busquedaOrden.toLowerCase();
    return (
      o.numero_orden?.toLowerCase().includes(texto) ||
      o.cliente?.nombre?.toLowerCase().includes(texto) ||
      o.local?.nombre?.toLowerCase().includes(texto)
    );
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<Factura | null>(null);
  const [filtro, setFiltro] = useState({ estado: '', fecha_inicio: '', fecha_fin: '' });
  const [resumen, setResumen] = useState<any>(null);
  const [formError, setFormError] = useState('');
  
  // Datos para crear factura
  const [formData, setFormData] = useState({
    id_orden: '',
    monto: 0,
    observaciones: '',
    numero_factura: '',
    orden_compra_cliente: '',
    tiene_oc: false,
    archivos_adjuntos: ''
  });
  
  // Datos para pago
  const [pagoData, setPagoData] = useState({
    monto_pagado: 0,
    observaciones: ''
  });
  
  // Datos del wizard (iguo que formData pero para wizard)
  const [wizardData, setWizardData] = useState({
    id_orden: '',
    monto: 0,
    numero_factura: '',
    orden_compra_cliente: '',
    tiene_oc: false,
    fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    monto_pagado: 0,
    observaciones: '',
    // Archivos
    archivo_cotizacion: '',     // URL de cotización subida
    archivo_aprobacion: '',  // Archivo de aprobación del cliente
    // Campos calculados (readonly)
    fecha_inicio_proyecto: '',
    fecha_fin_proyecto: '',
    reporte_aprobado: false,
    descripcion: ''
  });

  // Estado de la orden seleccionada (para mostrar info)
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenExtendida | null>(null);
  
  // Historial de la factura
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialFactura, setHistorialFactura] = useState<any[]>([]);

  // Facturas próximas a vencer (en 7 días)
  const facturasProximasVencer = facturas.filter(f => {
    if (!f.fecha_vencimiento || f.estado === 'pagada') return false;
    const diasRestantes = Math.ceil((new Date(f.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diasRestantes <= 7 && diasRestantes >= 0;
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Token:', token ? 'exists' : 'none');
      
      const [facturasRes, ordenesRes, resumenRes] = await Promise.all([
        getFacturas({
          estado: filtro.estado || undefined,
          fecha_inicio: filtro.fecha_inicio || undefined,
          fecha_fin: filtro.fecha_fin || undefined
        }),
        getOrdenesFacturables(),
        getResumenFacturacion()
      ]);
      
      console.log('Facturas response:', facturasRes);
      console.log('Ordenes response:', ordenesRes);
      console.log('Resumen response:', resumenRes);
      
      // Facturas: puede ser { success: true, data: [...] } o directamente [...]
      let facturasData = (facturasRes as any)?.data;
      if (facturasData && facturasData.success !== undefined) {
        facturasData = facturasData.data || facturasData;
      }
      if (!Array.isArray(facturasData)) {
        facturasData = [];
      }
      setFacturas(facturasData as any);
      
      // Órdenes facturables: puede ser { success: true, data: [...] } o directamente [...]
      let ordenesData = (ordenesRes as any)?.data;
      if (ordenesData && ordenesData.success !== undefined) {
        ordenesData = ordenesData.data || ordenesData;
      }
      if (!Array.isArray(ordenesData)) {
        ordenesData = [];
      }
      console.log('Ordenes facturables:', ordenesData);
      setOrdenesFacturables(ordenesData as any);
      
      // Resumen: puede ser { success: true, data: {...} } o directamente {...}
      let resumenData = (resumenRes as any)?.data;
      if (resumenData && resumenData.success !== undefined) {
        resumenData = resumenData.data || resumenData;
      }
      setResumen(resumenData as any);
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      console.error('Error response:', error.response);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validar orden
    if (!formData.id_orden) {
      setFormError('Debe seleccionar una orden');
      return;
    }

    // Validar monto
    if (!formData.monto || formData.monto <= 0) {
      setFormError('El monto debe ser mayor a 0');
      return;
    }

    try {
      await createFactura({
        id_orden: parseInt(formData.id_orden),
        monto: formData.monto,
        observaciones: formData.observaciones,
        numero_factura: formData.numero_factura || undefined,
        orden_compra_cliente: formData.orden_compra_cliente || undefined,
        tiene_oc: formData.tiene_oc
      });
      setShowModal(false);
      setFormData({ 
        id_orden: '', 
        monto: 0, 
        observaciones: '',
        numero_factura: '',
        orden_compra_cliente: '',
        tiene_oc: false,
        archivos_adjuntos: ''
      });
      loadData();
    } catch (error: any) {
      console.error('Error creando factura:', error);
      setFormError(error.response?.data?.error || error.response?.data?.message || 'Error al crear factura');
    }
  };

  // Función para autocompletar datos al seleccionar orden
  const handleOrdenChange = (ordenId: string) => {
    const orden = ordenesFacturables.find(o => o.id === parseInt(ordenId));
    if (orden) {
      setOrdenSeleccionada(orden);
      setFormData(prev => ({
        ...prev,
        id_orden: ordenId,
        // Los campos de fecha y reporte se calculan en backend
      }));
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePlanificar = async (id: number) => {
    try {
      await planificarFacturacion(id, {
        fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        monto: 0,
        observaciones: ''
      });
      loadData();
    } catch (error) {
      console.error('Error planificando:', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleIniciar = async (id: number) => {
    try {
      await iniciarFacturacion(id);
      loadData();
    } catch (error) {
      console.error('Error iniciando:', error);
    }
  };

  const handleFinalizar = async (id: number) => {
    try {
      await finalizarFacturacion(id, {
        numero_factura: `FAC-${Date.now()}`,
        monto: facturaSeleccionada?.monto || 0
      });
      setShowPagoModal(false);
      loadData();
    } catch (error) {
      console.error('Error finalizando:', error);
    }
  };

  const handlePagar = async () => {
    if (!facturaSeleccionada) return;
    try {
      await registrarPago(facturaSeleccionada.id, {
        monto_pagado: pagoData.monto_pagado,
        observaciones: pagoData.observaciones
      });
      setShowPagoModal(false);
      setFacturaSeleccionada(null);
      setPagoData({ monto_pagado: 0, observaciones: '' });
      loadData();
    } catch (error) {
      console.error('Error registrando pago:', error);
    }
  };

  // Wizard functions
  const startWizard = (factura?: Factura) => {
    // Limpiar estado previo al abrir nueva factura
    setFacturaSeleccionada(factura || null);
    setOrdenSeleccionada(null);
    setFormError('');
    
    if (factura) {
      setWizardData({
        id_orden: factura.id_orden?.toString() || '',
        monto: factura.monto || 0,
        numero_factura: factura.numero_factura || '',
        orden_compra_cliente: (factura as any).orden_compra_cliente || '',
        tiene_oc: (factura as any).tiene_oc || false,
        fecha_vencimiento: factura.fecha_vencimiento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        monto_pagado: factura.monto_pagado || 0,
        observaciones: '',
        // Archivos
        archivo_cotizacion: (factura as any).archivo_cotizacion || '',
        archivo_aprobacion: (factura as any).archivo_aprobacion || '',
        // Campos calculados (readonly)
        fecha_inicio_proyecto: (factura as any).fecha_inicio_proyecto || '',
        fecha_fin_proyecto: (factura as any).fecha_fin_proyecto || '',
        reporte_aprobado: (factura as any).reporte_aprobado || false,
        descripcion: ''
      });
      // Set initial step based on current state
      const currentStep = WORKFLOW_STEPS.findIndex(s => s.key === factura.estado);
      setWizardStep(currentStep >= 0 ? currentStep : 0);
    } else {
      setWizardData({
        id_orden: '',
        monto: 0,
        numero_factura: '',
        orden_compra_cliente: '',
        tiene_oc: false,
        fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        monto_pagado: 0,
        observaciones: '',
        // Archivos
        archivo_cotizacion: '',
        archivo_aprobacion: '',
        // Campos calculados (readonly)
        fecha_inicio_proyecto: '',
        fecha_fin_proyecto: '',
        reporte_aprobado: false,
        descripcion: ''
      });
      setWizardStep(0);
    }
    setShowWizard(true);
  };

  const handleWizardNext = async () => {
    setFormError('');

    if (!facturaSeleccionada) {
      // Creating new invoice
      if (wizardStep === 0) {
        if (!wizardData.id_orden || isNaN(parseInt(wizardData.id_orden))) {
          setFormError('Debe seleccionar una orden');
          return;
        }
        
        // Validar que se haya seleccionado una orden válida
        const ordenSeleccionadaData = ordenesFacturables.find(o => o.id === parseInt(wizardData.id_orden));
        if (!ordenSeleccionadaData) {
          setFormError('La orden seleccionada no es válida');
          return;
        }
        
        // Validar estado de la orden
        if (ordenSeleccionadaData.estado !== 'completada') {
          setFormError(`La orden debe estar en estado "Completada" para crear factura.\nEstado actual: ${ordenSeleccionadaData.estado}`);
          return;
        }
        
        // Validar estado del informe
        if (ordenSeleccionadaData.estado_informe !== 'aprobado') {
          setFormError(`⚠️ El informe técnico debe estar APROBADO para crear la factura.\n\nEstado actual del informe: ${ordenSeleccionadaData.estado_informe || 'Sin informe'}\n\nPara aprobar el informe:\n1. Ve a "Informes Técnicos"\n2. Busca el informe de esta orden\n3. Haz clic en "Ver detalle" y luego en "Aprobar"`);
          return;
        }
        
        if (!wizardData.monto || wizardData.monto <= 0) {
          setFormError('El monto debe ser mayor a 0');
          return;
        }

        console.log('Intentando crear factura con:', {
          id_orden: parseInt(wizardData.id_orden),
          monto: wizardData.monto,
          observaciones: wizardData.observaciones,
          numero_factura: wizardData.numero_factura || undefined,
          orden_compra_cliente: wizardData.orden_compra_cliente || undefined,
          tiene_oc: wizardData.tiene_oc
        });

        try {
          const response = await createFactura({
            id_orden: parseInt(wizardData.id_orden),
            monto: wizardData.monto,
            observaciones: wizardData.observaciones,
            numero_factura: wizardData.numero_factura || undefined,
            orden_compra_cliente: wizardData.orden_compra_cliente || undefined,
            tiene_oc: wizardData.tiene_oc,
            archivo_cotizacion: wizardData.archivo_cotizacion || undefined
          });
          console.log('Respuesta crearFactura:', response);
          loadData();
          setShowWizard(false);
        } catch (error: any) {
          console.error('Error creando factura:', error);
          console.error('Error response:', error.response);
          
          // Extraer mensaje de error del backend
          let mensajeError = 'Error al crear factura.';
          const backendMessage = error.response?.data?.message || error.response?.data?.error;
          
          if (backendMessage) {
            // Analizar el mensaje para dar feedback más claro
            if (backendMessage.includes('informe técnico debe estar APROBADO')) {
              mensajeError = '⚠️ ERROR: El informe técnico debe estar APROBADO antes de crear la factura.\n\nPara aprobar el informe:\n1. Ve a Informes Técnicos\n2. Busca el informe de esta orden\n3. Cambia su estado a "aprobado"';
            } else if (backendMessage.includes('ya existe una factura')) {
              mensajeError = 'ERROR: Ya existe una factura creada para esta orden.';
            } else if (backendMessage.includes('completada')) {
              mensajeError = 'ERROR: La orden debe estar en estado "Completada" para crear factura.';
            } else {
              mensajeError = 'ERROR: ' + backendMessage;
            }
          } else {
            mensajeError += '\n\nVerifica que:\n✓ La orden esté completada\n✓ El informe técnico esté aprobado';
          }
          
          setFormError(mensajeError);
        }
      }
      return;
    }

    // Validaciones por estado
    if (facturaSeleccionada.estado === 'no_iniciada') {
      if (!wizardData.fecha_vencimiento) {
        setFormError('Debe seleccionar una fecha de vencimiento');
        return;
      }
    }

    // Validación Cliente: requiere OC O archivo de aprobación
    if (facturaSeleccionada.estado === 'validacion_cliente') {
      if (!wizardData.tiene_oc && !wizardData.archivo_aprobacion) {
        setFormError('Para avanzar debe subir el comprobante de aprobación del cliente o indicar que tiene OC');
        return;
      }
    }

    if (facturaSeleccionada.estado === 'aprobada_cliente') {
      if (!wizardData.numero_factura.trim()) {
        setFormError('Debe ingresar el número de factura');
        return;
      }
    }

    if (facturaSeleccionada.estado === 'finalizada') {
      if (!wizardData.monto_pagado || wizardData.monto_pagado <= 0) {
        setFormError('El monto pagado debe ser mayor a 0');
        return;
      }
    }

    try {
      switch (facturaSeleccionada?.estado) {
        case 'no_iniciada':
          await planificarFacturacion(facturaSeleccionada.id, {
            fecha_vencimiento: wizardData.fecha_vencimiento,
            monto: wizardData.monto,
            observaciones: wizardData.observaciones
          });
          break;
        case 'validacion_cliente':
          await iniciarFacturacion(facturaSeleccionada.id, {
            orden_compra_cliente: wizardData.orden_compra_cliente,
            tiene_oc: wizardData.tiene_oc,
            observaciones: wizardData.observaciones,
            archivo_aprobacion: wizardData.archivo_aprobacion || undefined
          });
          break;
        case 'aprobada_cliente':
          await finalizarFacturacion(facturaSeleccionada.id, {
            numero_factura: wizardData.numero_factura || `FAC-${Date.now()}`,
            monto: wizardData.monto
          });
          break;
        case 'finalizada':
          await registrarPago(facturaSeleccionada.id, {
            monto_pagado: wizardData.monto_pagado,
            observaciones: wizardData.observaciones
          });
          break;
        default:
          // Si no hay cambio de estado, solo cerrar
          setShowWizard(false);
          return;
      }
      loadData();
      setShowWizard(false);
    } catch (error: any) {
      console.error('Error en wizard:', error);
      setFormError(error.response?.data?.message || error.response?.data?.error || 'Error al procesar');
    }
  };

  const getEstadoColor = (estado: EstadoFacturacion) => {
    switch (estado) {
      case 'no_iniciada': return 'bg-gray-100 text-gray-700';
      case 'validacion_cliente': return 'bg-orange-100 text-orange-700';
      case 'aprobada_cliente': return 'bg-cyan-100 text-cyan-700';
      case 'finalizada': return 'bg-purple-100 text-purple-700';
      case 'pagada': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'no_iniciada': return 'No Iniciada';
      case 'validacion_cliente': return 'Validación Cliente';
      case 'aprobada_cliente': return 'Aprobada Cliente';
      case 'finalizada': return 'Finalizada';
      case 'pagada': return 'Pagada';
      default: return estado;
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Gestión de Facturas</h1>
        <button
          onClick={() => startWizard()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Nueva Factura
        </button>
      </div>

      {/* Alertas de facturas próximas a vencer */}
      {(facturasProximasVencer || []).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-yellow-600" size={20} />
            <h2 className="text-sm font-semibold text-yellow-800">FACTURAS PRÓXIMAS A VENCER</h2>
          </div>
          <div className="space-y-2">
            {facturasProximasVencer.map(f => {
              const diasRestantes = Math.ceil((new Date(f.fecha_vencimiento!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={f.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{f.numero_factura || `Factura #${f.id}`}</p>
                    <p className="text-xs text-gray-500">{f.orden?.cliente?.nombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-yellow-600">${f.monto?.toFixed(2)}</p>
                    <p className="text-xs text-yellow-600">{diasRestantes} días restantes</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumen Cards - Mejorado */}
      {resumen && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-4">Resumen de Facturación</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {/* Creadas */}
            <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-gray-500">
              <p className="text-xs text-gray-500 mb-1">Creadas</p>
              <p className="text-xl font-bold">{resumen.no_iniciada || 0}</p>
              <p className="text-xs text-gray-400">
                ${(resumen.monto_no_iniciada || 0).toFixed(2)}
              </p>
            </div>
            
            {/* Validación Cliente */}
            <div className="bg-orange-50 rounded-lg p-3 border-l-4 border-orange-500">
              <p className="text-xs text-orange-600 mb-1">Validación Cliente</p>
              <p className="text-xl font-bold text-orange-600">{resumen.validacion_cliente || 0}</p>
              <p className="text-xs text-orange-400">
                ${(resumen.monto_validacion_cliente || 0).toFixed(2)}
              </p>
            </div>
            
            {/* Aprobadas Cliente */}
            <div className="bg-cyan-50 rounded-lg p-3 border-l-4 border-cyan-500">
              <p className="text-xs text-cyan-600 mb-1">Aprobadas</p>
              <p className="text-xl font-bold text-cyan-600">{resumen.aprobada_cliente || 0}</p>
              <p className="text-xs text-cyan-400">
                ${(resumen.monto_aprobada_cliente || 0).toFixed(2)}
              </p>
            </div>
            
            {/* Finalizadas */}
            <div className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-500">
              <p className="text-xs text-purple-600 mb-1">Finalizadas</p>
              <p className="text-xl font-bold text-purple-600">{resumen.finalizada || 0}</p>
              <p className="text-xs text-purple-400">
                ${(resumen.monto_finalizada || 0).toFixed(2)}
              </p>
            </div>
            
            {/* Pagadas */}
            <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
              <p className="text-xs text-green-600 mb-1">Pagadas</p>
              <p className="text-xl font-bold text-green-600">{resumen.pagada || 0}</p>
              <p className="text-xs text-green-400">
                ${(resumen.monto_pagado || 0).toFixed(2)}
              </p>
            </div>
          </div>
          
          {/* Totales */}
          <div className="mt-4 pt-4 border-t flex flex-wrap justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="text-gray-500" size={20} />
              <span className="text-sm text-gray-500">Total:</span>
              <span className="font-bold">{resumen.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="text-purple-500" size={20} />
              <span className="text-sm text-gray-500">Monto Total:</span>
              <span className="font-bold">${resumen.monto_total?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-500" size={20} />
              <span className="text-sm text-gray-500">Cobrado:</span>
              <span className="font-bold text-green-600">${resumen.monto_pagado?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={filtro.estado}
              onChange={(e) => setFiltro({ ...filtro, estado: e.target.value })}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">Todos los estados</option>
              <option value="no_iniciada">No Iniciada</option>
              <option value="validacion_cliente">Validación Cliente</option>
              <option value="aprobada_cliente">Aprobada Cliente</option>
              <option value="finalizada">Finalizada</option>
              <option value="pagada">Pagada</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Desde:</span>
            <input
              type="date"
              value={filtro.fecha_inicio}
              onChange={(e) => setFiltro({ ...filtro, fecha_inicio: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Hasta:</span>
            <input
              type="date"
              value={filtro.fecha_fin}
              onChange={(e) => setFiltro({ ...filtro, fecha_fin: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          
          {(filtro.fecha_inicio || filtro.fecha_fin) && (
            <button
              onClick={() => setFiltro({ estado: '', fecha_inicio: '', fecha_fin: '' })}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Limpiar fechas
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">N° Factura</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Orden</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Cliente</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Monto</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Vencimiento</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {facturas.map((factura) => (
              <tr key={factura.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{factura.numero_factura || '-'}</td>
                <td className="px-4 py-3 text-sm">{factura.orden?.numero_orden || '-'}</td>
                <td className="px-4 py-3 text-sm">{factura.orden?.cliente?.nombre || '-'}</td>
                <td className="px-4 py-3 text-sm">${(factura.monto || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${getEstadoColor(factura.estado as EstadoFacturacion)}`}>
                    {factura.estado.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {factura.fecha_vencimiento ? new Date(factura.fecha_vencimiento).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    {/* Botón historial */}
                    <button 
                      onClick={async () => {
                        try {
                          const historial = await getHistorialFactura(factura.id);
                          setHistorialFactura(historial.data as any);
                          setFacturaSeleccionada(factura);
                          setShowHistorial(true);
                        } catch (error) {
                          console.error('Error cargando historial:', error);
                        }
                      }} 
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 flex items-center gap-1"
                      title="Ver historial"
                    >
                      <History size={12} />
                    </button>
                    {factura.estado !== 'pagada' && (
                      <button 
                        onClick={() => startWizard(factura)} 
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                      >
                        <ArrowRight size={12} />
                        Avanzar
                      </button>
                    )}
                    {factura.estado === 'pagada' && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded flex items-center gap-1">
                        ✓ Completada
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Crear Factura */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Nueva Factura</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Orden *</label>
                <input
                  type="text"
                  list="ordenes-list"
                  value={busquedaOrden}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBusquedaOrden(val);
                    // Buscar coincidencia exacta
                    const found = ordenesFacturables.find(o => o.numero_orden === val);
                    if (found) handleOrdenChange(found.id.toString());
                  }}
                  placeholder="Buscar por número, cliente o local..."
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  required
                />
                <datalist id="ordenes-list">
                  {ordenesFiltradas.slice(0, 50).map((o) => (
                    <option key={o.id} value={o.numero_orden}>
                      {o.numero_orden} - {o.cliente?.nombre} - {o.local?.nombre}
                      {o.estado_informe === 'aprobado' ? ' ✓' : ' (sin informe)'}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Información de la orden seleccionada */}
              {ordenSeleccionada && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2">Información de la Orden</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Estado Informe:</span>
                      <span className={`ml-2 font-medium ${ordenSeleccionada.estado_informe === 'aprobado' ? 'text-green-600' : 'text-red-600'}`}>
                        {ordenSeleccionada.estado_informe === 'aprobado' ? 'APROBADO' : ordenSeleccionada.estado_informe?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Estado Orden:</span>
                      <span className="ml-2 font-medium">{ordenSeleccionada.estado}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Número Factura</label>
                  <input
                    type="text"
                    value={formData.numero_factura}
                    onChange={(e) => setFormData({ ...formData, numero_factura: e.target.value })}
                    placeholder="FAC-2026-00001"
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Monto</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tiene_oc"
                  checked={formData.tiene_oc}
                  onChange={(e) => setFormData({ ...formData, tiene_oc: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="tiene_oc" className="text-sm font-medium text-gray-700">
                  ¿Tiene Orden de Compra del cliente?
                </label>
              </div>

              {formData.tiene_oc && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Orden de Compra del Cliente</label>
                  <input
                    type="text"
                    value={formData.orden_compra_cliente}
                    onChange={(e) => setFormData({ ...formData, orden_compra_cliente: e.target.value })}
                    placeholder="OC-2026-XXXXX"
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  rows={2}
                />
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
                        const res = await subirArchivo(files[i]);
                        if (res.data.url) {
                          nuevosArchivos.push(res.data.url);
                        }
                      } catch (error) {
                        console.error('Error subiendo archivo:', error);
                      }
                    }
                    
                    if (nuevosArchivos.length > 0) {
                      const archivosActuales = formData.archivos_adjuntos 
                        ? JSON.parse(formData.archivos_adjuntos) 
                        : [];
                      const todosArchivos = [...archivosActuales, ...nuevosArchivos];
                      setFormData({ ...formData, archivos_adjuntos: JSON.stringify(todosArchivos) });
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
                {formData.archivos_adjuntos && (
                  <div className="mt-2 space-y-1">
                    {JSON.parse(formData.archivos_adjuntos).map((url: string, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          📎 Archivo {idx + 1}
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const archivos = JSON.parse(formData.archivos_adjuntos || '[]').filter((_: any, i: number) => i !== idx);
                            setFormData({ ...formData, archivos_adjuntos: JSON.stringify(archivos) });
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

              {formError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {formError}
                </div>
              )}

              <div className="flex gap-4 justify-end">
                <button type="button" onClick={() => { setShowModal(false); setFormError(''); setOrdenSeleccionada(null); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Crear Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pago */}
      {showPagoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {facturaSeleccionada?.estado === 'aprobada_cliente' ? 'Finalizar Factura' : 'Registrar Pago'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  value={pagoData.monto_pagado}
                  onChange={(e) => setPagoData({ ...pagoData, monto_pagado: parseFloat(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                <textarea
                  value={pagoData.observaciones}
                  onChange={(e) => setPagoData({ ...pagoData, observaciones: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  rows={2}
                />
              </div>
              <div className="flex gap-4 justify-end">
                <button onClick={() => setShowPagoModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                {facturaSeleccionada?.estado === 'aprobada_cliente' ? (
                  <button onClick={() => handleFinalizar(facturaSeleccionada.id)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    Finalizar
                  </button>
                ) : (
                  <button onClick={handlePagar} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Registrar Pago
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {facturaSeleccionada ? `Avanzar Factura: ${facturaSeleccionada.numero_factura || `#${facturaSeleccionada.id}`}` : 'Nueva Factura'}
              </h2>
              <button onClick={() => setShowWizard(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>

            {/* Wizard Steps Progress */}
            <div className="flex items-center justify-between mb-6 relative">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0"></div>
              {WORKFLOW_STEPS.map((step, idx) => {
                const isActive = idx <= wizardStep;
                const StepIcon = step.icon;
                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      <StepIcon size={16} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Wizard Content */}
            <div className="space-y-4">
              {!facturaSeleccionada && wizardStep === 0 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Orden *</label>
                    <input
                      type="text"
                      list="ordenes-wizard-list"
                      value={wizardData.id_orden}
                      onChange={(e) => {
                        const val = e.target.value;
                        const found = ordenesFacturables.find(o => o.numero_orden === val);
                        if (found) {
                          setWizardData({ ...wizardData, id_orden: found.id.toString() });
                          setOrdenSeleccionada(found as any);
                          setWizardData(prev => ({
                            ...prev,
                            id_orden: found.id.toString(),
                            reporte_aprobado: found.estado_informe === 'aprobado',
                            fecha_inicio_proyecto: (found as any).fecha_inicio_proyecto || '',
                            fecha_fin_proyecto: (found as any).fecha_fin_proyecto || '',
                            descripcion: (found as any).descripcion || ''
                          }));
                        } else {
                          setWizardData({ ...wizardData, id_orden: val });
                        }
                      }}
                      placeholder="Buscar por número, cliente o local..."
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                      required
                    />
                    <datalist id="ordenes-wizard-list">
                      {ordenesFiltradas.slice(0, 50).map((o) => (
                        <option key={o.id} value={o.numero_orden}>
                          {o.numero_orden} - {o.cliente?.nombre} - {o.local?.nombre}
                          {o.estado_informe === 'aprobado' ? ' ✓' : ' (sin informe)'}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  {/* Información de la orden */}
                  {wizardData.id_orden && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2">Estado del Reporte</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-500">Informe:</span>
                          <span className={`ml-2 font-medium ${wizardData.reporte_aprobado ? 'text-green-600' : 'text-red-600'}`}>
                            {wizardData.reporte_aprobado ? 'APROBADO' : 'PENDIENTE'}
                          </span>
                        </div>
                        {/* Opción de descargar informe si existe */}
                        {ordenSeleccionada?.informe && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={async () => {
                                if (ordenSeleccionada?.informe) {
                                  try {
                                    await generarInformeWord(ordenSeleccionada.informe as any);
                                  } catch (error) {
                                    console.error('Error descargando informe:', error);
                                    alert('Error al descargar el informe');
                                  }
                                }
                              }}
                              className="text-blue-600 text-xs hover:underline flex items-center gap-1"
                            >
                              <Download size={14} />
                              Descargar Informe Word
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Número de Factura</label>
                    <input
                      type="text"
                      value={wizardData.numero_factura}
                      onChange={(e) => setWizardData({ ...wizardData, numero_factura: e.target.value })}
                      placeholder="FAC-2026-00001"
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    />
                  </div>

                  {/* Subir cotización */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subir Cotización</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const api = await import('../services/api');
                          const result = await api.subirArchivo(file);
                          if (result.data?.url) {
                            setWizardData({ ...wizardData, archivo_cotizacion: result.data.url });
                          }
                        } catch (error) {
                          console.error('Error subiendo cotización:', error);
                          setFormError('Error al subir la cotización');
                        }
                      }}
                      className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                    />
                    {wizardData.archivo_cotizacion && (
                      <div className="mt-2 flex items-center justify-between bg-green-50 px-3 py-2 rounded">
                        <span className="text-sm text-green-700">✓ Cotización adjunta</span>
                        <a 
                          href={wizardData.archivo_cotizacion} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 text-sm hover:underline flex items-center gap-1"
                        >
                          <Download size={14} />
                          Descargar
                        </a>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monto *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={wizardData.monto}
                      onChange={(e) => setWizardData({ ...wizardData, monto: parseFloat(e.target.value) })}
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="tiene_oc_wizard"
                      checked={wizardData.tiene_oc}
                      onChange={(e) => setWizardData({ ...wizardData, tiene_oc: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="tiene_oc_wizard" className="text-sm font-medium text-gray-700">
                      ¿Tiene Orden de Compra del cliente?
                    </label>
                  </div>

                  {wizardData.tiene_oc && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Orden de Compra del Cliente</label>
                      <input
                        type="text"
                        value={wizardData.orden_compra_cliente}
                        onChange={(e) => setWizardData({ ...wizardData, orden_compra_cliente: e.target.value })}
                        placeholder="OC-2026-XXXXX"
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                      />
                    </div>
                  )}

                  {/* Campos calculados (readonly) */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Información del Proyecto</h4>
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-500">Fecha Inicio:</span>
                          <span className="ml-2 font-medium">
                            {wizardData.fecha_inicio_proyecto 
                              ? new Date(wizardData.fecha_inicio_proyecto).toLocaleDateString('es-ES')
                              : 'Por calcular'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Fecha Fin:</span>
                          <span className="ml-2 font-medium">
                            {wizardData.fecha_fin_proyecto 
                              ? new Date(wizardData.fecha_fin_proyecto).toLocaleDateString('es-ES')
                              : 'Por calcular'}
                          </span>
                        </div>
                      </div>
                      {ordenSeleccionada?.descripcion && (
                        <div className="mt-2">
                          <span className="text-gray-500">Descripción:</span>
                          <p className="mt-1 text-gray-700">{ordenSeleccionada.descripcion}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {facturaSeleccionada?.estado === 'no_iniciada' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={wizardData.fecha_vencimiento}
                    onChange={(e) => setWizardData({ ...wizardData, fecha_vencimiento: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
              )}

              {/* Estado: Validación Cliente - OC opcional + archivo de aprobación */}
              {facturaSeleccionada?.estado === 'validacion_cliente' && (
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-orange-800 font-medium">
                      ℹ️ Esta factura está en validación con el cliente. Para avanzar, puede incluir OC o证据 de aprobación del cliente.
                    </p>
                  </div>
                  
                  {/* Subir archivo de aprobación del cliente */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subir Comprobante de Aprobación del Cliente</label>
                    <p className="text-xs text-gray-500 mb-2">
                      Adjunte imagen o documento que acredite la aprobación del cliente (email, OC, firma, etc.)
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const api = await import('../services/api');
                          const result = await api.subirArchivo(file);
                          if (result.data?.url) {
                            setWizardData({ ...wizardData, archivo_aprobacion: result.data.url });
                          }
                        } catch (error) {
                          console.error('Error subiendo archivo de aprobación:', error);
                          setFormError('Error al subir el archivo');
                        }
                      }}
                      className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                    />
                    {wizardData.archivo_aprobacion && (
                      <div className="mt-2 flex items-center justify-between bg-green-50 px-3 py-2 rounded">
                        <span className="text-sm text-green-700">✓ Comprobante adjunto</span>
                        <a 
                          href={wizardData.archivo_aprobacion} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 text-sm hover:underline flex items-center gap-1"
                        >
                          <Download size={14} />
                          Ver
                        </a>
                      </div>
                    )}
                  </div>

                  {/* OC es opcional */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="tiene_oc_advance"
                      checked={wizardData.tiene_oc}
                      onChange={(e) => setWizardData({ ...wizardData, tiene_oc: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="tiene_oc_advance" className="text-sm font-medium text-gray-700">
                      ¿El cliente ha proporcionado Orden de Compra? (Opcional)
                    </label>
                  </div>

                  {wizardData.tiene_oc && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Número de Orden de Compra</label>
                      <input
                        type="text"
                        value={wizardData.orden_compra_cliente}
                        onChange={(e) => setWizardData({ ...wizardData, orden_compra_cliente: e.target.value })}
                        placeholder="OC-2026-XXXXX"
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                      />
                    </div>
                  )}

                  {(!wizardData.tiene_oc && !wizardData.archivo_aprobacion) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        ⚠️ Para avanzar, debe subir el comprobante de aprobación del cliente.
                      </p>
                    </div>
                  )}
                  
                  {(wizardData.archivo_aprobacion && !wizardData.tiene_oc) && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        ✓ Con el comprobante de aprobación puede avanzar sin OC.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {facturaSeleccionada?.estado === 'aprobada_cliente' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Número de Factura</label>
                  <input
                    type="text"
                    value={wizardData.numero_factura}
                    onChange={(e) => setWizardData({ ...wizardData, numero_factura: e.target.value })}
                    placeholder={`FAC-${Date.now()}`}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
              )}

              {facturaSeleccionada?.estado === 'finalizada' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Monto Pagado</label>
                  <input
                    type="number"
                    step="0.01"
                    value={wizardData.monto_pagado}
                    onChange={(e) => setWizardData({ ...wizardData, monto_pagado: parseFloat(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                <textarea
                  value={wizardData.observaciones}
                  onChange={(e) => setWizardData({ ...wizardData, observaciones: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  rows={2}
                />
              </div>
            </div>

            {formError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {formError}
              </div>
            )}

            <div className="flex gap-4 justify-end mt-6">
              <button onClick={() => { setShowWizard(false); setFormError(''); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleWizardNext} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                {facturaSeleccionada ? 'Avanzar' : 'Crear'}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial de Factura */}
      {showHistorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Historial de Cambios
              </h2>
              <button onClick={() => setShowHistorial(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            
            {facturaSeleccionada && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{facturaSeleccionada.numero_factura || `Factura #${facturaSeleccionada.id}`}</p>
                <p className="text-sm text-gray-500">Orden: {facturaSeleccionada.orden?.numero_orden || '-'}</p>
              </div>
            )}

            {historialFactura.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History size={48} className="mx-auto mb-2 opacity-50" />
                <p>No hay historial de cambios</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historialFactura.map((item, idx) => (
                  <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {item.estado_anterior || 'Creada'} → {item.estado_nuevo}
                      </span>
                    </div>
                    {item.observaciones && (
                      <p className="text-sm text-gray-600">{item.observaciones}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(item.createdAt).toLocaleString('es-ES')}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button onClick={() => setShowHistorial(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Facturas;
