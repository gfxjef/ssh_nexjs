'use client';

import React, { useState } from 'react';
import { Document, DocumentCategory, DocumentTag } from '../../types';

interface DocumentSidebarProps {
  documents: Document[];
  categories: DocumentCategory[];
  tags: DocumentTag[];
  currentDocument: Document | null;
  onDocumentSelect: (document: Document) => void;
  onClose: () => void;
}

/**
 * Componente sidebar para navegación entre documentos en el viewer
 */
export default function DocumentSidebar({
  documents,
  categories,
  tags,
  currentDocument,
  onDocumentSelect,
  onClose
}: DocumentSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | number>('todas');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  // Función para formatear el tamaño del archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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

  // Filtrar documentos
  const filteredDocuments = documents.filter(doc => {
    // Filtro de búsqueda
    if (searchTerm && !doc.titulo.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filtro de categoría
    if (selectedCategory !== 'todas' && doc.categoria_id !== selectedCategory) {
      return false;
    }
    
    // Filtro de etiquetas
    if (selectedTags.length > 0) {
      const hasMatchingTag = doc.etiquetas.some(tag => selectedTags.includes(tag.id));
      if (!hasMatchingTag) return false;
    }
    
    return true;
  });

  // Manejar cambio de categoría
  const handleCategoryChange = (categoryId: string | number) => {
    setSelectedCategory(categoryId);
  };

  // Manejar toggle de etiqueta
  const handleTagToggle = (tagId: number) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header del sidebar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Documentos</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Cerrar panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Búsqueda */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 pl-9 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Filtros de categoría */}
        <div className="mb-4">
          <h3 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Categorías</h3>
          <div className="space-y-1">
            <button
              onClick={() => handleCategoryChange('todas')}
              className={`w-full text-left px-2 py-1 text-sm rounded ${
                selectedCategory === 'todas'
                  ? 'bg-[#2e3954] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Todas las categorías
            </button>
            
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`w-full text-left px-2 py-1 text-sm rounded flex items-center space-x-2 ${
                  selectedCategory === category.id
                    ? 'bg-[#2e3954] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{category.icono}</span>
                <span>{category.nombre}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filtros de etiquetas */}
        <div>
          <h3 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Etiquetas</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => handleTagToggle(tag.id)}
                className={`w-full text-left px-2 py-1 text-sm rounded flex items-center space-x-2 ${
                  selectedTags.includes(tag.id)
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className={`w-3 h-3 border-2 rounded flex items-center justify-center ${
                  selectedTags.includes(tag.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}>
                  {selectedTags.includes(tag.id) && (
                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span
                  className="px-2 py-0.5 text-xs rounded text-white flex-1"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.nombre}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de documentos */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="text-xs text-gray-500 px-2 py-1 mb-2">
            {filteredDocuments.length} documento(s)
          </div>
          
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-500">No hay documentos</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredDocuments.map(document => (
                <button
                  key={document.id}
                  onClick={() => onDocumentSelect(document)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    currentDocument?.id === document.id
                      ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Icono del archivo */}
                    <div className="flex-shrink-0 text-lg">
                      {getFileIcon(document.tipo_mime)}
                    </div>
                    
                    {/* Información del documento */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                        {document.titulo}
                      </h4>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>{formatFileSize(document.tamaño_archivo)}</span>
                          <span>{document.descargas} descargas</span>
                        </div>
                        
                        {document.categoria && (
                          <div className="flex items-center space-x-1">
                            <span>{document.categoria.icono}</span>
                            <span>{document.categoria.nombre}</span>
                          </div>
                        )}
                        
                        {document.etiquetas && document.etiquetas.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {document.etiquetas.slice(0, 2).map(tag => (
                              <span
                                key={tag.id}
                                className="px-1 py-0.5 text-xs rounded text-white"
                                style={{ backgroundColor: tag.color }}
                              >
                                {tag.nombre}
                              </span>
                            ))}
                            {document.etiquetas.length > 2 && (
                              <span className="px-1 py-0.5 text-xs rounded bg-gray-200 text-gray-600">
                                +{document.etiquetas.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 