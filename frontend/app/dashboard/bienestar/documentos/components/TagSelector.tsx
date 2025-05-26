'use client';

import React, { useState } from 'react';
import { DocumentTag } from '../types';

interface TagSelectorProps {
  tags: DocumentTag[];
  selectedTags?: number[];
  onTagsChange: (tags: number[]) => void;
  maxTags?: number;
  placeholder?: string;
  showCount?: boolean;
  documentCounts?: Record<number, number>;
}

/**
 * Componente para seleccionar etiquetas de documentos
 */
export default function TagSelector({ 
  tags, 
  selectedTags = [],
  onTagsChange,
  maxTags = 5,
  placeholder = "Filtrar por etiquetas...",
  showCount = false,
  documentCounts = {}
}: TagSelectorProps) {
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar etiquetas por término de búsqueda
  const filteredTags = tags.filter(tag =>
    tag.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Obtener etiquetas seleccionadas
  const selectedTagObjects = tags.filter(tag => selectedTags.includes(tag.id));

  // Manejar selección de etiqueta
  const handleTagToggle = (tagId: number) => {
    if (selectedTags.includes(tagId)) {
      // Remover etiqueta
      onTagsChange(selectedTags.filter(id => id !== tagId));
    } else {
      // Agregar etiqueta (respetando el límite máximo)
      if (selectedTags.length < maxTags) {
        onTagsChange([...selectedTags, tagId]);
      }
    }
  };

  // Limpiar todas las etiquetas
  const clearAllTags = () => {
    onTagsChange([]);
  };

  return (
    <div className="relative">
      {/* Campo de entrada */}
      <div className="relative">
        <div 
          className="min-h-[42px] w-full px-4 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer focus-within:ring-2 focus-within:ring-[#2e3954] focus-within:border-transparent"
          onClick={() => setIsOpen(!isOpen)}
        >
          {/* Etiquetas seleccionadas */}
          <div className="flex flex-wrap gap-1 items-center">
            {selectedTagObjects.map(tag => (
              <span
                key={tag.id}
                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.nombre}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTagToggle(tag.id);
                  }}
                  className="ml-1 text-white hover:text-gray-200"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
            
            {/* Placeholder cuando no hay etiquetas seleccionadas */}
            {selectedTags.length === 0 && (
              <span className="text-gray-500 text-sm">{placeholder}</span>
            )}
          </div>
        </div>
        
        {/* Botón de dropdown */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {/* Botón limpiar */}
          {selectedTags.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAllTags();
              }}
              className="text-gray-400 hover:text-gray-600"
              title="Limpiar etiquetas"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          
          {/* Icono de dropdown */}
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      
      {/* Dropdown de etiquetas */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* Campo de búsqueda */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Buscar etiquetas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent"
            />
          </div>
          
          {/* Lista de etiquetas */}
          <div className="max-h-60 overflow-y-auto">
            {filteredTags.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                No se encontraron etiquetas
              </div>
            ) : (
              <div className="p-2">
                {filteredTags.map(tag => {
                  const isSelected = selectedTags.includes(tag.id);
                  const isDisabled = !isSelected && selectedTags.length >= maxTags;
                  
                  return (
                    <div
                      key={tag.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        isDisabled 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-gray-50'
                      } ${isSelected ? 'bg-blue-50' : ''}`}
                      onClick={() => !isDisabled && handleTagToggle(tag.id)}
                    >
                      <div className="flex items-center space-x-3">
                        {/* Checkbox */}
                        <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        
                        {/* Etiqueta */}
                        <div className="flex items-center space-x-2">
                          <span
                            className="px-2 py-1 text-xs font-medium rounded text-white"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.nombre}
                          </span>
                          {tag.descripcion && (
                            <span className="text-xs text-gray-500">
                              {tag.descripcion}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Contador de documentos */}
                      {showCount && documentCounts[tag.id] !== undefined && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {documentCounts[tag.id]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Footer con información */}
          <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
            {selectedTags.length > 0 && (
              <div>
                {selectedTags.length} de {maxTags} etiquetas seleccionadas
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Overlay para cerrar dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[5]" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
} 