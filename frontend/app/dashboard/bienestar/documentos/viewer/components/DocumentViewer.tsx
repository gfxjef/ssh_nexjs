'use client';

import React, { useState, useEffect } from 'react';
import { Document } from '../../types';

interface DocumentViewerProps {
  document: Document;
  onDownload?: (document: Document) => void;
}

/**
 * Componente para visualizar documentos con preview de diferentes tipos
 */
export default function DocumentViewer({ document, onDownload }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // URL para archivos servidos desde el backend con manejo de espacios
  const getFileUrl = (document: Document) => {
    console.log(`🔗 [URL DEBUG] Document ID: ${document.id}`);
    console.log(`🔗 [URL DEBUG] ruta_archivo: '${document.ruta_archivo}'`);
    console.log(`🔗 [URL DEBUG] nombre_archivo: '${document.nombre_archivo}'`);
    
    // Extraer el nombre real del archivo desde la ruta_archivo
    const filename = document.ruta_archivo.split('/').pop();
    
    // Usar el endpoint del backend que maneja archivos correctamente
    const finalUrl = `http://localhost:3001/api/bienestar/documentos/files/${encodeURIComponent(filename || '')}`;
    
    console.log(`🔗 [URL DEBUG] Extracted filename: '${filename}'`);
    console.log(`🔗 [URL DEBUG] Final URL (backend): ${finalUrl}`);
    
    return finalUrl;
  };

  // Función para formatear el tamaño del archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Función para formatear fecha
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Determinar el tipo de visualización basado en el MIME type
  const getViewerType = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('text') || mimeType.includes('json')) return 'text';
    return 'download';
  };

  // Estados para manejar el timeout de imágenes
  const [imageTimeout, setImageTimeout] = useState<NodeJS.Timeout | null>(null);

  // Renderizar preview de imagen
  const renderImageViewer = () => {
    const imageUrl = getFileUrl(document);
    console.log(`🖼️ [RENDER] Rendering image viewer for document ${document.id}`);
    console.log(`🖼️ [RENDER] Image URL: ${imageUrl}`);
    console.log(`🖼️ [RENDER] Document MIME type: ${document.tipo_mime}`);
    console.log(`🖼️ [RENDER] Document ruta_archivo: ${document.ruta_archivo}`);
    console.log(`🖼️ [RENDER] Estado ACTUAL - loading: ${loading}, error: ${error}`);
    
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-lg">
        <div className="max-w-4xl max-h-full relative">
          {/* Mostrar spinner mientras loading es true */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2e3954] mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Cargando imagen...</p>
                <p className="text-xs text-gray-500 mt-1">Documento {document.id}</p>
              </div>
            </div>
          )}
          
          {/* Mostrar error si existe */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-lg z-10">
              <div className="text-center text-red-600">
                <p className="text-sm">{error}</p>
                <p className="text-xs mt-1">URL: {imageUrl.split('/').pop()}</p>
              </div>
            </div>
          )}
          
          {/* Imagen - siempre presente pero controlada por loading */}
          <img
            src={imageUrl}
            alt={document.titulo}
            className={`max-w-full max-h-full object-contain rounded-lg shadow-lg transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={(e) => {
              console.log(`✅ [IMAGE SUCCESS] Image loaded successfully for document ${document.id}`);
              console.log(`✅ [IMAGE SUCCESS] Image dimensions: ${(e.target as HTMLImageElement).naturalWidth}x${(e.target as HTMLImageElement).naturalHeight}`);
              console.log(`✅ [IMAGE SUCCESS] Image source: ${(e.target as HTMLImageElement).src}`);
              // Limpiar timeout si la imagen se carga exitosamente
              if (imageTimeout) {
                clearTimeout(imageTimeout);
                setImageTimeout(null);
              }
              setLoading(false);
              setError(null);
            }}
            onError={(e) => {
              console.error(`❌ [IMAGE ERROR] Error loading image for document ${document.id}:`, e);
              console.error(`❌ [IMAGE ERROR] Failed URL: ${imageUrl}`);
              console.error(`❌ [IMAGE ERROR] Event target:`, e.target);
              console.error(`❌ [IMAGE ERROR] Natural width: ${(e.target as HTMLImageElement)?.naturalWidth}`);
              console.error(`❌ [IMAGE ERROR] Natural height: ${(e.target as HTMLImageElement)?.naturalHeight}`);
              // Limpiar timeout si hay error real
              if (imageTimeout) {
                clearTimeout(imageTimeout);
                setImageTimeout(null);
              }
              setLoading(false);
              setError(`Error al cargar la imagen desde: ${imageUrl.split('/').pop()}`);
            }}
          />
        </div>
      </div>
    );
  };

  // Renderizar viewer de PDF
  const renderPDFViewer = () => {
    const pdfUrl = `${getFileUrl(document)}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH`;
    console.log(`Rendering PDF viewer for document ${document.id}`);
    console.log(`PDF URL: ${pdfUrl}`);
    
    return (
      <div className="h-full bg-gray-50 rounded-lg">
        <iframe
          src={pdfUrl}
          className="w-full h-full rounded-lg"
          title={document.titulo}
          onLoad={() => {
            console.log(`PDF iframe loaded for document ${document.id}`);
            setLoading(false);
          }}
          onError={() => {
            console.log(`PDF iframe error for document ${document.id}`);
            setLoading(false);
            setError('Error al cargar el PDF');
          }}
        />
      </div>
    );
  };

  // Estado para contenido de texto
  const [textContent, setTextContent] = useState<string>('');

  // Cargar contenido de texto cuando el documento es de tipo texto
  useEffect(() => {
    if (getViewerType(document.tipo_mime) === 'text') {
      const loadTextContent = async () => {
        try {
          // En implementación real, hacer fetch al archivo
          setTextContent('Contenido del archivo de texto...\n\nEste es un preview simulado.');
          setLoading(false);
        } catch (error) {
          setError('Error al cargar el contenido del archivo');
          setLoading(false);
        }
      };

      loadTextContent();
    }
  }, [document]);

  // Renderizar viewer de texto
  const renderTextViewer = () => (
    <div className="h-full bg-white rounded-lg border">
      <pre className="p-6 text-sm text-gray-800 overflow-auto h-full font-mono">
        {textContent}
      </pre>
    </div>
  );

  // Renderizar vista de descarga para archivos no visualizables
  const renderDownloadViewer = () => {
    // Obtener icono según tipo MIME
    const getFileIcon = (mimeType: string): string => {
      if (mimeType.includes('pdf')) return '📄';
      if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
      if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
      if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📈';
      if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
      if (mimeType.includes('video')) return '🎥';
      if (mimeType.includes('audio')) return '🎵';
      return '📎';
    };

    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-lg">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-6">
            {getFileIcon(document.tipo_mime)}
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {document.titulo}
          </h3>
          
          <p className="text-gray-600 mb-4">
            Este tipo de archivo no se puede previsualizar en el navegador.
          </p>
          
          <div className="text-sm text-gray-500 mb-6 space-y-1">
            <p><strong>Tipo:</strong> {document.tipo_mime}</p>
            <p><strong>Tamaño:</strong> {formatFileSize(document.tamaño_archivo)}</p>
            <p><strong>Nombre del archivo:</strong> {document.nombre_archivo}</p>
          </div>
          
          {onDownload && (
            <button
              onClick={() => onDownload(document)}
              className="px-6 py-3 bg-[#2e3954] text-white rounded-lg hover:bg-[#1e2633] transition-colors flex items-center space-x-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Descargar archivo</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const viewerType = getViewerType(document.tipo_mime);

  useEffect(() => {
    console.log(`📋 [USEEFFECT] DocumentViewer useEffect ejecutado para documento ${document.id}, tipo: ${viewerType}`);
    console.log(`📋 [USEEFFECT] Estado inicial - loading: ${loading}, error: ${error}`);
    
    // Siempre reiniciar estados al cambiar de documento
    setLoading(true);
    setError(null);
    
    console.log(`📋 [USEEFFECT] Estados después de reset - loading: true, error: null`);
    
    // Auto-detectar cuando no es PDF ni imagen para cargar inmediatamente la vista de descarga
    if (viewerType === 'download') {
      console.log(`📄 [DOWNLOAD] Documento de descarga directa - estableciendo loading: false`);
      setLoading(false);
      return;
    }

    // Para PDFs, establecer un timeout automático de 3 segundos
    // ya que los iframes de PDF no siempre disparan onLoad correctamente
    if (viewerType === 'pdf') {
      console.log(`📄 [PDF] Configurando timeout para PDF documento ${document.id}`);
      const pdfTimeout = setTimeout(() => {
        console.log(`📄 [PDF] PDF timeout reached for document ${document.id}, assuming loaded`);
        setLoading(false);
      }, 3000); // 3 segundos timeout

      // Cleanup del timeout si el componente se desmonta o cambia
      return () => {
        console.log(`🧹 [PDF] Cleaning up PDF timeout for document ${document.id}`);
        clearTimeout(pdfTimeout);
      };
    }
    
    // Para imágenes, NO establecer timeout automático - dejar que onLoad/onError manejen el estado
    if (viewerType === 'image') {
      console.log(`🖼️ [IMAGE] Image viewer setup for document ${document.id} - NO TIMEOUT - manteniendo loading: true`);
      // Para imágenes, mantenemos loading: true hasta que onLoad o onError cambien el estado
      
      // Solo limpieza al desmontar
      return () => {
        console.log(`🧹 [IMAGE] Cleaning up image viewer for document ${document.id}`);
        if (imageTimeout) {
          clearTimeout(imageTimeout);
          setImageTimeout(null);
        }
      };
    }
  }, [document.id, viewerType]); // Usar document.id en lugar de document completo

  // Mostrar spinner de carga
  if (loading && viewerType !== 'download') {
    return (
      <div className="h-full flex flex-col">
        {/* Información del documento */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{document.titulo}</h2>
              {document.descripcion && (
                <p className="text-gray-600 mb-3">{document.descripcion}</p>
              )}
              
              {/* Metadatos */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span><strong>Autor:</strong> {document.autor}</span>
                <span><strong>Tamaño:</strong> {formatFileSize(document.tamaño_archivo)}</span>
                <span><strong>Descargas:</strong> {document.descargas}</span>
                <span><strong>Subido:</strong> {formatDate(document.created_at)}</span>
              </div>
            </div>
            
            {/* Etiquetas y categoría */}
            <div className="flex flex-col items-end gap-2">
              {document.categoria && (
                <span 
                  className="px-3 py-1 text-sm font-medium rounded-full text-white"
                  style={{ backgroundColor: document.categoria.color }}
                >
                  {document.categoria.icono} {document.categoria.nombre}
                </span>
              )}
              
              {document.etiquetas && document.etiquetas.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {document.etiquetas.map(etiqueta => (
                    <span
                      key={etiqueta.id}
                      className="px-2 py-1 text-xs rounded-full"
                      style={{ 
                        backgroundColor: etiqueta.color + '20',
                        color: etiqueta.color 
                      }}
                    >
                      {etiqueta.nombre}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vista de carga */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2e3954] mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando documento...</p>
              <p className="text-gray-500 text-sm mt-2">Tipo: {document.tipo_mime}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar error si hay alguno
  if (error) {
    return (
      <div className="h-full flex flex-col">
        {/* Información del documento */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{document.titulo}</h2>
              {document.descripcion && (
                <p className="text-gray-600 mb-3">{document.descripcion}</p>
              )}
              
              {/* Metadatos */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span><strong>Autor:</strong> {document.autor}</span>
                <span><strong>Tamaño:</strong> {formatFileSize(document.tamaño_archivo)}</span>
                <span><strong>Descargas:</strong> {document.descargas}</span>
                <span><strong>Subido:</strong> {formatDate(document.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vista de error */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center max-w-md">
              <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar documento</h3>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <p className="text-xs text-gray-500 mb-4">
                Archivo: {document.nombre_archivo}<br/>
                Tipo: {document.tipo_mime}
              </p>
              {onDownload && (
                <button
                  onClick={() => onDownload(document)}
                  className="px-4 py-2 bg-[#2e3954] text-white rounded-lg hover:bg-[#1e2633] transition-colors flex items-center space-x-2 mx-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Descargar archivo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Información del documento */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{document.titulo}</h2>
            {document.descripcion && (
              <p className="text-gray-600 mb-3">{document.descripcion}</p>
            )}
            
            {/* Metadatos */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span><strong>Autor:</strong> {document.autor}</span>
              <span><strong>Tamaño:</strong> {formatFileSize(document.tamaño_archivo)}</span>
              <span><strong>Descargas:</strong> {document.descargas}</span>
              <span><strong>Subido:</strong> {formatDate(document.created_at)}</span>
            </div>
          </div>
          
          {/* Etiquetas y categoría */}
          <div className="flex flex-col items-end gap-2">
            {document.categoria && (
              <span 
                className="px-3 py-1 text-sm font-medium rounded-full text-white"
                style={{ backgroundColor: document.categoria.color }}
              >
                {document.categoria.icono} {document.categoria.nombre}
              </span>
            )}
            
            {document.etiquetas && document.etiquetas.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-end">
                {document.etiquetas.map((tag) => (
                  <span 
                    key={tag.id}
                    className="px-2 py-1 text-xs rounded text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.nombre}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Área de visualización */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2e3954] mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando documento...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar el documento</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              {onDownload && (
                <button
                  onClick={() => onDownload(document)}
                  className="px-4 py-2 bg-[#2e3954] text-white rounded-md hover:bg-[#1e2633] transition-colors"
                >
                  Descargar archivo
                </button>
              )}
            </div>
          </div>
        )}

        {/* Renderizar el contenido según el tipo, controlando loading dentro de cada render */}
        {viewerType === 'image' && renderImageViewer()}
        {viewerType === 'pdf' && renderPDFViewer()}
        {viewerType === 'text' && renderTextViewer()}
        {viewerType === 'download' && renderDownloadViewer()}
      </div>
    </div>
  );
} 