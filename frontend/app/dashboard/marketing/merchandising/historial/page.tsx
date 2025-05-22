'use client';

import { useState, useEffect, ReactNode } from 'react';
import Loader from '@/components/Loader'; // Importar Loader

// Ya no se usan datos de ejemplo
// const confirmacionesEjemplo = [...];
// const solicitudesOriginalesEjemplo = [...];

export default function HistorialConfirmaciones() {
  // Estados
  const [confirmaciones, setConfirmaciones] = useState<any[]>([]);
  // solicitudesMap ya no será necesario si el backend devuelve todos los datos unidos
  // const [solicitudesMap, setSolicitudesMap] = useState<Map<number, any>>(new Map()); 
  const [modalVisible, setModalVisible] = useState(false);
  const [detalleActual, setDetalleActual] = useState<any | null>(null); // El detalle será el objeto de confirmación completo
  const [mensaje, setMensaje] = useState<{tipo: 'success' | 'error', texto: string} | null>(null);
  const [cargando, setCargando] = useState<boolean>(false);
  
  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const [registrosPorPagina] = useState<number>(10); // O hacerlo configurable
  const [totalPaginas, setTotalPaginas] = useState<number>(0);
  const [totalRegistros, setTotalRegistros] = useState<number>(0);
  
  // Efecto para cargar datos al montar el componente y cuando cambie la página
  useEffect(() => {
    cargarHistorialConfirmaciones(paginaActual);
  }, [paginaActual]); // Se vuelve a ejecutar si paginaActual cambia
  
  // Función para cargar confirmaciones
  const cargarHistorialConfirmaciones = async (pagina: number) => {
    setCargando(true);
    setMensaje(null);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/marketing/confirmaciones?page=${pagina}&limit=${registrosPorPagina}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({message: `Error ${response.status}`}));
        throw new Error(errorData.error || errorData.message || `Error ${response.status} al cargar historial.`);
      }
      const data = await response.json();
      setConfirmaciones(data.records || []);
      setTotalPaginas(data.total_pages || 0);
      setTotalRegistros(data.total_records || 0);
      setPaginaActual(data.page || 1); // Asegurar que la página actual se sincronice con la respuesta

    } catch (err: any) {
      console.error('Error cargando historial de confirmaciones:', err);
      setConfirmaciones([]);
      setTotalPaginas(0);
      setTotalRegistros(0);
      setMensaje({
        tipo: 'error',
        texto: `Error cargando historial: ${err.message}`
      });
    } finally {
      setCargando(false);
    }
  };
  
  // Función para formatear fecha (puede recibir string o Date)
  const formatearFecha = (fechaISO: string | undefined | Date): string => {
    if (!fechaISO) return '-';
    try {
      // Si ya es un objeto Date, usarlo directamente
      // Si es string, convertirlo. El backend devuelve strings ISO 8601.
      const dateObj = typeof fechaISO === 'string' ? new Date(fechaISO) : fechaISO;
      return dateObj.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error("Error formateando fecha:", fechaISO, e);
      return 'Fecha inválida';
    }
  };
  
  // Función para mostrar el modal con detalles
  const mostrarDetalles = (confirmacionCompleta: any) => {
    setDetalleActual(confirmacionCompleta);
    setModalVisible(true);
  };
  
  // Función para formatear los productos JSON
  const formatProductos = (productos: any): ReactNode => {
    try {
      if (!productos || typeof productos !== 'object') {
        return <div className="italic text-gray-500 py-3">No hay productos registrados</div>;
      }
      
      const productItems = Object.entries(productos).map(([producto, cantidad]) => {
        // Asumimos que 'producto' es el ID del producto, ej: 'merch_lapicero_esco_nor'
        let nombreProd = producto.replace(/^merch_/, '');
        if (nombreProd.endsWith('_eje')) {
            nombreProd = nombreProd.replace(/_eje$/, '');
        }
        nombreProd = nombreProd.replace(/_/g, ' ');
        nombreProd = nombreProd.charAt(0).toUpperCase() + nombreProd.slice(1);
        nombreProd = nombreProd.replace(/\b\w/g, char => char.toUpperCase());

        return (
          <div key={producto} className="bg-gray-50 p-3 rounded-md mb-2">
            <strong>{nombreProd}:</strong> {String(cantidad)} unidades
          </div>
        );
      });
      
      return productItems.length > 0 ? 
        <>{productItems}</> : 
        <div className="italic text-gray-500 py-3">No hay productos registrados</div>;
    } catch (e) {
      console.error('Error procesando productos:', e);
      return <div className="italic text-gray-500 py-3">No hay productos registrados o formato incorrecto</div>;
    }
  };

  // Funciones para la paginación
  const cambiarPagina = (nuevaPagina: number) => {
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
      setPaginaActual(nuevaPagina);
    }
  };

  const renderizarNumerosDePagina = () => {
    const numeros = [];
    const maxBotonesVisibles = 5; // Número máximo de botones de página a mostrar (ej. 1, 2, ..., 5, 6)
    let inicio = Math.max(1, paginaActual - Math.floor(maxBotonesVisibles / 2));
    let fin = Math.min(totalPaginas, inicio + maxBotonesVisibles - 1);

    if (totalPaginas > maxBotonesVisibles) {
        if (fin === totalPaginas) {
            inicio = Math.max(1, totalPaginas - maxBotonesVisibles + 1);
        } else if (inicio === 1 && fin < totalPaginas) {
            fin = maxBotonesVisibles;
        }
    }

    if (inicio > 1) {
      numeros.push(
        <button
          key="inicio"
          onClick={() => cambiarPagina(1)}
          className="px-3 py-1 mx-1 border rounded hover:bg-gray-100 transition-colors"
        >
          1
        </button>
      );
      if (inicio > 2) {
        numeros.push(<span key="puntos-inicio" className="px-3 py-1 mx-1">...</span>);
      }
    }

    for (let i = inicio; i <= fin; i++) {
      numeros.push(
        <button
          key={i}
          onClick={() => cambiarPagina(i)}
          className={`px-3 py-1 mx-1 border rounded transition-colors ${
            paginaActual === i ? 'bg-[#2e3954] text-white' : 'hover:bg-gray-100'
          }`}
        >
          {i}
        </button>
      );
    }

    if (fin < totalPaginas) {
      if (fin < totalPaginas - 1) {
        numeros.push(<span key="puntos-fin" className="px-3 py-1 mx-1">...</span>);
      }
      numeros.push(
        <button
          key="fin"
          onClick={() => cambiarPagina(totalPaginas)}
          className="px-3 py-1 mx-1 border rounded hover:bg-gray-100 transition-colors"
        >
          {totalPaginas}
        </button>
      );
    }
    return numeros;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="relative"> {/* Contenedor para el Loader */}
        {cargando && <Loader mensaje="Cargando historial..." />}
        <div className={`bg-white p-6 rounded-lg shadow-md ${cargando ? 'opacity-50' : ''}`}> 
          <h1 className="text-2xl font-bold text-[#2e3954] mb-6 text-center">Historial de Confirmaciones</h1>
          
          {/* Tabla de confirmaciones */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">ID Confirm.</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Fecha Confirm.</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Confirmador</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Grupo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">ID Solicitud</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Solicitante Orig.</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">RUC Orig.</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Fecha Visita Orig.</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {confirmaciones.length > 0 ? (
                  confirmaciones.map(conf => {
                    // Los datos de la solicitud original ahora vienen unidos en 'conf'
                    return (
                      <tr key={conf.confirmacion_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border border-gray-200 text-gray-800">{conf.confirmacion_id || '-'}</td>
                        <td className="px-4 py-2 border border-gray-200 text-gray-800">{formatearFecha(conf.fecha_confirmacion)}</td>
                        <td className="px-4 py-2 border border-gray-200 text-gray-800">{conf.confirmador || '-'}</td>
                        <td className="px-4 py-2 border border-gray-200 text-gray-800">{conf.grupo_confirmacion || '-'}</td> 
                        <td className="px-4 py-2 border border-gray-200 text-gray-800">{conf.solicitud_id || '-'}</td>
                        <td className="px-4 py-2 border border-gray-200 text-gray-800">{conf.solicitante || '-'}</td>
                        <td className="px-4 py-2 border border-gray-200 text-gray-800">{conf.ruc || '-'}</td>
                        <td className="px-4 py-2 border border-gray-200 text-gray-800">{formatearFecha(conf.fecha_visita)}</td>
                        <td className="px-4 py-2 border border-gray-200">
                          <button 
                            onClick={() => mostrarDetalles(conf)} // Pasar toda la confirmación
                            className="px-3 py-1 bg-[#2e3954] text-white text-sm rounded hover:bg-[#8dbba3] transition-colors duration-200"
                          >
                            Más detalles
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-4 text-center text-gray-500 italic">
                      {!cargando ? "No hay confirmaciones registradas." : "Cargando..."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Controles de Paginación */}
          {totalPaginas > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-700">
              <div className="mb-2 sm:mb-0">
                Mostrando <span className="font-semibold">{confirmaciones.length}</span> de <span className="font-semibold">{totalRegistros}</span> registros. Página <span className="font-semibold">{paginaActual}</span> de <span className="font-semibold">{totalPaginas}</span>.
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => cambiarPagina(paginaActual - 1)}
                  disabled={paginaActual === 1}
                  className="px-3 py-1 mx-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                {renderizarNumerosDePagina()}
                <button
                  onClick={() => cambiarPagina(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                  className="px-3 py-1 mx-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
          
          {/* Mensajes de error o éxito */}
          {mensaje && (
            <div className={`mb-6 p-3 rounded-md ${
              mensaje.tipo === 'success' 
                ? 'bg-green-50 border-l-4 border-green-500 text-green-700' 
                : 'bg-red-50 border-l-4 border-red-500 text-red-700'
            }`}>
              {mensaje.texto}
            </div>
          )}
          
          {/* Modal de Detalles */}
          {modalVisible && detalleActual && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-3xl max-h-[90vh] overflow-auto">
                {/* Cabecera del modal */}
                <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center rounded-t-lg">
                  <h3 className="text-lg font-medium text-gray-900">
                    Detalles de Confirmación #{detalleActual.confirmacion_id} (Solicitud Original #{detalleActual.solicitud_id})
                  </h3>
                  <button 
                    onClick={() => setModalVisible(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-bold"
                  >
                    &times;
                  </button>
                </div>
                
                {/* Cuerpo del modal */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Columna Izquierda: Datos de la Solicitud Original */}
                  <div className="space-y-4 text-gray-800">
                    <h4 className="text-md font-semibold text-gray-700 border-b pb-2">Datos Solicitud Original</h4>
                    <p><strong>Solicitante:</strong> {detalleActual.solicitante || 'N/A'}</p>
                    <p><strong>RUC:</strong> {detalleActual.ruc || 'N/A'}</p>
                    <p><strong>Grupo:</strong> {detalleActual.grupo_confirmacion || 'N/A'}</p> {/* Asumiendo que el grupo es el mismo o usar detalleActual.grupo_solicitud si lo tuvieras */}
                    <p><strong>Fecha Visita Programada:</strong> {formatearFecha(detalleActual.fecha_visita)}</p>
                    <p><strong>Cantidad Packs Solicitados:</strong> {detalleActual.cantidad_packs_solicitada || 'N/A'}</p>
                    <p><strong>Catálogos Solicitados:</strong> {detalleActual.catalogos_solicitados || 'Ninguno'}</p>
                    <p><strong>Fecha Creación Solicitud:</strong> {formatearFecha(detalleActual.fecha_creacion_solicitud)}</p>
                    <p><strong>Estado Solicitud Original:</strong> <span className={`px-2 py-1 text-xs rounded-full ${detalleActual.status_solicitud_original === 'pending' ? 'bg-yellow-100 text-yellow-800' : detalleActual.status_solicitud_original === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{detalleActual.status_solicitud_original || 'N/A'}</span></p>
                  </div>

                  {/* Columna Derecha: Datos de la Confirmación */}
                  <div className="space-y-4 text-gray-800">
                    <h4 className="text-md font-semibold text-gray-700 border-b pb-2">Datos de la Confirmación</h4>
                    <p><strong>Confirmador:</strong> {detalleActual.confirmador || 'N/A'}</p>
                    <p><strong>Fecha Confirmación:</strong> {formatearFecha(detalleActual.fecha_confirmacion)}</p>
                    <div>
                      <strong>Observaciones:</strong>
                      <div className="mt-1 p-2 border rounded-md bg-gray-50 text-sm min-h-[60px]">
                        {detalleActual.observaciones ? 
                          detalleActual.observaciones :
                          <span className="italic text-gray-500">Sin observaciones</span>
                        }
                      </div>
                    </div>
                    <div>
                      <strong>Productos Confirmados:</strong>
                      <div className="mt-1">
                        {formatProductos(detalleActual.productos_confirmados)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Pie del modal */}
                <div className="bg-gray-50 px-6 py-4 border-t flex justify-end rounded-b-lg">
                  <button
                    onClick={() => setModalVisible(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div> {/* Cierre del div con fondo blanco */}
      </div> {/* Cierre del div relative */}
    </div>
  );
} 