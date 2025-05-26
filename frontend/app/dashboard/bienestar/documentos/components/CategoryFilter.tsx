'use client';

import React from 'react';
import { DocumentCategory } from '../types';

interface CategoryFilterProps {
  categories: DocumentCategory[];
  selectedCategory?: string | number;
  onCategoryChange: (category: string | number) => void;
  showCount?: boolean;
  documentCounts?: Record<number, number>;
}

/**
 * Componente para filtrar documentos por categoría
 */
export default function CategoryFilter({ 
  categories, 
  selectedCategory,
  onCategoryChange,
  showCount = false,
  documentCounts = {}
}: CategoryFilterProps) {
  
  const isSelected = (categoryId: string | number) => {
    if (selectedCategory === 'todas' && categoryId === 'todas') return true;
    return selectedCategory === categoryId;
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Botón "Todas" */}
      <button
        onClick={() => onCategoryChange('todas')}
        className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
          isSelected('todas')
            ? 'bg-[#2e3954] text-white shadow-md' 
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        Todas
        {showCount && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-white bg-opacity-20 rounded-full">
            {Object.values(documentCounts).reduce((sum, count) => sum + count, 0)}
          </span>
        )}
      </button>
      
      {/* Botones de categorías */}
      {categories.map(category => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center space-x-2 ${
            isSelected(category.id)
              ? 'text-white shadow-md' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          style={{
            backgroundColor: isSelected(category.id) ? category.color : undefined
          }}
        >
          {/* Icono de la categoría */}
          {category.icono && (
            <span className="text-sm">{category.icono}</span>
          )}
          
          <span>{category.nombre}</span>
          
          {/* Contador de documentos */}
          {showCount && documentCounts[category.id] !== undefined && (
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
              isSelected(category.id)
                ? 'bg-white bg-opacity-20'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {documentCounts[category.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
} 