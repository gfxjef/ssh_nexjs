'use client';

import React from 'react';
import { Category } from '../../lib/bienestar/types';

interface CategoryBadgeProps {
  category: Category | string;
  color?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Componente para mostrar una categoría como badge
 */
export default function CategoryBadge({ category, color, onClick, className = '' }: CategoryBadgeProps) {
  // Si es un string, mostrar directamente
  if (typeof category === 'string') {
    return (
      <span 
        className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${className}`}
        style={{ backgroundColor: color || '#2e3954', color: '#ffffff' }}
        onClick={onClick}
      >
        {category}
      </span>
    );
  }
  
  // Si es un objeto Category, usar sus propiedades
  return (
    <span 
      className={`inline-block px-3 py-1 text-xs font-medium rounded-full cursor-pointer ${className}`}
      style={{ backgroundColor: category.color, color: '#ffffff' }}
      onClick={onClick}
    >
      {category.nombre}
    </span>
  );
} 