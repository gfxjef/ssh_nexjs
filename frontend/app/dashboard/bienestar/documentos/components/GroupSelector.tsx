'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DocumentGroup } from '../types';
import { ChevronDownIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface GroupSelectorProps {
  selectedGroup?: 'kossodo' | 'kossomet' | 'grupo_kossodo';
  onGroupChange: (group: 'kossodo' | 'kossomet' | 'grupo_kossodo') => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  showCounts?: boolean;
  groupCounts?: Record<string, number>;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Componente reutilizable para selección de grupos empresariales
 * Incluye dropdown con iconos distintivos y colores corporativos
 */
export default function GroupSelector({
  selectedGroup,
  onGroupChange,
  required = false,
  disabled = false,
  placeholder = 'Seleccionar grupo empresarial',
  showCounts = false,
  groupCounts = {},
  className = '',
  size = 'md'
}: GroupSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Definición de grupos empresariales
  const groups: DocumentGroup[] = [
    {
      id: 'kossodo',
      nombre: 'Kossodo',
      icono: '🏢',
      color: '#2563EB',
      descripcion: 'Empresa principal del grupo'
    },
    {
      id: 'kossomet',
      nombre: 'Kossomet',
      icono: '🏭',
      color: '#059669',
      descripcion: 'División metalúrgica'
    },
    {
      id: 'grupo_kossodo',
      nombre: 'Grupo Kossodo',
      icono: '🏛️',
      color: '#6B7280',
      descripcion: 'Corporativo del grupo'
    }
  ];

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedGroupData = groups.find(group => group.id === selectedGroup);

  // Clases CSS basadas en el tamaño
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base'
  };

  const handleGroupSelect = (groupId: 'kossodo' | 'kossomet' | 'grupo_kossodo') => {
    onGroupChange(groupId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Botón principal del selector */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between border rounded-lg transition-all
          ${sizeClasses[size]}
          ${disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-white text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          }
          ${selectedGroupData 
            ? 'border-gray-300' 
            : required 
              ? 'border-red-300' 
              : 'border-gray-300'
          }
        `}
      >
        <div className="flex items-center space-x-3">
          {selectedGroupData ? (
            <>
              {/* Icono del grupo seleccionado */}
              <span 
                className="flex items-center justify-center w-6 h-6 rounded text-white text-sm font-medium"
                style={{ backgroundColor: selectedGroupData.color }}
              >
                {selectedGroupData.icono}
              </span>
              
              <div className="flex flex-col items-start">
                <span className="font-medium">{selectedGroupData.nombre}</span>
                <span className="text-xs text-gray-500">{selectedGroupData.descripcion}</span>
              </div>
              
              {/* Contador de documentos */}
              {showCounts && groupCounts[selectedGroupData.id] !== undefined && (
                <span className="ml-auto px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {groupCounts[selectedGroupData.id]} docs
                </span>
              )}
            </>
          ) : (
            <>
              <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500">{placeholder}</span>
              {required && <span className="text-red-500 ml-1">*</span>}
            </>
          )}
        </div>
        
        {/* Icono de dropdown */}
        <ChevronDownIcon 
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`} 
        />
      </button>

      {/* Lista desplegable */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => handleGroupSelect(group.id)}
              className={`
                w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors
                ${selectedGroup === group.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''}
                ${size === 'sm' ? 'px-3 py-2' : size === 'lg' ? 'px-5 py-4' : 'px-4 py-3'}
              `}
            >
              {/* Icono del grupo */}
              <span 
                className="flex items-center justify-center w-8 h-8 rounded text-white text-sm font-medium"
                style={{ backgroundColor: group.color }}
              >
                {group.icono}
              </span>
              
              <div className="flex-1">
                <div className="font-medium text-gray-900">{group.nombre}</div>
                <div className="text-sm text-gray-500">{group.descripcion}</div>
              </div>
              
              {/* Contador de documentos */}
              {showCounts && groupCounts[group.id] !== undefined && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {groupCounts[group.id]}
                </span>
              )}
              
              {/* Indicador de selección */}
              {selectedGroup === group.id && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Mensaje de validación */}
      {required && !selectedGroup && (
        <p className="mt-1 text-sm text-red-600">
          Seleccionar un grupo empresarial es obligatorio
        </p>
      )}
    </div>
  );
} 