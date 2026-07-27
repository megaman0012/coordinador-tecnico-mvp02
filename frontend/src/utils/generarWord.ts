import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, ImageRun, Header, PageOrientation } from 'docx';
import { saveAs } from 'file-saver';
import { InformeTecnico } from '../types';

// ==================== CONSTANTES ====================
const MAX_WIDTH = 600;
const MAX_HEIGHT = 500;

// ==================== MARCA DE AGUA ====================
// Cargar imagen de marca de agua desde archivo público
const getWatermarkImage = async (): Promise<Uint8Array | null> => {
  try {
    const response = await fetch('/watermark.png');
    if (!response.ok) {
      console.error('No se pudo cargar la marca de agua');
      return null;
    }
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (e) {
    console.error('Error cargando marca de agua:', e);
    return null;
  }
};

// ==================== ENCABEZADO ====================
// Cargar imagen de encabezado desde archivo público
const getEncabezadoImage = async (): Promise<Uint8Array | null> => {
  try {
    const response = await fetch('/encabezado.png');
    if (!response.ok) {
      console.error('No se pudo cargar el encabezado');
      return null;
    }
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (e) {
    console.error('Error cargando encabezado:', e);
    return null;
  }
};

// ==================== FUNCIÓN DE DIMENSIONES ====================
interface Dimensiones {
  width: number;
  height: number;
}

/**
 * Calcula las dimensiones óptimas para una imagen manteniendo su proporción original.
 * 
 * @param originalWidth - Ancho original de la imagen
 * @param originalHeight - Alto original de la imagen
 * @returns Objeto con width y height calculados
 */
const calcularDimensionesImagen = (originalWidth: number, originalHeight: number): Dimensiones => {
  // Si la imagen es más pequeña que los límites, mantener tamaño original
  if (originalWidth <= MAX_WIDTH && originalHeight <= MAX_HEIGHT) {
    return { width: originalWidth, height: originalHeight };
  }

  // Calcular proporción
  const proporcion = originalWidth / originalHeight;

  // Determinar orientación y calcular dimensiones
  if (originalWidth > originalHeight) {
    // Imagen horizontal: ajustar al ancho máximo
    const nuevoAncho = MAX_WIDTH;
    const nuevaAltura = Math.round(MAX_WIDTH / proporcion);
    return { width: nuevoAncho, height: nuevaAltura };
  } else {
    // Imagen vertical: ajustar a la altura máxima
    const nuevoAncho = Math.round(MAX_HEIGHT * proporcion);
    const nuevaAltura = MAX_HEIGHT;
    return { width: nuevoAncho, height: nuevaAltura };
  }
};

/**
 * Extrae dimensiones de una imagen desde base64
 * @param base64String - String base64 de la imagen
 * @returns Promise con dimensiones o dimensiones por defecto
 */
const obtenerDimensionesDesdeBase64 = (base64String: string): Promise<Dimensiones> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      // Dimensiones por defecto si falla la carga
      resolve({ width: MAX_WIDTH, height: MAX_HEIGHT });
    };
    // Convertir base64 a URL data para cargar en Image
    img.src = base64String.startsWith('data:') ? base64String : `data:image/png;base64,${base64String}`;
  });
};

