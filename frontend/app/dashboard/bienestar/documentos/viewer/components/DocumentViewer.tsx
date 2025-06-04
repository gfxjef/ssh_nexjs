'use client';

import React, { useState, useEffect } from 'react';
import { Document } from '../../types';
import { useDocumentCache } from '../../hooks/useDocumentCache';

interface DocumentViewerProps {
  document: Document;
  onDownload?: (document: Document) => void;
}

/**
 * Componente para visualizar documentos con preview simple de PDFs e imágenes únicamente
 */
export default function DocumentViewer({ document, onDownload }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Usar el hook de cache
  const { 
    getFileUrl, 
    getViewerType, 
    shouldShowPreview,
    isLoading: isCacheLoading 
  } = useDocumentCache();

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

  // Renderizar preview de imagen SÚPER SIMPLE
  const renderImageViewer = () => {
    const imageUrl = getFileUrl(document);
    console.log(`🖼️ [SIMPLE IMAGE] Showing image for document ${document.id}`);
    
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
        {/* Mostrar spinner mientras carga */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2e3954] mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando imagen...</p>
            </div>
          </div>
        )}
        
        {/* Mostrar error si existe */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
            <div className="text-center text-red-600">
              <p className="text-lg">❌ Error al cargar imagen</p>
              <p className="text-sm mt-2">{error}</p>
            </div>
          </div>
        )}
        
        {/* IMAGEN SIMPLE - Sin controles, sin zoom, solo la imagen */}
        <img
          src={imageUrl}
          alt={document.titulo}
          className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
            loading ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ 
            maxWidth: '95%', 
            maxHeight: '95%',
            objectFit: 'contain'
          }}
          onLoad={() => {
            console.log(`✅ [SIMPLE IMAGE] Image loaded successfully: ${document.id}`);
            setLoading(false);
            setError(null);
          }}
          onError={() => {
            console.error(`❌ [SIMPLE IMAGE] Error loading image: ${document.id}`);
            setLoading(false);
            setError('No se pudo cargar la imagen');
          }}
        />
      </div>
    );
  };

  // Renderizar viewer de PDF SIMPLE
  const renderPDFViewer = () => {
    const pdfUrl = `${getFileUrl(document)}#toolbar=0&navpanes=0&scrollbar=1&page=1&view=FitH`;
    console.log(`📄 [SIMPLE PDF] Showing PDF for document ${document.id}`);
    
    return (
      <div className="w-full h-full bg-gray-50 rounded-lg relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2e3954] mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando PDF...</p>
            </div>
          </div>
        )}
        
        {/* PDF SIMPLE - Sin toolbar, sin navegación lateral */}
        <iframe
          src={pdfUrl}
          className="w-full h-full rounded-lg border-none"
          title={document.titulo}
          frameBorder="0"
          onLoad={() => {
            console.log(`✅ [SIMPLE PDF] PDF loaded successfully: ${document.id}`);
            setLoading(false);
          }}
          onError={() => {
            console.log(`❌ [SIMPLE PDF] PDF error: ${document.id}`);
            setLoading(false);
            setError('Error al cargar el PDF');
          }}
        />
      </div>
    );
  };

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
            Este archivo no se puede previsualizar
          </p>
          
          <div className="text-sm text-gray-500 mb-6">
            <p><strong>Tipo:</strong> {document.tipo_mime}</p>
            <p><strong>Tamaño:</strong> {formatFileSize(document.tamaño_archivo)}</p>
          </div>
          
          {onDownload && (
            <button
              onClick={() => onDownload(document)}
              className="px-6 py-3 bg-[#2e3954] text-white rounded-lg hover:bg-[#1e2633] transition-colors flex items-center space-x-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Descargar</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const viewerType = getViewerType(document);

  useEffect(() => {
    console.log(`📋 [SIMPLE VIEWER] Loading document ${document.id}, type: ${viewerType}`);
    
    // Reiniciar estados
    setLoading(true);
    setError(null);
    
    // Para archivos de descarga directa, no mostrar loading
    if (viewerType === 'download') {
      setLoading(false);
      return;
    }

    // Para PDFs, timeout de 3 segundos
    if (viewerType === 'pdf') {
      const timeout = setTimeout(() => {
        console.log(`📄 [SIMPLE PDF] Timeout reached, assuming loaded: ${document.id}`);
        setLoading(false);
      }, 3000);

      return () => clearTimeout(timeout);
    }
    
    // Para imágenes, loading controlado por onLoad/onError
  }, [document.id, viewerType]);

  return (
    <div className="h-full flex flex-col">
      {/* Header simple con información mínima */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{document.titulo}</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
              <span>Tipo: {viewerType.toUpperCase()}</span>
              <span>Tamaño: {formatFileSize(document.tamaño_archivo)}</span>
              {document.autor && <span>Autor: {document.autor}</span>}
            </div>
          </div>
          
          {/* Solo botón de descarga */}
          {onDownload && (
            <button
              onClick={() => onDownload(document)}
              className="px-4 py-2 bg-[#2e3954] text-white rounded-md hover:bg-[#1e2633] transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Descargar</span>
            </button>
          )}
        </div>
      </div>

      {/* Área de visualización SIMPLE */}
      <div className="flex-1 relative">
        {/* Renderizar según el tipo - SÚPER SIMPLE */}
        {viewerType === 'image' && renderImageViewer()}
        {viewerType === 'pdf' && renderPDFViewer()}
        {viewerType === 'download' && renderDownloadViewer()}
      </div>
    </div>
  );
} 