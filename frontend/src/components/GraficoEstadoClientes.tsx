import React, { useMemo, useCallback } from 'react';
import { Card, Row, Col, Form, InputGroup } from 'react-bootstrap';
import ApexChart from 'react-apexcharts';

// Tipos
interface ClienteData {
  id: number;
  nombre: string;
  ruc: string;
  total: number;
  pendientes: number;
  asignadas: number;
  enProceso: number;
  completadas: number;
  noCumplidas: number;
  reprogramadas: number;
  facturadas: number;
}

interface GraficoEstadoClientesProps {
  clientes: ClienteData[];
  onClienteExpandido: (id: number | null) => void;
  clienteExpandidoActual: number | null;
}

const GraficoEstadoClientes: React.FC<GraficoEstadoClientesProps> = ({
  clientes,
  onClienteExpandido,
  clienteExpandidoActual
}) => {
  // Estado local para filtros
  const [filtroPeriodo, setFiltroPeriodo] = React.useState('Total');
  const [filtroOrden, setFiltroOrden] = React.useState('Mayor cantidad');

  // Memoizar clientes filtrados y ordenados para evitar recalculaciones innecesarias
  const clientesProcesados = useMemo(() => {
    // Filtrar por período (por ahora todos los datos ya que el endpoint no soporta filtrado por fecha)
    // En una implementación futura, esto se conectaría con los filtros del dashboard principal
    let clientesFiltrados = [...clientes];

    // Ordenar según el filtro seleccionado
    switch (filtroOrden) {
      case 'Mayor cantidad':
        clientesFiltrados.sort((a, b) => b.total - a.total);
        break;
      case 'Menor cantidad':
        clientesFiltrados.sort((a, b) => a.total - b.total);
        break;
      case 'Alfabético A-Z':
        clientesFiltrados.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      case 'Alfabético Z-A':
        clientesFiltrados.sort((a, b) => b.nombre.localeCompare(a.nombre));
        break;
      default:
        break;
    }

    return clientesFiltrados;
  }, [clientes, filtroOrden]); // filtroPeriodo removido ya que no afecta el filtrado actualmente

  // Función para generar una paleta de colores distintiva
  const generarPaletaColores = useCallback((cantidad: number): string[] => {
    const baseColors = [
      '#3B82F6', // Azul
      '#10B981', // Verde
      '#F59E0B', // Amarillo
      '#EF4444', // Rojo
      '#8B5CF6', // Violeta
      '#EC4899', // Rosa
      '#06B6D4', // Cian
      '#84CC16', // Lima
      '#F97316', // Naranja
      '#6366F1', // Índigo
    ];
    
    if (cantidad <= baseColors.length) {
      return baseColors.slice(0, cantidad);
    }
    
    // Generar colores adicionales mediante variaciones
    const colors = [...baseColors];
    const neededAdditional = cantidad - baseColors.length;
    
    for (let i = 0; i < neededAdditional; i++) {
      const baseIndex = i % baseColors.length;
      colors.push(baseColors[baseIndex]);
    }
    
    return colors.slice(0, cantidad);
  }, []);

  // Configuración de ApexCharts
  const chartOptions = useMemo(() => ({
    chart: {
      height: Math.max(300, clientes.length * 25), // Altura dinámica basada en número de clientes
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '80%',
        distributed: true,
        dataLabels: {
          position: 'end'
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toString(),
      offsetX: -10,
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
        colors: ['#fff']
      },
      background: {
        enabled: true,
        fillOpacity: 0.9,
        borderRadius: 2
      }
    },
    colors: generarPaletaColores(clientesProcesados.length),
    grid: {
      show: false,
      xaxis: {
        lines: {
          show: false
        }
      },
      yaxis: {
        lines: {
          show: false
        }
      }
    },
    xaxis: {
      categories: clientesProcesados.map(cliente => cliente.nombre),
      labels: {
        style: {
          fontSize: '14px',
          fontWeight: '500',
          colors: ['#374151']
        }
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      show: false,
      labels: {
        show: false
      }
    },
    tooltip: {
      enabled: true,
      shared: false,
      intersect: true,
      theme: 'dark' as const,
      style: {
        fontSize: '12px',
        fontFamily: 'inherit'
      },
      fillSeriesColor: false
    },
    legend: {
      show: false
    }
  }), [clientesProcesados, generarPaletaColores]); // Agregado generarPaletaColores como dependencia

  // Preparar datos para el gráfico
  const chartData = useMemo(() => {
    return clientesProcesados.map(cliente => cliente.total);
  }, [clientesProcesados]);

  // Función para manejar click en una barra del gráfico
  const handleBarClick = useCallback(({
    seriesIndex,
    dataPointIndex,
    w
  }: any) => {
    if (dataPointIndex !== undefined && dataPointIndex !== null) {
      const clienteId = clientesProcesados[dataPointIndex]?.id;
      if (clienteId !== undefined) {
        onClienteExpandido(clienteId);
      }
    }
  }, [clientesProcesados, onClienteExpandido]);

  // Función para generar el tooltip personalizado
  const getTooltipContent = useCallback(({ 
    seriesIndex,
    dataPointIndex,
    w 
  }: any) => {
    if (dataPointIndex === undefined || dataPointIndex === null) {
      return '<div></div>';
    }

    const cliente = clientesProcesados[dataPointIndex];
    if (!cliente) {
      return '<div></div>';
    }

    return `
      <div className="px-3 py-2">
        <div className="font-bold text-lg">${cliente.nombre}</div>
        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
          <div>Pendientes:</div> <div className="text-right font-medium">${cliente.pendientes}</div>
          <div>Asignadas:</div> <div className="text-right font-medium">${cliente.asignadas}</div>
          <div>En Proceso:</div> <div className="text-right font-medium">${cliente.enProceso}</div>
          <div>Completadas:</div> <div className="text-right font-medium">${cliente.completadas}</div>
          <div>No Cumplidas:</div> <div className="text-right font-medium">${cliente.noCumplidas}</div>
          <div>Facturadas:</div> <div className="text-right font-medium">${cliente.facturadas}</div>
          <div className="font-semibold border-t pt-1">Total:</div> 
          <div className="text-right font-semibold">${cliente.total}</div>
        </div>
      </div>
    `;
  }, [clientesProcesados]);

  return (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Header className="bg-white border-bottom py-3">
        <Row className="align-items-center">
          <Col md={8}>
            <h4 className="mb-0 text-dark">
              Gráfico de Estado de Trabajos por Cliente
            </h4>
            <p className="text-muted mb-0 small">
              Vista comparativa y ejecutiva de la carga de trabajo por cliente
            </p>
          </Col>
          <Col md={4} className="text-md-end">
            <InputGroup className="mb-3">
              <Form.Text>Período:</Form.Text>
              <Form.Select
                value={filtroPeriodo}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFiltroPeriodo(e.target.value)}
                className="border-start-0"
                size="sm"
              >
                <option value="Total">Total</option>
                <option value="Este año">Este año</option>
                <option value="Enero">Enero</option>
                <option value="Febrero">Febrero</option>
                <option value="Marzo">Marzo</option>
                <option value="Abril">Abril</option>
                <option value="Mayo">Mayo</option>
                <option value="Junio">Junio</option>
                <option value="Julio">Julio</option>
                <option value="Agosto">Agosto</option>
                <option value="Septiembre">Septiembre</option>
                <option value="Octubre">Octubre</option>
                <option value="Noviembre">Noviembre</option>
                <option value="Diciembre">Diciembre</option>
              </Form.Select>
            </InputGroup>
            
            <InputGroup>
              <Form.Text>Ordenar por:</Form.Text>
              <Form.Select
                value={filtroOrden}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFiltroOrden(e.target.value)}
                className="border-start-0"
                size="sm"
              >
                <option value="Mayor cantidad">Mayor cantidad de órdenes</option>
                <option value="Menor cantidad">Menor cantidad de órdenes</option>
                <option value="Alfabético A-Z">Alfabético A-Z</option>
                <option value="Alfabético Z-A">Alfabético Z-A</option>
              </Form.Select>
            </InputGroup>
          </Col>
        </Row>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="p-4">
          <div
            style={{ 
              position: 'relative', 
              height: Math.max(300, clientes.length * 25) 
            }}
          >
            <ApexChart
              options={chartOptions}
              series={[
                {
                  name: 'Órdenes de Trabajo',
                  data: chartData
                }
              ]}
              type="bar"
              height="100%"
              onClick={handleBarClick}
              tooltip={{
                enabled: true,
                custom: ({ 
                  seriesIndex,
                  dataPointIndex,
                  w 
                }: any) => ({
                  content: getTooltipContent({ 
                    seriesIndex,
                    dataPointIndex,
                    w 
                  })
                })
              }}
            />
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default React.memo(GraficoEstadoClientes);