import React, { useEffect, useState, useRef } from 'react';
import { Plus, CheckCircle, XCircle, Calendar, MoreVertical, FileText, Download } from 'lucide-react';
import { getAsignaciones, createAsignacion, getOrdenes, getTecnicos, reprogramarAsignacion, noCumplirAsignacion, updateAsignacion, completarConInforme, getInformesPorOrden } from '../services/api';
import { generarInformeWord } from '../utils/generarWord';
import { Asignacion, Orden, Tecnico } from '../types';

const Asignaciones: React.FC = () => {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReprogramarModal, setShowReprogramarModal] = useState(false);
  const [showInformeModal, setShowInformeModal] = useState(false);
  const [showDetalleInformeModal, setShowDetalleInformeModal] = useState(false);
  const [informeSeleccionado, setInformeSeleccionado] = useState<any>(null);
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState<Asignacion | null>(null);
  const [menuAbierto, setMenuAbierto] = useState<number | null>(null);
  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroBuscar, setFiltroBuscar] = useState('');
  const [reprogramarData, setReprogramarData] = useState({
    fecha_asignacion: '',
    hora_inicio_programada: '',
    hora_fin_programada: '',
    motivo_reprogramacion: ''
  });
  // Tipo para bloque de foto-descripcion
  interface BloqueFotoDescripcion {
    id: number;
    foto: string;
    descripcion: string;
  }

  const [informeData, setInformeData] = useState({
    descripcion_trabajo: '',
    materiales_usados: '',
    estado_equipo: '',
    recomendaciones: '',
    proximo_mantenimiento: '',
    firma_cliente: '',
    nombre_cliente: '',
    cedula_cliente: '',
    bloques: [] as BloqueFotoDescripcion[]
  });
  const firmaCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    id_orden: '',
    id_tecnicos: [] as number[],
    fecha_asignacion: new Date().toISOString().split('T')[0],
    hora_inicio_programada: '08:00',
    hora_fin_programada: '17:00'
  });

  useEffect(() => {
    loadData();
  }, []);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // No cerrar si el click fue dentro del menú
      const target = e.target as HTMLElement;
      if (target.closest('.menu-dropdown')) return;
      setMenuAbierto(null);
    };
    if (menuAbierto !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [menuAbierto]);

  const loadData = async () => {
    try {
      const [asignacionesRes, ordenesRes, tecnicosRes] = await Promise.all([
        getAsignaciones(),
        getOrdenes(),
        getTecnicos()
      ]);
      setAsignaciones(asignacionesRes.data as any);
      setOrdenes(ordenesRes.data as any);
      setTecnicos(tecnicosRes.data as any);
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error al cargar datos';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Función para calcular horas entre dos horarios
  const calcularHoras = (horaInicio?: string, horaFin?: string) => {
    if (!horaInicio || !horaFin) return 0;
    const [h1, m1] = horaInicio.split(':').map(Number);
    const [h2, m2] = horaFin.split(':').map(Number);
    return (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
  };

  // Calcular horas restantes por orden
  const horasRestantesPorOrden = React.useMemo(() => {
    const resultado: Record<number, number> = {};
    
    // Obtener todas las órdenes únicas
    const ordenesUnicas = Array.from(new Set(asignaciones.map(a => a.id_orden)));
    
    ordenesUnicas.forEach(idOrden => {
      const orden = asignaciones.find(a => a.id_orden === idOrden)?.orden;
      if (!orden) return;
      
      const limiteHoras = (orden.cantidad_tecnicos || 0) * (orden.horas_estimadas || 0);
      
      // Calcular horas ya asignadas para esta orden
      const asignacionesOrden = asignaciones.filter(a => a.id_orden === idOrden);
      let horasAsignadas = 0;
      asignacionesOrden.forEach(asig => {
        horasAsignadas += calcularHoras(asig.hora_inicio_programada, asig.hora_fin_programada);
      });
      
      resultado[idOrden] = Math.max(0, limiteHoras - horasAsignadas);
    });
    
    return resultado;
  }, [asignaciones]);

  // Filtrar asignaciones
  const asignacionesFiltradas = React.useMemo(() => {
    return asignaciones.filter(a => {
      // Filtro estado
      if (filtroEstado && a.estado !== filtroEstado) return false;
      // Filtro técnico
      if (filtroTecnico && a.id_tecnico?.toString() !== filtroTecnico) return false;
      // Filtro fecha desde - convertir a Date para comparar correctamente
      if (filtroFechaDesde) {
        const fechaAsignacion = new Date(a.fecha_asignacion).toISOString().split('T')[0];
        if ( fechaAsignacion < filtroFechaDesde) return false;
      }
      // Filtro fecha hasta
      if (filtroFechaHasta) {
        const fechaAsignacion = new Date(a.fecha_asignacion).toISOString().split('T')[0];
        if ( fechaAsignacion > filtroFechaHasta) return false;
      }
      // Filtro buscar (orden o técnico)
      if (filtroBuscar) {
        const buscar = filtroBuscar.toLowerCase();
        const matchOrden = a.orden?.numero_orden?.toString().toLowerCase().includes(buscar);
        const matchTecnico = a.tecnico?.nombre?.toLowerCase().includes(buscar);
        const matchLocal = a.orden?.local?.nombre?.toLowerCase().includes(buscar);
        if (!matchOrden && !matchTecnico && !matchLocal) return false;
      }
      return true;
    });
  }, [asignaciones, filtroEstado, filtroTecnico, filtroFechaDesde, filtroFechaHasta, filtroBuscar]);

  // Agrupar asignaciones por orden + fecha
  const asignacionesAgrupadas = React.useMemo(() => {
    const grouped = new Map();
    asignacionesFiltradas.forEach(a => {
      const key = `${a.id_orden}_${a.fecha_asignacion}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          ...a,
          tecnicos: asignacionesFiltradas
            .filter(asig => asig.id_orden === a.id_orden && asig.fecha_asignacion === a.fecha_asignacion)
            .map(asig => asig.tecnico?.nombre)
            .filter(n => n)
            .join(', ')
        });
      }
    });
    return Array.from(grouped.values());
  }, [asignacionesFiltradas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validar orden
    if (!formData.id_orden) {
      setFormError('Debe seleccionar una orden');
      return;
    }
    // Validar técnicos
    if (!formData.id_tecnicos || formData.id_tecnicos.length === 0) {
      setFormError('Debe seleccionar al menos un técnico');
      return;
    }
    // Validar fecha
    if (!formData.fecha_asignacion) {
      setFormError('Debe seleccionar una fecha');
      return;
    }

    try {
      // Crear una asignación por cada técnico seleccionado
      for (const id_tecnico of formData.id_tecnicos) {
        await createAsignacion({
          id_orden: parseInt(formData.id_orden),
          id_tecnico,
          fecha_asignacion: formData.fecha_asignacion,
          hora_inicio_programada: formData.hora_inicio_programada,
          hora_fin_programada: formData.hora_fin_programada
        });
      }
      setShowModal(false);
      setFormData({
        id_orden: '',
        id_tecnicos: [],
        fecha_asignacion: new Date().toISOString().split('T')[0],
        hora_inicio_programada: '08:00',
        hora_fin_programada: '17:00'
      });
      loadData();
    } catch (error: any) {
      console.error('Error creando asignación:', error);
      setFormError(error.response?.data?.error || 'Error al crear asignación');
    }
  };

  const handleCompletar = async (id: number) => {
    // Buscar la asignación seleccionada
    const asignacion = asignaciones.find(a => a.id === id);
    if (asignacion) {
      setAsignacionSeleccionada(asignacion);
      setInformeData({
        descripcion_trabajo: '',
        materiales_usados: '',
        estado_equipo: '',
        recomendaciones: '',
        proximo_mantenimiento: '',
        firma_cliente: '',
        nombre_cliente: '',
        cedula_cliente: '',
        bloques: []
      });
      setShowInformeModal(true);
      setMenuAbierto(null);
    }
  };

  // Obtener técnicos de la misma orden (ya agrupado)
  const getTecnicosDeOrden = (a: any) => {
    return a.tecnicos || 'Sin asignar';
  };

  const handleSubmitInforme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asignacionSeleccionada) return;
    
    // Obtener firma del canvas
    let firmaBase64 = informeData.firma_cliente;
    if (firmaCanvasRef.current) {
      firmaBase64 = firmaCanvasRef.current.toDataURL('image/png');
    }
    
    try {
      // Obtener todas las asignaciones de esta orden que estén pendientes o en proceso
      const asignacionesMismaOrden = asignaciones.filter(
        a => a.id_orden === asignacionSeleccionada.id_orden && 
        (a.estado === 'pendiente' || a.estado === 'en_proceso')
      );
      
      // Completar cada asignación de la orden
      for (const asignacion of asignacionesMismaOrden) {
        await completarConInforme({
          id_asignacion: asignacion.id,
          id_orden: asignacion.id_orden,
          id_tecnico: asignacion.id_tecnico,
          descripcion_trabajo: informeData.descripcion_trabajo,
          materiales_usados: informeData.materiales_usados,
          estado_equipo: informeData.estado_equipo,
          recomendaciones: informeData.recomendaciones,
          proximo_mantenimiento: informeData.proximo_mantenimiento || undefined,
          firma_cliente: firmaBase64,
          nombre_cliente: informeData.nombre_cliente || undefined,
          cedula_cliente: informeData.cedula_cliente || undefined,
          // Enviar bloques como JSON
          fotos: informeData.bloques.length > 0 ? JSON.stringify(informeData.bloques) : undefined
        });
      }
      
      setShowInformeModal(false);
      setAsignacionSeleccionada(null);
      loadData();
    } catch (error: any) {
      console.error('Error completando con informe:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error al completar la asignación con informe';
      alert(errorMsg);
    }
  };

  // Funciones para firma digital (mouse + touch para celular)
  const obtenerCoordenadas = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return { x: 0, y: 0 };
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const iniciarFirma = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      setIsDrawing(true);
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2;
      const coords = obtenerCoordenadas(e, canvas);
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const dibujarFirma = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const coords = obtenerCoordenadas(e, canvas);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const terminarFirma = () => {
    setIsDrawing(false);
  };

  const limpiarFirma = () => {
    const canvas = firmaCanvasRef.current;
    if (canvas) {
      // Resetear el canvas completamente - obtener nuevo contexto
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Reinicializar configuración del contexto
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
      }
      setIsDrawing(false);
    }
  };

  // Función para comprimir imagen manteniendo calidad
  const comprimirImagen = (base64: string, maxAncho: number = 800, calidad: number = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let ancho = img.width;
        let alto = img.height;
        
        // Redimensionar si es necesario
        if (ancho > maxAncho) {
          alto = (alto * maxAncho) / ancho;
          ancho = maxAncho;
        }
        
        canvas.width = ancho;
        canvas.height = alto;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, ancho, alto);
        
        // Comprimir como JPEG con calidad
        resolve(canvas.toDataURL('image/jpeg', calidad));
      };
      img.src = base64;
    });
  };

  // Función para manejar carga de imágenes - crea nuevos bloques con compresión
  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = async () => {
        // Comprimir imagen antes de guardar
        const imagenComprimida = await comprimirImagen(reader.result as string);
        
        const nuevoBloque: BloqueFotoDescripcion = {
          id: Date.now() + Math.random(),
          foto: imagenComprimida,
          descripcion: ''
        };
        setInformeData({ 
          ...informeData, 
          bloques: [...informeData.bloques, nuevoBloque] 
        });
      };
      reader.readAsDataURL(file);
    }
    
    // Limpiar input para permitir seleccionar mismos archivos
    e.target.value = '';
  };

  // Actualizar descripción de un bloque específico
  const actualizarDescripcionBloque = (id: number, descripcion: string) => {
    const bloquesActualizados = informeData.bloques.map(bloque => 
      bloque.id === id ? { ...bloque, descripcion } : bloque
    );
    setInformeData({ ...informeData, bloques: bloquesActualizados });
  };

  // Eliminar un bloque
  const eliminarBloque = (id: number) => {
    const bloquesFiltrados = informeData.bloques.filter(bloque => bloque.id !== id);
    setInformeData({ ...informeData, bloques: bloquesFiltrados });
  };

  // Agregar nuevo bloque vacío
  const agregarBloque = () => {
    const nuevoBloque: BloqueFotoDescripcion = {
      id: Date.now() + Math.random(),
      foto: '',
      descripcion: ''
    };
    setInformeData({ 
      ...informeData, 
      bloques: [...informeData.bloques, nuevoBloque] 
    });
  };

  const handleNoCumplir = async (id: number) => {
    const motivo = window.prompt('Ingrese el motivo de no cumplimiento:');
    if (motivo) {
      try {
        await noCumplirAsignacion(id, motivo);
        loadData();
        setMenuAbierto(null);
      } catch (error: any) {
        console.error('Error marcando como no cumplida:', error);
        const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error al marcar como no cumplida';
        alert(errorMsg);
      }
    }
  };

  const handleReprogramar = (asignacion: Asignacion) => {
    setAsignacionSeleccionada(asignacion);
    setReprogramarData({
      fecha_asignacion: asignacion.fecha_asignacion || '',
      hora_inicio_programada: asignacion.hora_inicio_programada || '08:00',
      hora_fin_programada: asignacion.hora_fin_programada || '17:00',
      motivo_reprogramacion: ''
    });
    setShowReprogramarModal(true);
    setMenuAbierto(null);
  };

  // Ver informe de asignación completada
  const handleVerInforme = async (asignacion: Asignacion) => {
    try {
      const informes = await getInformesPorOrden(asignacion.id_orden);
      if (informes.data && informes.data.length > 0) {
        // Tomar el primer informe de esa orden
        setInformeSeleccionado(informes.data[0]);
        setShowDetalleInformeModal(true);
      } else {
        alert('No se encontró informe técnico para esta asignación');
      }
    } catch (error: any) {
      console.error('Error obteniendo informe:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error al obtener el informe';
      alert(errorMsg);
    }
    setMenuAbierto(null);
  };

  const handleSubmitReprogramar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asignacionSeleccionada) return;
    try {
      await reprogramarAsignacion(asignacionSeleccionada.id, reprogramarData);
      setShowReprogramarModal(false);
      setAsignacionSeleccionada(null);
      loadData();
    } catch (error: any) {
      console.error('Error reprogramando asignación:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error al reprogramar';
      alert(errorMsg);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-700';
      case 'asignada': return 'bg-purple-100 text-purple-700';
      case 'completada': return 'bg-green-100 text-green-700';
      case 'no_cumplida': return 'bg-red-100 text-red-700';
      case 'reprogramado': return 'bg-blue-100 text-blue-700';
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Asignaciones</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Nueva Asignación
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
            <input
              type="text"
              placeholder="Orden o técnico..."
              value={filtroBuscar}
              onChange={(e) => setFiltroBuscar(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="asignada">Asignada</option>
              <option value="completada">Completada</option>
              <option value="reprogramado">Reprogramado</option>
              <option value="no_cumplida">No Cumplida</option>
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Técnico</label>
            <select
              value={filtroTecnico}
              onChange={(e) => setFiltroTecnico(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => { setFiltroEstado(''); setFiltroTecnico(''); setFiltroFechaDesde(''); setFiltroFechaHasta(''); setFiltroBuscar(''); }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Orden</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Local</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Técnico</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Fecha</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Horas Rest.</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {asignacionesAgrupadas.map((a, idx) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">#{a.id}</td>
                <td className="px-4 py-3 text-sm">{a.orden?.numero_orden || 'N/A'}</td>
                <td className="px-4 py-3 text-sm">{a.orden?.local?.nombre || 'N/A'}</td>
                <td className="px-4 py-3 text-sm">{getTecnicosDeOrden(a) || 'Sin asignar'}</td>
                <td className="px-4 py-3 text-sm">
                  {a.fecha_asignacion ? new Date(a.fecha_asignacion).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {(() => {
                    const horasRestantes = horasRestantesPorOrden[a.id_orden] ?? 0;
                    const limite = (a.orden?.cantidad_tecnicos || 0) * (a.orden?.horas_estimadas || 0);
                    const color = horasRestantes === 0 ? 'text-red-600 font-bold' : horasRestantes < limite * 0.25 ? 'text-orange-600' : 'text-green-600';
                    return <span className={color}>{horasRestantes.toFixed(1)}h</span>;
                  })()}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${getEstadoColor(a.estado)}`}>
                    {a.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm relative overflow-visible">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuAbierto(menuAbierto === a.id ? null : a.id);
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {menuAbierto === a.id && (
                      <div className={`menu-dropdown absolute right-0 w-48 bg-white border rounded-lg shadow-lg z-50 ${idx >= (asignacionesAgrupadas || []).length - 3 ? 'bottom-full mb-1' : 'mt-1'}`}>
                        {a.estado === 'pendiente' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompletar(a.id);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 flex items-center gap-2"
                            >
                              <CheckCircle size={16} className="text-green-600" />
                              Completar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReprogramar(a);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
                            >
                              <Calendar size={16} className="text-blue-600" />
                              Reprogramar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNoCumplir(a.id);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2"
                            >
                              <XCircle size={16} className="text-red-600" />
                              No Cumplido
                            </button>
                          </>
                        )}
                        {a.estado === 'completada' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerInforme(a);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-2"
                            >
                              <FileText size={16} className="text-purple-600" />
                              Ver Informe
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReprogramar(a);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
                            >
                              <Calendar size={16} className="text-blue-600" />
                              Reprogramar
                            </button>
                          </>
                        )}
                        {(a.estado === 'no_cumplida' || a.estado === 'reprogramado') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateAsignacion(a.id, { estado: 'pendiente' });
                              loadData();
                              setMenuAbierto(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-50 flex items-center gap-2"
                          >
                            <Calendar size={16} className="text-yellow-600" />
                            Reactivar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Reprogramar */}
      {showReprogramarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Reprogramar Asignación</h2>
            <form onSubmit={handleSubmitReprogramar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nueva Fecha</label>
                <input
                  type="date"
                  value={reprogramarData.fecha_asignacion}
                  onChange={(e) => setReprogramarData({ ...reprogramarData, fecha_asignacion: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hora Inicio</label>
                  <input
                    type="time"
                    value={reprogramarData.hora_inicio_programada}
                    onChange={(e) => setReprogramarData({ ...reprogramarData, hora_inicio_programada: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hora Fin</label>
                  <input
                    type="time"
                    value={reprogramarData.hora_fin_programada}
                    onChange={(e) => setReprogramarData({ ...reprogramarData, hora_fin_programada: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Motivo de Reprogramación</label>
                <textarea
                  value={reprogramarData.motivo_reprogramacion}
                  onChange={(e) => setReprogramarData({ ...reprogramarData, motivo_reprogramacion: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  rows={2}
                  placeholder="Ingrese el motivo..."
                />
              </div>
              <div className="flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowReprogramarModal(false); setAsignacionSeleccionada(null); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Reprogramar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Nueva Asignación</h2>
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {formError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Orden</label>
                <select
                  value={formData.id_orden}
                  onChange={(e) => setFormData({ ...formData, id_orden: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  required
                >
                  <option value="">Seleccionar orden</option>
                  {ordenes.map((o) => (
                    <option key={o.id} value={o.id}>{o.numero_orden} - {o.cliente?.nombre} ({o.local?.nombre || 'Sin local'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Técnicos</label>
                <div className="mt-1 border rounded-lg p-2 max-h-40 overflow-y-auto">
                  {tecnicos.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.id_tecnicos.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, id_tecnicos: [...formData.id_tecnicos, t.id] });
                          } else {
                            setFormData({ ...formData, id_tecnicos: formData.id_tecnicos.filter(id => id !== t.id) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{t.nombre}</span>
                    </label>
                  ))}
                </div>
                {formData.id_tecnicos.length === 0 && (
                  <p className="text-red-500 text-xs mt-1">Seleccione al menos un técnico</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha de Asignación</label>
                <input
                  type="date"
                  value={formData.fecha_asignacion}
                  onChange={(e) => setFormData({ ...formData, fecha_asignacion: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hora Inicio</label>
                  <input
                    type="time"
                    value={formData.hora_inicio_programada}
                    onChange={(e) => setFormData({ ...formData, hora_inicio_programada: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hora Fin</label>
                  <input
                    type="time"
                    value={formData.hora_fin_programada}
                    onChange={(e) => setFormData({ ...formData, hora_fin_programada: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
              </div>
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
                  Crear Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Informe Técnico */}
      {showInformeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Completar Asignación con Informe Técnico</h2>
            
            {/* Información de la Orden */}
            {asignacionSeleccionada && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Información de la Orden</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Orden:</span>
                    <span className="ml-2 font-medium">{asignacionSeleccionada.orden?.numero_orden}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Cliente:</span>
                    <span className="ml-2 font-medium">{asignacionSeleccionada.orden?.cliente?.nombre}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Local:</span>
                    <span className="ml-2 font-medium">{asignacionSeleccionada.orden?.local?.nombre || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tipo:</span>
                    <span className="ml-2 font-medium capitalize">{asignacionSeleccionada.orden?.tipo_trabajo?.replace('_', ' ')}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Descripción:</span>
                    <p className="mt-1 text-gray-700">{asignacionSeleccionada.orden?.descripcion || 'Sin descripción'}</p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmitInforme} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Descripción del Trabajo *</label>
                <textarea
                  value={informeData.descripcion_trabajo}
                  onChange={(e) => setInformeData({ ...informeData, descripcion_trabajo: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  rows={3}
                  placeholder="Describa el trabajo realizado..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Materiales Usados</label>
                <textarea
                  value={informeData.materiales_usados}
                  onChange={(e) => setInformeData({ ...informeData, materiales_usados: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  rows={2}
                  placeholder="Liste los materiales utilizados..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado del Equipo</label>
                  <select
                    value={informeData.estado_equipo}
                    onChange={(e) => setInformeData({ ...informeData, estado_equipo: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  >
                    <option value="">Seleccionar estado</option>
                    <option value="nuevo">Nuevo</option>
                    <option value="usado">Usado</option>
                    <option value="reparado">Reparado</option>
                    <option value="fuera_servicio">Fuera de Servicio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Próximo Mantenimiento</label>
                  <input
                    type="date"
                    value={informeData.proximo_mantenimiento}
                    onChange={(e) => setInformeData({ ...informeData, proximo_mantenimiento: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Recomendaciones</label>
                <textarea
                  value={informeData.recomendaciones}
                  onChange={(e) => setInformeData({ ...informeData, recomendaciones: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  rows={2}
                  placeholder="Ingrese recomendaciones..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Firma del Cliente</label>
                <div className="mt-1 border rounded-lg p-2 bg-gray-50">
                  <canvas
                    ref={firmaCanvasRef}
                    width={400}
                    height={100}
                    onMouseDown={iniciarFirma}
                    onMouseMove={dibujarFirma}
                    onMouseUp={terminarFirma}
                    onMouseLeave={terminarFirma}
                    onTouchStart={iniciarFirma}
                    onTouchMove={dibujarFirma}
                    onTouchEnd={terminarFirma}
                    className="border border-gray-300 rounded bg-white cursor-crosshair touch-none"
                  />
                  <button
                    type="button"
                    onClick={limpiarFirma}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Limpiar Firma
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">El cliente puede firmar con el mouse o touch</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre del Cliente</label>
                  <input
                    type="text"
                    value={informeData.nombre_cliente}
                    onChange={(e) => setInformeData({ ...informeData, nombre_cliente: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    placeholder="Ingrese nombre del cliente"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cédula del Cliente</label>
                  <input
                    type="text"
                    value={informeData.cedula_cliente}
                    onChange={(e) => setInformeData({ ...informeData, cedula_cliente: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    placeholder="Ingrese cédula"
                  />
                </div>
              </div>
              
              {/* Bloques de Foto-Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Fotos con Descripción</label>
                <p className="text-xs text-gray-500 mb-2">Agregue una foto y describa lo que se observa en cada imagen</p>
                
                {/* Lista de bloques existentes */}
                <div className="space-y-4 mb-4">
                  {informeData.bloques.map((bloque, index) => (
                    <div key={bloque.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Foto {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => eliminarBloque(bloque.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Preview de foto */}
                        <div className="flex flex-col items-center">
                          {bloque.foto ? (
                            <img 
                              src={bloque.foto} 
                              alt={`Foto ${index + 1}`} 
                              className="w-full h-32 object-cover rounded border"
                            />
                          ) : (
                            <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-sm">
                              Sin foto
                            </div>
                          )}
                        </div>
                        {/* Descripción de la foto */}
                        <div>
                          <textarea
                            value={bloque.descripcion}
                            onChange={(e) => actualizarDescripcionBloque(bloque.id, e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                            rows={4}
                            placeholder="Descripción de lo que se observa en esta foto..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botón para agregar más bloques */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFotoUpload}
                    className="hidden"
                    id="fotos-upload"
                  />
                  <label htmlFor="fotos-upload" className="cursor-pointer">
                    <div className="text-gray-500">
                      <p className="text-sm">Click para agregar una foto</p>
                      <p className="text-xs text-gray-400">PNG, JPG, JPEG</p>
                    </div>
                  </label>
                </div>
                
                {/* Botón agregar bloque vacío */}
                {informeData.bloques.length > 0 && (
                  <button
                    type="button"
                    onClick={agregarBloque}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    + Agregar más bloques
                  </button>
                )}
              </div>
              <div className="flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowInformeModal(false); setAsignacionSeleccionada(null); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Completar con Informe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Detalle Informe */}
      {showDetalleInformeModal && informeSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Detalle del Informe Técnico</h2>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Orden:</span>
                  <span className="ml-2 font-medium">{informeSeleccionado.orden?.numero_orden}</span>
                </div>
                <div>
                  <span className="text-gray-500">Técnico:</span>
                  <span className="ml-2 font-medium">{informeSeleccionado.tecnico?.nombre}</span>
                </div>
                <div>
                  <span className="text-gray-500">Fecha:</span>
                  <span className="ml-2 font-medium">
                    {informeSeleccionado.fecha_informe ? new Date(informeSeleccionado.fecha_informe).toLocaleDateString() : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Estado:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    informeSeleccionado.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
                    informeSeleccionado.estado === 'rechazado' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {informeSeleccionado.estado}
                  </span>
                </div>
              </div>
            </div>

            {informeSeleccionado.descripcion_trabajo && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Descripción del Trabajo</h3>
                <p className="text-gray-600 bg-gray-50 p-3 rounded">{informeSeleccionado.descripcion_trabajo}</p>
              </div>
            )}

            {informeSeleccionado.materiales_usados && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Materiales Usados</h3>
                <p className="text-gray-600 bg-gray-50 p-3 rounded">{informeSeleccionado.materiales_usados}</p>
              </div>
            )}

            {informeSeleccionado.fotos && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Fotos</h3>
                {(() => {
                  try {
                    const bloques = JSON.parse(informeSeleccionado.fotos);
                    return bloques.map((bloque: any, i: number) => (
                      <div key={i} className="border rounded-lg p-3 mb-2">
                        <img src={bloque.foto} alt={`Foto ${i+1}`} className="w-full h-40 object-cover rounded mb-2" />
                        <p className="text-sm text-gray-600">{bloque.descripcion}</p>
                      </div>
                    ));
                  } catch { return null; }
                })()}
              </div>
            )}

            {informeSeleccionado.firma_cliente && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Firma del Cliente</h3>
                <img src={informeSeleccionado.firma_cliente} alt="Firma" className="h-24 border rounded bg-white" />
              </div>
            )}

            <div className="flex gap-4 justify-end">
              <button
                onClick={() => generarInformeWord(informeSeleccionado)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download size={18} />
                Descargar Word
              </button>
              <button
                onClick={() => { setShowDetalleInformeModal(false); setInformeSeleccionado(null); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Asignaciones;