'use client';

import { useState, useEffect } from 'react';

// Define la URL base de tu backend Flask usando la variable de entorno
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'; 

// Interfaz para el objeto catálogo como lo devuelve la API del backend
interface CatalogoFromAPI {
  name: string; // Nombre del catálogo (directorio y base del nombre del PDF)
  pages: number;
  has_images: boolean;
  original_pdf_available: boolean;
  original_pdf_path_relative: string | null; // ej: "CATALOGO_X/CATALOGO_X.pdf"
  thumbnail_path_relative: string | null;    // ej: "CATALOGO_X/thumb_CATALOGO_X.webp"
  images_base_path_relative: string; // ej: "CATALOGO_X"
}

export default function Catalogos() {
  // Estados
  const [catalogos, setCatalogos] = useState<CatalogoFromAPI[]>([]);
  const [catalogosFiltrados, setCatalogosFiltrados] = useState<CatalogoFromAPI[]>([]);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [modalReporteVisible, setModalReporteVisible] = useState(false);
  const [pdfSeleccionado, setPdfSeleccionado] = useState<CatalogoFromAPI | null>(null); // Guardará el objeto completo
  const [tipoError, setTipoError] = useState('');
  const [descripcionError, setDescripcionError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  
  // Cargar catálogos al montar el componente
  useEffect(() => {
    cargarCatalogos();
  }, []);
  
  // Filtrar catálogos cuando cambia el término de búsqueda o la lista original
  useEffect(() => {
    if (catalogos.length > 0) {
      filtrarCatalogos();
    }
  }, [terminoBusqueda, catalogos]);
  
  // Función para cargar catálogos desde la API del backend
  const cargarCatalogos = async () => {
    setIsLoading(true);
    setErrorCarga(null);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/pdfs/listar-pdfs-procesados`);
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }
      const data: CatalogoFromAPI[] = await response.json();
      console.log("Catálogos cargados desde el backend:", data);
      setCatalogos(data);
      setCatalogosFiltrados(data); // Inicialmente mostrar todos
    } catch (error) {
      console.error('Error al cargar catálogos desde el backend:', error);
      setErrorCarga(error instanceof Error ? error.message : 'Error desconocido al cargar catálogos.');
      setCatalogos([]); // Limpiar en caso de error
      setCatalogosFiltrados([]);
    }
    setIsLoading(false);
  };
  
  // Función para filtrar catálogos por término de búsqueda
  const filtrarCatalogos = () => {
    if (!terminoBusqueda.trim()) {
      setCatalogosFiltrados(catalogos);
      return;
    }
    
    const termino = terminoBusqueda.toLowerCase().trim();
    const filtrados = catalogos.filter(catalogo => 
      catalogo.name.toLowerCase().includes(termino)
    );
    
    setCatalogosFiltrados(filtrados);
  };
  
  // Función para abrir el modal de reporte
  const abrirModalReporte = (catalogo: CatalogoFromAPI) => {
    setPdfSeleccionado(catalogo);
    setTipoError('');
    setDescripcionError('');
    setModalReporteVisible(true);
  };
  
  // Función para enviar reporte de error
  const enviarReporte = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tipoError || !descripcionError || !pdfSeleccionado) {
      alert('Por favor completa todos los campos del formulario y asegúrate de que un PDF esté seleccionado.');
      return;
    }
    
    const reportData = {
        pdf: pdfSeleccionado.name, // Nombre del catálogo
        tipo: tipoError,
        descripcion: descripcionError,
        // podrías añadir datos del usuario si los tienes en el frontend
        // usuario: "Usuario Frontend", 
        // cargo: "-"
    };

    console.log('Enviando reporte para:', pdfSeleccionado.name, reportData);
    
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/pdfs/report-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reportData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: `Error HTTP ${response.status}`}));
            throw new Error(errorData.error || `Error HTTP ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
            alert(`Reporte enviado correctamente para el catálogo "${formatearNombreCatalogo(pdfSeleccionado.name)}"`);
            cerrarModalReporte();
        } else {
            throw new Error(result.error || 'Error desconocido al enviar el reporte.');
        }
    } catch (error) {
        console.error('Error al enviar reporte:', error);
        alert(`Error al enviar el reporte: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Función para compartir un catálogo (actualizada para el visualizador del backend)
  const compartirCatalogo = (catalogo: CatalogoFromAPI) => {
    const urlCompartir = `${BACKEND_BASE_URL}/api/pdfs/?pdf=${encodeURIComponent(catalogo.name)}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(urlCompartir)
        .then(() => {
          alert('Enlace para ver el PDF copiado al portapapeles!');
        })
        .catch(err => {
          console.error('Error al copiar enlace:', err);
          alert('No se pudo copiar el enlace automáticamente. URL: ' + urlCompartir);
        });
    } else {
      alert('No se pudo copiar el enlace automáticamente. URL: ' + urlCompartir);
    }
  };

  // Función para ver el PDF en el visualizador del backend
  const verPdf = (catalogo: CatalogoFromAPI) => {
    const viewerUrl = `${BACKEND_BASE_URL}/api/pdfs/?pdf=${encodeURIComponent(catalogo.name)}`;
    window.open(viewerUrl, '_blank'); // Abre en una nueva pestaña
  };

  // Función para descargar el PDF original
  const descargarPdf = async (catalogo: CatalogoFromAPI) => {
    if (!catalogo.original_pdf_path_relative) {
        alert("El archivo PDF original no está disponible para este catálogo.");
        return;
    }
    // La ruta es NombreCatalogo/NombreCatalogo.pdf
    const downloadUrl = `${BACKEND_BASE_URL}/api/pdfs/processed_files/${catalogo.original_pdf_path_relative}`;
    console.log("Intentando descargar desde:", downloadUrl);

    try {
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status} al descargar el archivo.`);
        }
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = catalogo.name + '.pdf'; // Nombre del archivo para descarga
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error("Error al descargar PDF:", error);
        alert("No se pudo descargar el PDF. " + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  // Función para eliminar un catálogo
  const eliminarCatalogo = async (catalogo: CatalogoFromAPI) => {
    if (confirm(`¿Estás seguro que deseas eliminar el catálogo "${formatearNombreCatalogo(catalogo.name)}"?`)) {
      try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/pdfs/delete-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pdf_name: catalogo.name })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: `Error HTTP ${response.status}`}));
            throw new Error(errorData.error || `Error HTTP ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
            alert(`Catálogo "${formatearNombreCatalogo(catalogo.name)}" eliminado correctamente.`);
            cargarCatalogos(); // Recargar la lista después de eliminar
        } else {
            throw new Error(result.error || 'Error al eliminar el catálogo desde el backend.');
        }
      } catch (error) {
        console.error('Error al eliminar catálogo:', error);
        alert("Error al eliminar el catálogo: "+ (error instanceof Error ? error.message : String(error)));
      }
    }
  };
  
  // Función para actualizar un catálogo (redirige a la página de subida del backend)
  const actualizarCatalogo = (catalogo: CatalogoFromAPI) => {
    // alert(`Actualizar catálogo: ${catalogo.name}. Esto podría implicar borrar el antiguo y subir uno nuevo.`);
    // Podríamos simplemente redirigir a la página de subida del backend
    const uploadPageUrl = `${BACKEND_BASE_URL}/api/pdfs/upload-page`;
    window.open(uploadPageUrl, '_blank'); 
    alert("Se abrirá la página de subida en una nueva pestaña. Sube el nuevo PDF con el MISMO NOMBRE para reemplazar el existente: " + catalogo.name);
  };
  
  // Función para compartir el visualizador general (ahora es la página de catálogo del backend)
  const compartirVisualizadorGeneral = () => {
    const urlVisualizador = `${BACKEND_BASE_URL}/api/pdfs/catalogo`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(urlVisualizador)
        .then(() => {
          alert('Enlace de la página de catálogos copiado al portapapeles');
        })
        .catch(err => {
          console.error('Error al copiar enlace:', err);
          alert('No se pudo copiar el enlace automáticamente. URL: ' + urlVisualizador);
        });
    } else {
      alert('No se pudo copiar el enlace automáticamente. URL: ' + urlVisualizador);
    }
  };
  
  // Función para formatear el nombre del catálogo para mostrar
  const formatearNombreCatalogo = (nombre: string) => {
    if (!nombre) return 'Nombre no disponible';
    return nombre
      .replace(/_/g, ' ')
      .replace(/.pdf$/i, '') // Quita .pdf si está al final (aunque el 'name' de la API ya no lo tiene)
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  // Función para cerrar el modal de reporte
  const cerrarModalReporte = () => {
    setModalReporteVisible(false);
    setPdfSeleccionado(null);
    setTipoError('');
    setDescripcionError('');
  };

  const irAPaginaDeSubida = () => {
    const uploadUrl = `${BACKEND_BASE_URL}/api/pdfs/upload-page`;
    window.open(uploadUrl, '_blank');
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8 text-center">Cargando catálogos...</div>;
  }

  if (errorCarga) {
    return <div className="container mx-auto px-4 py-8 text-center text-red-500">Error al cargar: {errorCarga}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        {/* Cabecera con título y buscador */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#2e3954] mb-4 md:mb-0">Nuestros Catálogos (Backend)</h1>
          
          {/* Contenedor para el buscador y el botón de añadir */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <input 
                type="text"
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                placeholder="Buscar catálogos..."
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#d48b45] focus:border-transparent text-gray-800 bg-white"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-[#d48b45]" aria-label="Buscar">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </div>
            <button 
              onClick={irAPaginaDeSubida}
              title="Añadir nuevo catálogo"
              className="p-2 bg-[#2e3954] text-white rounded-full hover:bg-opacity-90 transition-colors flex items-center justify-center aspect-square"
              style={{ width: '40px', height: '40px' }} // Asegura que sea un círculo si es redondo
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
        
        {/* Botón del visualizador general */}
        <div className="mb-8">
          <button 
            onClick={compartirVisualizadorGeneral}
            className="flex items-center justify-between w-full px-6 py-3 bg-[#2e3954] text-white rounded-md hover:bg-opacity-90 transition-colors duration-200"
          >
            <span className="font-medium">Página de Catálogos (Backend)</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        
        {/* Lista de catálogos */}
        <div className="space-y-6">
          {catalogosFiltrados.length > 0 ? (
            catalogosFiltrados.map((catalogo) => (
              <div key={catalogo.name} className="border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-4 items-center">
                {/* Miniatura del catálogo */}
                <div className="w-[120px] h-[170px] border border-gray-300 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center mx-auto md:mx-0">
                  {catalogo.thumbnail_path_relative ? (
                    <img
                      src={`${BACKEND_BASE_URL}/api/pdfs/processed_files/${catalogo.thumbnail_path_relative}`}
                      alt={formatearNombreCatalogo(catalogo.name)}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = '/images/pdf-icon.svg'; // Fallback local del frontend
                      }}
                    />
                  ) : (
                    <svg className="w-16 h-16 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12,2H6V22H18V8L12,2Z M12,4L16,8H12V4Z M9,10H15V12H9V10Z M9,14H15V16H9V14Z M9,18H13V20H9V18Z"/>
                    </svg>
                  )}
                </div>
                
                {/* Título del catálogo */}
                <h2 className="text-lg font-semibold text-gray-800 text-center md:text-left">
                  {formatearNombreCatalogo(catalogo.name)}
                </h2>
                
                {/* Botones de acción */}
                <div className="flex flex-col gap-3 w-full md:w-auto">
                  {/* Primera fila de botones */}
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => descargarPdf(catalogo)}
                      className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 text-gray-700 hover:text-[#d48b45] transition-colors"
                      title="Descargar PDF Original"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      <span className="text-xs md:text-sm hidden md:inline text-gray-800">Descargar</span>
                    </button>
                    
                    <button 
                      onClick={() => verPdf(catalogo)}
                      className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 text-gray-700 hover:text-[#d48b45] transition-colors"
                      title="Ver PDF en el visualizador"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      <span className="text-xs md:text-sm hidden md:inline text-gray-800">Ver PDF</span>
                    </button>
                    
                    <button 
                      onClick={() => compartirCatalogo(catalogo)}
                      className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 text-gray-700 hover:text-[#d48b45] transition-colors"
                      title="Copiar enlace para ver PDF"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                      <span className="text-xs md:text-sm hidden md:inline text-gray-800">Enviar</span>
                    </button>
                  </div>
                  
                  {/* Segunda fila de botones */}
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => eliminarCatalogo(catalogo)}
                      className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 text-gray-700 hover:text-red-500 transition-colors"
                      title="Eliminar Catálogo del Servidor"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      <span className="text-xs md:text-sm hidden md:inline text-gray-800">Eliminar</span>
                    </button>
                    
                    <button 
                      onClick={() => actualizarCatalogo(catalogo)} // Pasa el objeto catálogo completo
                      className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 text-gray-700 hover:text-[#d48b45] transition-colors"
                      title="Actualizar Catálogo (subir nueva versión)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"></path>
                      </svg>
                      <span className="text-xs md:text-sm hidden md:inline text-gray-800">Actualizar</span>
                    </button>
                    
                    <button 
                      onClick={() => abrirModalReporte(catalogo)} // Pasa el objeto catálogo completo
                      className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 text-gray-700 hover:text-[#d48b45] transition-colors"
                      title="Reportar Problema con este PDF"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                      <span className="text-xs md:text-sm hidden md:inline text-gray-800">Reportar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              {!isLoading && catalogos.length === 0 ? 'No hay catálogos disponibles en el servidor.' : 'No se encontraron catálogos que coincidan con la búsqueda.'}
            </div>
          )}
        </div>
        
        {/* Modal de reporte */}
        {modalReporteVisible && pdfSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-md max-h-[90vh] overflow-auto">
              {/* Cabecera del modal */}
              <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center rounded-t-lg">
                <h3 className="text-lg font-medium text-gray-900">
                  Reportar problema: <span className="font-semibold">{formatearNombreCatalogo(pdfSeleccionado.name)}</span>
                </h3>
                <button 
                  onClick={cerrarModalReporte}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-bold"
                >
                  &times;
                </button>
              </div>
              
              {/* Cuerpo del modal */}
              <div className="p-6">
                <form onSubmit={enviarReporte}>
                  <div className="mb-4">
                    <label htmlFor="errorType" className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Error
                    </label>
                    <select
                      id="errorType"
                      value={tipoError}
                      onChange={(e) => setTipoError(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d48b45] text-gray-800 bg-white"
                      required
                    >
                      <option value="">Seleccione un tipo de error</option>
                      <option value="descripcion">Descripción incorrecta/errónea</option>
                      <option value="imagen">Error de Imagen</option>
                      <option value="enlace">Enlace roto o Inválido</option>
                      <option value="ortografia">Ortografía/Gramática</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="errorDescription" className="block text-sm font-medium text-gray-700 mb-1">
                      Describe el error
                    </label>
                    <textarea
                      id="errorDescription"
                      value={descripcionError}
                      onChange={(e) => setDescripcionError(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d48b45] text-gray-800 bg-white"
                      rows={5}
                      required
                    ></textarea>
                  </div>
                </form>
              </div>
              
              {/* Pie del modal */}              
              <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3 rounded-b-lg">
                <button
                  type="button" // Asegurar que no haga submit del form por defecto
                  onClick={cerrarModalReporte}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit" // Este es el que realmente envía el formulario
                  onClick={enviarReporte} // Asociado al submit del form o directamente al click
                  className="px-4 py-2 bg-[#2e3954] text-white rounded-md hover:bg-opacity-90 transition-colors text-sm font-medium"
                >
                  Enviar Reporte
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 