// ==================== GENERADOR DE WORD ====================
export const generarInformeWord = async (informe: InformeTecnico): Promise<void> => {
  
  // Parsear bloques de fotos
  const parseBloques = (fotosJson: any) => {
    if (!fotosJson) return [];
    try {
      // Si ya es array, retornarlo directamente
      if (Array.isArray(fotosJson)) return fotosJson;
      
      // Si es string, parsearlo
      if (typeof fotosJson === 'string') {
        let parsed = JSON.parse(fotosJson);
        // Si el resultado es un string (double-encoded), parsear de nuevo
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }
        if (Array.isArray(parsed)) return parsed;
        // Si es objeto con clave '0', puede ser un objeto con índices
        if (typeof parsed === 'object') {
          const arr = Object.values(parsed).filter(item => 
            item && typeof item === 'object' && 'foto' in item
          );
          return arr;
        }
        return [];
      }
      
      // Si es objeto, convertir a array si tiene estructura válida
      if (typeof fotosJson === 'object') {
        const arr = Object.values(fotosJson).filter(item => 
          item && typeof item === 'object' && 'foto' in item
        );
        return arr;
      }
      return [];
    } catch {
      return [];
    }
  };

  const bloques = parseBloques(informe.fotos);

  // Crear children para el documento
  const children: any[] = [];

  // Insertar encabezado al inicio del documento
  const encabezadoBytes = await getEncabezadoImage();
  if (encabezadoBytes) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: encabezadoBytes,
            transformation: {
              width: 600,
              height: 100
            },
            type: 'png'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );
  }

  // Título
  children.push(
    new Paragraph({
      text: 'INFORME TÉCNICO',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  );

  // Datos del informe (tabla)
  const datosTable = new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: 'Orden:', style: 'Bold' })],
            shading: { fill: 'E0E0E0' }
          }),
          new TableCell({
            children: [new Paragraph({ text: informe.orden?.numero_orden || 'N/A' })]
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Fecha:', style: 'Bold' })],
            shading: { fill: 'E0E0E0' }
          }),
          new TableCell({
            children: [new Paragraph({ 
              text: informe.fecha_informe ? new Date(informe.fecha_informe).toLocaleDateString() : '-'
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: 'Cliente:', style: 'Bold' })],
            shading: { fill: 'E0E0E0' }
          }),
          new TableCell({
            children: [new Paragraph({ text: informe.orden?.cliente?.nombre || 'N/A' })]
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Local:', style: 'Bold' })],
            shading: { fill: 'E0E0E0' }
          }),
          new TableCell({
            children: [new Paragraph({ text: informe.orden?.local?.nombre || 'N/A' })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: 'Técnico:', style: 'Bold' })],
            shading: { fill: 'E0E0E0' }
          }),
          new TableCell({
            children: [new Paragraph({ text: informe.tecnico?.nombre || 'N/A' })]
          }),
          new TableCell({
            children: [new Paragraph({ text: 'Representante:', style: 'Bold' })],
            shading: { fill: 'E0E0E0' }
          }),
          new TableCell({
            children: [new Paragraph({ 
              text: informe.orden?.cliente?.representantes?.find(r => r.principal)?.nombre 
                || informe.orden?.cliente?.representantes?.[0]?.nombre 
                || '-'
            })]
          })
        ]
      })
    ],
    width: { size: 100, type: WidthType.PERCENTAGE }
  });

  children.push(datosTable);
  children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

  // Descripción del trabajo
  if (informe.descripcion_trabajo) {
    children.push(
      new Paragraph({
        text: 'DESCRIPCIÓN DEL TRABAJO',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 }
      })
    );
    children.push(
      new Paragraph({
        text: informe.descripcion_trabajo,
        spacing: { after: 200 }
      })
    );
  }

  // Materiales usados
  if (informe.materiales_usados) {
    children.push(
      new Paragraph({
        text: 'MATERIALES USADOS',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 }
      })
    );
    children.push(
      new Paragraph({
        text: informe.materiales_usados,
        spacing: { after: 200 }
      })
    );
  }

  // Estado del equipo
  if (informe.estado_equipo) {
    children.push(
      new Paragraph({
        text: 'ESTADO DEL EQUIPO',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 }
      })
    );
    children.push(
      new Paragraph({
        text: informe.estado_equipo.replace('_', ' ').toUpperCase(),
        spacing: { after: 200 }
      })
    );
  }

  // Recomendaciones
  if (informe.recomendaciones) {
    children.push(
      new Paragraph({
        text: 'RECOMENDACIONES',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 }
      })
    );
    children.push(
      new Paragraph({
        text: informe.recomendaciones,
        spacing: { after: 200 }
      })
    );
  }

  // Próximo mantenimiento
  if (informe.proximo_mantenimiento) {
    children.push(
      new Paragraph({
        text: 'PRÓXIMO MANTENIMIENTO',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 }
      })
    );
    children.push(
      new Paragraph({
        text: new Date(informe.proximo_mantenimiento).toLocaleDateString(),
        spacing: { after: 200 }
      })
    );
  }

  // Fotos con descripciones e imágenes (layout: imagen izq, descripción der)
  if (bloques.length > 0) {
    children.push(
      new Paragraph({
        text: 'FOTOS Y DESCRIPCIONES',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 }
      })
    );

    for (let i = 0; i < bloques.length; i++) {
      const bloque = bloques[i];
      
      // Title of photo
      children.push(
        new Paragraph({
          text: `Foto ${i + 1}:`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 100, after: 50 }
        })
      );
      
      // Crear tabla con imagen a la izquierda y descripción a la derecha
      let imagenBytes: Uint8Array | null = null;
      let dimensionesImg = { width: 200, height: 150 };
      
      // Procesar imagen si existe
      if (bloque.foto && typeof bloque.foto === 'string') {
        try {
          const base64Data = bloque.foto.split(',')[1];
          if (base64Data) {
            const binaryString = atob(base64Data);
            imagenBytes = new Uint8Array(binaryString.length);
            for (let j = 0; j < binaryString.length; j++) {
              imagenBytes[j] = binaryString.charCodeAt(j);
            }
            // Obtener dimensiones (máx 300px para no pasar la mitad de la hoja)
            const dimensiones = await obtenerDimensionesDesdeBase64(bloque.foto);
            const dims = calcularDimensionesImagen(dimensiones.width, dimensiones.height);
            // Limitar a máximo 300px de ancho (mitad de hoja)
            dimensionesImg = {
              width: Math.min(dims.width, 300),
              height: Math.min(dims.height, 225)
            };
          }
        } catch (e) {
          console.error('Error procesando imagen:', e);
        }
      }
      
      // Crear tabla de 2 columnas simétricas (50% cada una)
      const tablaFotos = new Table({
        rows: [
          new TableRow({
            children: [
              // Columna imagen (izquierda) - 50%
              new TableCell({
                children: imagenBytes ? [
                  new Paragraph({
                    children: [
                      new ImageRun({
                        data: imagenBytes,
                        transformation: {
                          width: dimensionesImg.width,
                          height: dimensionesImg.height
                        },
                        type: 'png'
                      })
                    ],
                    alignment: AlignmentType.CENTER
                  })
                ] : [new Paragraph({ text: '(Sin imagen)', alignment: AlignmentType.CENTER })],
                shading: { fill: 'F5F5F5' },
                width: { size: 50, type: WidthType.PERCENTAGE }
              }),
              // Columna descripción (derecha) - 50%
              new TableCell({
                children: [
                  new Paragraph({
                    text: bloque.descripcion || '(Sin descripción)',
                    spacing: { after: 100 }
                  })
                ],
                width: { size: 50, type: WidthType.PERCENTAGE }
              })
            ]
          })
        ],
        width: { size: 100, type: WidthType.PERCENTAGE }
      });
      
      children.push(tablaFotos);
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    }
  }

  // Firma del cliente
  children.push(
    new Paragraph({
      text: '',
      spacing: { before: 400 }
    })
  );
  
  children.push(
    new Paragraph({
      text: 'FIRMA E INFORMACIÓN DEL CLIENTE',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 100 }
    })
  );

  // Nombre y Cédula del cliente
  const nombreCliente = informe.nombre_cliente || informe.orden?.cliente?.representantes?.[0]?.nombre || '-';
  const cedulaCliente = informe.cedula_cliente || '-';
  
  children.push(
    new Paragraph({
      text: `Nombre: ${nombreCliente}`,
      spacing: { after: 50 }
    })
  );
  children.push(
    new Paragraph({
      text: `Cédula: ${cedulaCliente}`,
      spacing: { after: 200 }
    })
  );

  // Firma (debajo del nombre)
  children.push(
    new Paragraph({
      text: 'Firma:',
      spacing: { after: 100 }
    })
  );

  // Agregar imagen de firma si existe
  if (informe.firma_cliente && typeof informe.firma_cliente === 'string') {
    try {
      const base64Firma = informe.firma_cliente.split(',')[1];
      if (base64Firma) {
        const binaryString = atob(base64Firma);
        const bytesFirma = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytesFirma[j] = binaryString.charCodeAt(j);
        }
        
        // Obtener dimensiones de la firma
        const dimensionesFirma = await obtenerDimensionesDesdeBase64(informe.firma_cliente);
        const { width, height } = calcularDimensionesImagen(dimensionesFirma.width, dimensionesFirma.height);
        
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: bytesFirma,
                transformation: {
                  width: Math.min(width, 400),
                  height: Math.min(height, 150)
                },
                type: 'png'
              })
            ],
            spacing: { after: 100 }
          })
        );
      }
    } catch (e) {
      console.error('Error agregando firma:', e);
      children.push(new Paragraph({ text: '(Firma no disponible)', spacing: { after: 100 } }));
    }
  } else {
    children.push(new Paragraph({ text: '(Sin firma)', spacing: { after: 100 } }));
  }

  // Crear documento con marca de agua
  const watermarkBytes = await getWatermarkImage();
  
  // Dimensiones marca de agua en puntos (750 ancho x 1100 alto)
  const WATERMARK_WIDTH = 750;
  const WATERMARK_HEIGHT = 1100;
  
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.PORTRAIT
          },
          margin: {
            top: 1000,
            right: 1000,
            bottom: 1000,
            left: 1000
          }
        }
      },
      headers: {
        default: watermarkBytes ? new Header({
          children: [
            new Paragraph({
              children: [
                new ImageRun({
                  data: watermarkBytes,
                  transformation: {
                    width: WATERMARK_WIDTH,
                    height: WATERMARK_HEIGHT
                  },
                  type: 'png',
                  floating: {
                    behindDocument: true,
                    horizontalPosition: {
                      offset: 0
                    },
                    verticalPosition: {
                      offset: 0
                    }
                  }
                })
              ],
              alignment: AlignmentType.CENTER
            })
          ]
        }) : undefined
      },
      children: children
    }]
  });

  // Generar y descargar
  const blob = await Packer.toBlob(doc);
  const nombreArchivo = `Informe_Tecnico_${informe.orden?.numero_orden || informe.id}_${new Date().toISOString().split('T')[0]}.docx`;
  saveAs(blob, nombreArchivo);
};