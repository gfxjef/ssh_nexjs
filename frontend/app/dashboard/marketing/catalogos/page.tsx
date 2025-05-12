'use client';

import { useState, useEffect } from 'react';

// Datos de ejemplo para los catálogos
const catalogosEjemplo = [
  {
    name: 'Catalogo_Binder_2023.pdf',
    thumbnailAvailable: true
  },
  {
    name: 'Manual_Esco_Filtros.pdf',
    thumbnailAvailable: true
  },
  {
    name: 'Productos_Atago_2023.pdf',
    thumbnailAvailable: true
  },
  {
    name: 'Catalogo_General_2024.pdf',
    thumbnailAvailable: false
  },
  {
    name: 'Instrumentos_Laboratorio.pdf',
    thumbnailAvailable: true
  }
];

export default function Catalogos() {
  // Estados
  const [catalogos, setCatalogos] = useState<any[]>([]);
  const [catalogosFiltrados, setCatalogosFiltrados] = useState<any[]>([]);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [modalReporteVisible, setModalReporteVisible] = useState(false);
  const [pdfSeleccionado, setPdfSeleccionado] = useState('');
  const [tipoError, setTipoError] = useState('');
  const [descripcionError, setDescripcionError] = useState('');
  
  // Cargar catálogos al montar el componente
  useEffect(() => {
    cargarCatalogos();
  }, []);
  
  // Filtrar catálogos cuando cambia el término de búsqueda
  useEffect(() => {
    if (catalogos.length > 0) {
      filtrarCatalogos();
    }
  }, [terminoBusqueda, catalogos]);
  
  // Función para cargar catálogos desde la API
  const cargarCatalogos = async () => {
    try {
      // En una aplicación real, esto sería una llamada fetch a la API
      // Por ahora usamos datos de ejemplo
      setCatalogos(catalogosEjemplo);
      setCatalogosFiltrados(catalogosEjemplo);
    } catch (error) {
      console.error('Error al cargar catálogos:', error);
    }
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
  const abrirModalReporte = (nombrePdf: string) => {
    setPdfSeleccionado(nombrePdf);
    setTipoError('');
    setDescripcionError('');
    setModalReporteVisible(true);
  };
  
  // Función para enviar reporte de error
  const enviarReporte = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tipoError || !descripcionError) {
      alert('Por favor completa todos los campos del formulario.');
      return;
    }
    
    // En una aplicación real, aquí enviaríamos el reporte a la API
    console.log('Enviando reporte para:', pdfSeleccionado);
    console.log('Tipo de error:', tipoError);
    console.log('Descripción:', descripcionError);
    
    // Mostrar mensaje de éxito y cerrar modal
    alert(`Reporte enviado correctamente para el catálogo "${formatearNombreCatalogo(pdfSeleccionado)}"`);
    cerrarModalReporte();
  };
  
  // Función para compartir un catálogo
  const compartirCatalogo = (nombreCatalogo: string) => {
    // En una aplicación real, esto generaría un enlace compartible
    const urlCompartir = `http://ejemplo.com/catalogo?pdf=${encodeURIComponent(nombreCatalogo)}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(urlCompartir)
        .then(() => {
          // Mostrar mensaje de éxito
          alert('Enlace copiado al portapapeles');
        })
        .catch(err => {
          console.error('Error al copiar enlace:', err);
          alert('No se pudo copiar el enlace automáticamente. URL: ' + urlCompartir);
        });
    } else {
      // Fallback para navegadores sin soporte de clipboard
      alert('No se pudo copiar el enlace automáticamente. URL: ' + urlCompartir);
    }
  };
  
  // Función para eliminar un catálogo
  const eliminarCatalogo = (nombreCatalogo: string) => {
    if (confirm(`¿Estás seguro que deseas eliminar el catálogo "${formatearNombreCatalogo(nombreCatalogo)}"?`)) {
      // En una aplicación real, aquí eliminaríamos el catálogo a través de la API
      const nuevoscatalogos = catalogos.filter(catalogo => catalogo.name !== nombreCatalogo);
      setCatalogos(nuevoscatalogos);
      
      // Mostrar mensaje de éxito
      alert(`Catálogo "${formatearNombreCatalogo(nombreCatalogo)}" eliminado correctamente.`);
    }
  };
  
  // Función para actualizar un catálogo
  const actualizarCatalogo = (nombreCatalogo: string) => {
    // En una aplicación real, aquí abriríamos un modal para subir un nuevo archivo
    alert(`Función para actualizar el catálogo "${formatearNombreCatalogo(nombreCatalogo)}" (por implementar)`);
  };
  
  // Función para compartir el visualizador general
  const compartirVisualizadorGeneral = () => {
    // En una aplicación real, esto sería la URL del visualizador general
    const urlVisualizador = "http://ejemplo.com/visualizador-general";
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(urlVisualizador)
        .then(() => {
          // Mostrar mensaje de éxito
          alert('Enlace del visualizador general copiado al portapapeles');
        })
        .catch(err => {
          console.error('Error al copiar enlace:', err);
          alert('No se pudo copiar el enlace automáticamente. URL: ' + urlVisualizador);
        });
    } else {
      // Fallback para navegadores sin soporte de clipboard
      alert('No se pudo copiar el enlace automáticamente. URL: ' + urlVisualizador);
    }
  };
  
  // Función para formatear el nombre del catálogo para mostrar
  const formatearNombreCatalogo = (nombre: string) => {
    return nombre
      .replace(/_/g, ' ')
      .replace(/.pdf$/i, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  // Función para cerrar el modal de reporte
  const cerrarModalReporte = () => {
    setModalReporteVisible(false);
    setPdfSeleccionado('');
    setTipoError('');
    setDescripcionError('');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        {/* Cabecera con título y buscador */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#2e3954] mb-4 md:mb-0">Nuestros Catálogos</h1>
          <div className="relative w-full md:w-80">
            <input 
              type="text"
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
              placeholder="Buscar catálogos..."
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#d48b45] focus:border-transparent text-gray-800 bg-white"
            />
            <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-[#d48b45]">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
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
            <span className="font-medium">Visualizador General de catálogos</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        
        {/* Lista de catálogos */}
        <div className="space-y-6">
          {catalogosFiltrados.length > 0 ? (
            catalogosFiltrados.map((catalogo, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-4 items-center">
                {/* Miniatura del catálogo */}
                <div className="w-[120px] h-[170px] border border-gray-300 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center mx-auto md:mx-0">
                  {catalogo.thumbnailAvailable ? (
                    <img
                      src={`/images/thumb_${catalogo.name.replace('.pdf', '')}.jpg`}
                      alt={formatearNombreCatalogo(catalogo.name)}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback si la imagen no se encuentra
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = '/images/pdf-icon.svg';
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
                    <button className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 text-gray-700 hover:text-[#d48b45] transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      <span className="text-xs md:text-sm hidden md:inline text-gray-800">Descargar</span>
                    </button>
                    
                    <button className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 text-gray-700 hover:text-[#d48b45] transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      <span className="text-xs md:text-sm hidden md:inline text-gray-800">Ver PDF</span>
                    </button>
                    
                    <button 
                      onClick={() => compartirCatalogo(catalogo.name)}
                      className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 text-gray-700 hover:text-[#d48b45] transition-colors"
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
                      onClick={() => eliminarCatalogo(catalogo.name)}
                      className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 text-gray-700 hover:text-red-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      <span className="text-xs md:text-sm hidden md:inline text-gray-800">Eliminar</span>
                    </button>
                    
                    <button 
                      onClick={() => actualizarCatalogo(catalogo.name)}
                      className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 text-gray-700 hover:text-[#d48b45] transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"></path>
                      </svg>
                      <span className="text-xs md:text-sm hidden md:inline text-gray-800">Actualizar</span>
                    </button>
                    
                    <button 
                      onClick={() => abrirModalReporte(catalogo.name)}
                      className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 text-gray-700 hover:text-[#d48b45] transition-colors"
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
              No se encontraron catálogos que coincidan con la búsqueda.
            </div>
          )}
        </div>
        
        {/* Modal de reporte */}
        {modalReporteVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-md max-h-[90vh] overflow-auto">
              {/* Cabecera del modal */}
              <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center rounded-t-lg">
                <h3 className="text-lg font-medium text-gray-900">
                  Reportar problema con PDF: <span className="font-semibold">{formatearNombreCatalogo(pdfSeleccionado)}</span>
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
              <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-2 rounded-b-lg">
                <button
                  onClick={cerrarModalReporte}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={enviarReporte}
                  className="px-4 py-2 bg-[#2e3954] text-white rounded hover:bg-[#8dbba3] transition-colors"
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