'use client';

import React from 'react';
import { Document } from '../types';

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
 * Componente para mostrar tarjetas de documentos
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
      month: 'short',
      year: 'numeric'
    });
  };

  // Función para obtener icono según tipo MIME
  const getFileIcon = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📈';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
    return '📎';
  };

  if (view === 'list') {
    return (
      <div className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
        <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-2xl">{getFileIcon(document.tipo_mime)}</span>
        </div>
        
        <div className="ml-4 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {document.titulo}
            </h3>
            <div className="flex items-center space-x-2">
              {document.categoria && (
                <span 
                  className="px-2 py-1 text-xs font-medium rounded-full text-white"
                  style={{ backgroundColor: document.categoria.color }}
                >
                  {document.categoria.nombre}
                </span>
              )}
            </div>
          </div>
          
          {document.descripcion && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">
              {document.descripcion}
            </p>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>{formatFileSize(document.tamaño_archivo)}</span>
              <span>{document.descargas} descargas</span>
              <span>{formatDate(document.created_at)}</span>
            </div>
            
            {showActions && (
              <div className="flex items-center space-x-2">
                {onView && (
                  <button
                    onClick={() => onView(document)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                    title="Visualizar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                )}
                {onDownload && (
                  <button
                    onClick={() => onDownload(document)}
                    disabled={isDownloading}
                    className={`p-2 rounded-md transition-colors ${
                      isDownloading 
                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                        : 'text-blue-600 hover:bg-blue-50'
                    }`}
                    title={isDownloading ? "Descargando..." : "Descargar"}
                  >
                    {isDownloading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
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
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
      </div>
    );
  }

  // Vista de tarjeta (grid)
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">{getFileIcon(document.tipo_mime)}</span>
          </div>
          
          {document.categoria && (
            <span 
              className="px-2 py-1 text-xs font-medium rounded-full text-white"
              style={{ backgroundColor: document.categoria.color }}
            >
              {document.categoria.nombre}
            </span>
          )}
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {document.titulo}
        </h3>
        
        {document.descripcion && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-3">
            {document.descripcion}
          </p>
        )}
        
        {/* Etiquetas */}
        {document.etiquetas && document.etiquetas.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {document.etiquetas.slice(0, 3).map((tag) => (
              <span 
                key={tag.id}
                className="px-2 py-1 text-xs rounded text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.nombre}
              </span>
            ))}
            {document.etiquetas.length > 3 && (
              <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-600">
                +{document.etiquetas.length - 3}
              </span>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <span>{formatFileSize(document.tamaño_archivo)}</span>
          <span>{document.descargas} descargas</span>
        </div>
        
        <div className="text-xs text-gray-400 mb-4">
          Subido el {formatDate(document.created_at)}
        </div>
        
        {showActions && (
          <div className="flex flex-col space-y-3 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              {onView && (
                <button
                  onClick={() => onView(document)}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Ver</span>
                </button>
              )}
              {onDownload && (
                <button
                  onClick={() => onDownload(document)}
                  disabled={isDownloading}
                  className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    isDownloading 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Descargando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Descargar</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="flex items-center justify-center space-x-1">
              {onEdit && (
                <button
                  onClick={() => onEdit(document)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
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
                  className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                  title="Eliminar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 