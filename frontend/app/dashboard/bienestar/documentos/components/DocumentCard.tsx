'use client';

import React from 'react';
import { Document } from '../types';
import { useDocumentCache } from '../hooks/useDocumentCache';

interface DocumentCardProps {
  document: Document;
  view?: 'grid' | 'list';
  onView?: (document: Document) => void;
  onDownload?: (document: Document) => void;
  onEdit?: (document: Document) => void;
  onDelete?: (document: Document) => void;
  showActions?: boolean;
  isDownloading?: boolean;
}

/**
 * Componente para mostrar tarjetas de documentos con diseño moderno y minimalista
 */
export default function DocumentCard({ 
  document, 
  view = 'grid',
  onView,
  onDownload,
  onEdit,
  onDelete,
  showActions = true,
  isDownloading = false
}: DocumentCardProps) {
  
  // Usar el hook de cache
  const { 
    getViewerType, 
    shouldShowPreview,
    isLoading: isCacheLoading 
  } = useDocumentCache();

  // Función para formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Función para formatear fecha
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Obtener información del tipo de visor
  const viewerType = getViewerType(document);
  const canPreview = shouldShowPreview(document);
  
  // Función para obtener la extensión del archivo
  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toUpperCase() || 'FILE';
  };

  // Función para obtener color según tipo de archivo
  const getFileTypeColor = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return 'bg-red-100 text-red-700 border-red-200';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'bg-green-100 text-green-700 border-green-200';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (mimeType.includes('image')) return 'bg-purple-100 text-purple-700 border-purple-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // Vista de lista mejorada
  if (view === 'list') {
    return (
      <div className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-gray-300 transition-all duration-200">
        <div className="flex items-center justify-between">
          {/* Información principal del documento */}
          <div className="flex items-center space-x-4 min-w-0 flex-1">
            {/* Indicador de tipo de archivo */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-lg border-2 flex items-center justify-center ${getFileTypeColor(document.tipo_mime)}`}>
              <span className="text-sm font-bold">
                {getFileExtension(document.nombre_archivo)}
              </span>
            </div>
            
            {/* Contenido del documento */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="text-base font-semibold text-gray-900 truncate">
                  {document.titulo}
                </h3>
                <div className="flex items-center space-x-2">
                  {/* Grupo empresarial */}
                  {document.grupo && (
                    <span className="flex-shrink-0 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
                      </svg>
                      {document.grupo.replace('_', ' ').toUpperCase()}
                    </span>
                  )}
                  
                  {/* Categoría */}
                  <span className="flex-shrink-0 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
                      <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
                    </svg>
                    {document.categoria_nombre || document.categoria?.nombre || `Cat. ${document.categoria_id}`}
                  </span>
                </div>
              </div>
              
              {document.descripcion && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                  {document.descripcion}
                </p>
              )}
              
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {formatFileSize(document.tamaño_archivo)}
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  {document.descargas} descargas
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-9 4h12a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1v-8a1 1 0 011-1z" />
                  </svg>
                  {formatDate(document.created_at)}
                </span>
                {document.categoria && (
                  <span 
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: document.categoria.color }}
                  >
                    {document.categoria.nombre}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Acciones */}
          {showActions && (
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {onView && (
                <button
                  onClick={() => onView(document)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    canPreview 
                      ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' 
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                  }`}
                  title={canPreview ? "Ver documento" : "Descargar archivo"}
                >
                  {canPreview ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  <span>{canPreview ? 'Ver' : 'Descargar'}</span>
                </button>
              )}
              
              {onDownload && (
                <button
                  onClick={() => onDownload(document)}
                  disabled={isDownloading}
                  className={`p-2 rounded-lg transition-colors ${
                    isDownloading 
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200' 
                      : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                  title={isDownloading ? "Descargando..." : "Descargar"}
                >
                  {isDownloading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </button>
              )}
              
              {onEdit && (
                <button
                  onClick={() => onEdit(document)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                  title="Editar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              
              {onDelete && (
                <button
                  onClick={() => onDelete(document)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                  title="Eliminar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista de tarjeta (grid) mejorada
  return (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-gray-300 transition-all duration-300">
      <div className="p-6">
        {/* Header con tipo de archivo y estado */}
        <div className="flex items-start justify-between mb-4">
          <div className={`inline-flex items-center px-3 py-2 rounded-lg border-2 ${getFileTypeColor(document.tipo_mime)}`}>
            <span className="text-sm font-bold">
              {getFileExtension(document.nombre_archivo)}
            </span>
          </div>
          
          <div className="flex flex-col items-end space-y-1">
            {/* Grupo empresarial */}
            {document.grupo && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
                </svg>
                {document.grupo.replace('_', ' ').toUpperCase()}
              </span>
            )}
            
            {/* Categoría */}
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
                <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
              </svg>
              {document.categoria_nombre || document.categoria?.nombre || `Cat. ${document.categoria_id}`}
            </span>
          </div>
        </div>
        
        {/* Título y descripción */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
          {document.titulo}
        </h3>
        
        {document.descripcion && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-3 leading-relaxed">
            {document.descripcion}
          </p>
        )}
        
        {/* Metadatos */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center text-xs text-gray-500">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{formatFileSize(document.tamaño_archivo)}</span>
            <span className="mx-2">•</span>
            <span>{document.descargas} descargas</span>
          </div>
          
          <div className="flex items-center text-xs text-gray-500">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-9 4h12a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1v-8a1 1 0 011-1z" />
            </svg>
            <span>{formatDate(document.created_at)}</span>
          </div>
          
          {document.categoria && (
            <div className="flex items-center">
              <span 
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: document.categoria.color }}
              >
                {document.categoria.nombre}
              </span>
            </div>
          )}
        </div>
        
        {/* Acciones */}
        {showActions && (
          <div className="space-y-2">
            {onView && (
              <button
                onClick={() => onView(document)}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  canPreview 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {canPreview ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                <span>{canPreview ? 'Ver Documento' : 'Descargar'}</span>
              </button>
            )}
            
            <div className="flex space-x-2">
              {onDownload && (
                <button
                  onClick={() => onDownload(document)}
                  disabled={isDownloading}
                  className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDownloading 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isDownloading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  <span>Descargar</span>
                </button>
              )}
              
              {(onEdit || onDelete) && (
                <div className="flex space-x-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(document)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  
                  {onDelete && (
                    <button
                      onClick={() => onDelete(document)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 