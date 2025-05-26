'use client';

import React, { useState, useEffect } from 'react';

interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  resultsCount: number;
  filters?: {
    categories?: number[];
    tags?: number[];
    fileTypes?: string[];
  };
}

interface SearchHistoryProps {
  onSelectHistory: (item: SearchHistoryItem) => void;
  maxItems?: number;
}

const STORAGE_KEY = 'documents_search_history';

export default function SearchHistory({ 
  onSelectHistory, 
  maxItems = 10 
}: SearchHistoryProps) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Cargar historial desde localStorage al montar
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        // Convertir timestamps de string a Date
        const historyWithDates = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setHistory(historyWithDates);
      }
    } catch (error) {
      console.error('Error cargando historial de búsqueda:', error);
    }
  }, []);

  // Función para guardar en localStorage
  const saveToStorage = (newHistory: SearchHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error guardando historial de búsqueda:', error);
    }
  };

  // Función para agregar nueva búsqueda al historial
  const addToHistory = (
    query: string, 
    resultsCount: number, 
    filters?: any
  ) => {
    if (!query.trim()) return;

    const newItem: SearchHistoryItem = {
      id: Date.now().toString(),
      query: query.trim(),
      timestamp: new Date(),
      resultsCount,
      filters: filters ? {
        categories: filters.categories?.length > 0 ? filters.categories : undefined,
        tags: filters.tags?.length > 0 ? filters.tags : undefined,
        fileTypes: filters.fileTypes?.length > 0 ? filters.fileTypes : undefined
      } : undefined
    };

    const newHistory = [
      newItem,
      ...history.filter(item => item.query !== newItem.query)
    ].slice(0, maxItems);

    setHistory(newHistory);
    saveToStorage(newHistory);
  };

  // Función para limpiar historial
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Función para eliminar elemento específico
  const removeItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    saveToStorage(newHistory);
  };

  // Formatear tiempo relativo
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString();
  };

  // Renderizar etiquetas de filtros
  const renderFilters = (filters?: SearchHistoryItem['filters']) => {
    if (!filters) return null;

    const filterCount = (filters.categories?.length || 0) + 
                       (filters.tags?.length || 0) + 
                       (filters.fileTypes?.length || 0);

    if (filterCount === 0) return null;

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 ml-2">
        {filterCount} filtro{filterCount !== 1 ? 's' : ''}
      </span>
    );
  };

  // Nota: Para exponer addToHistory, usar useSearchHistory hook en su lugar

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Botón para mostrar/ocultar historial */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
        title="Ver historial de búsquedas"
      >
        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Historial ({history.length})
      </button>

      {/* Panel de historial */}
      {isVisible && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="p-3 border-b border-gray-100 flex justify-between items-center">
            <h4 className="text-sm font-medium text-gray-900">Búsquedas recientes</h4>
            <button
              onClick={clearHistory}
              className="text-xs text-red-600 hover:text-red-800"
              title="Limpiar historial"
            >
              Limpiar todo
            </button>
          </div>

          <div className="py-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer"
                onClick={() => onSelectHistory(item)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900 truncate">
                      "{item.query}"
                    </span>
                    {renderFilters(item.filters)}
                  </div>
                  <div className="flex items-center mt-1 text-xs text-gray-500">
                    <span>{formatTimeAgo(item.timestamp)}</span>
                    <span className="mx-1">•</span>
                    <span>{item.resultsCount} resultado{item.resultsCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-gray-400 hover:text-red-600 transition-all"
                  title="Eliminar del historial"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook para usar el historial de búsqueda
export const useSearchHistory = (maxItems = 10) => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        const historyWithDates = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setHistory(historyWithDates);
      }
    } catch (error) {
      console.error('Error cargando historial de búsqueda:', error);
    }
  }, []);

  const addToHistory = (query: string, resultsCount: number, filters?: any) => {
    if (!query.trim()) return;

    const newItem: SearchHistoryItem = {
      id: Date.now().toString(),
      query: query.trim(),
      timestamp: new Date(),
      resultsCount,
      filters: filters ? {
        categories: filters.categories?.length > 0 ? filters.categories : undefined,
        tags: filters.tags?.length > 0 ? filters.tags : undefined,
        fileTypes: filters.fileTypes?.length > 0 ? filters.fileTypes : undefined
      } : undefined
    };

    const newHistory = [
      newItem,
      ...history.filter(item => item.query !== newItem.query)
    ].slice(0, maxItems);

    setHistory(newHistory);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error guardando historial de búsqueda:', error);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    history,
    addToHistory,
    clearHistory
  };
}; 