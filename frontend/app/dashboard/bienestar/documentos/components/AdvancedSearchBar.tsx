'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface DocumentCategory {
  id: number;
  nombre: string;
  color: string;
  icono: string;
}

interface DocumentTag {
  id: number;
  nombre: string;
  color: string;
}

interface SearchSuggestion {
  title: string;
  category_id: number;
}

interface SearchSuggestions {
  suggestions: SearchSuggestion[];
  categories: DocumentCategory[];
  tags: DocumentTag[];
}

interface AdvancedSearchFilters {
  query: string;
  categories: number[];
  tags: number[];
  dateFrom?: string;
  dateTo?: string;
  fileTypes: string[];
  minDownloads: number;
}

interface AdvancedSearchBarProps {
  categories: DocumentCategory[];
  tags: DocumentTag[];
  onSearch: (filters: AdvancedSearchFilters) => void;
  initialFilters?: Partial<AdvancedSearchFilters>;
  placeholder?: string;
  showAdvancedFilters?: boolean;
}

const DEBOUNCE_DELAY = 300;
const FILE_TYPE_OPTIONS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'doc,docx', label: 'Word' },
  { value: 'excel', label: 'Excel' },
  { value: 'txt', label: 'Texto' },
  { value: 'image', label: 'Imágenes' }
];

export default function AdvancedSearchBar({
  categories,
  tags,
  onSearch,
  initialFilters = {},
  placeholder = "Buscar documentos...",
  showAdvancedFilters = true
}: AdvancedSearchBarProps) {
  // Estados
  const [filters, setFilters] = useState<AdvancedSearchFilters>({
    query: '',
    categories: [],
    tags: [],
    fileTypes: [],
    minDownloads: 0,
    ...initialFilters
  });

  const [suggestions, setSuggestions] = useState<SearchSuggestions>({
    suggestions: [],
    categories: [],
    tags: []
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const searchRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Función para obtener sugerencias del backend
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions({ suggestions: [], categories: [], tags: [] });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/bienestar/documentos/api/search/suggestions?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.data);
      }
    } catch (error) {
      console.error('Error obteniendo sugerencias:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce para las sugerencias
  const debouncedFetchSuggestions = useCallback((query: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, DEBOUNCE_DELAY);
  }, [fetchSuggestions]);

  // Manejar cambio en el input principal
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setFilters(prev => ({ ...prev, query }));
    debouncedFetchSuggestions(query);
    setShowSuggestions(true);
  };

  // Manejar selección de sugerencia
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setFilters(prev => ({ ...prev, query: suggestion.title }));
    setShowSuggestions(false);
    handleSearch({ ...filters, query: suggestion.title });
  };

  // Manejar búsqueda
  const handleSearch = (searchFilters: AdvancedSearchFilters = filters) => {
    onSearch(searchFilters);
    setShowSuggestions(false);
  };

  // Manejar envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Barra de búsqueda principal */}
      <form onSubmit={handleSubmit} className="relative" ref={searchRef}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={filters.query}
            onChange={handleQueryChange}
            placeholder={placeholder}
            className="w-full px-4 py-3 pl-12 pr-20 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent"
            onFocus={() => filters.query.length >= 2 && setShowSuggestions(true)}
          />
          
          {/* Ícono de búsqueda */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>

          {/* Botón de búsqueda avanzada */}
          {showAdvancedFilters && (
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`absolute right-12 top-1/2 transform -translate-y-1/2 p-1 rounded ${
                showAdvanced ? 'text-[#2e3954]' : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Filtros avanzados"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </button>
          )}

          {/* Botón de búsqueda */}
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#2e3954] text-white px-4 py-2 rounded-md hover:bg-[#1e2537] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {/* Panel de sugerencias */}
        {showSuggestions && (suggestions.suggestions.length > 0 || suggestions.categories.length > 0 || suggestions.tags.length > 0) && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1 max-h-96 overflow-y-auto">
            {/* Sugerencias de documentos */}
            {suggestions.suggestions.length > 0 && (
              <div className="p-3 border-b border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Documentos</h4>
                {suggestions.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded"
                  >
                    <span className="text-gray-900">{suggestion.title}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Sugerencias de categorías */}
            {suggestions.categories.length > 0 && (
              <div className="p-3 border-b border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Categorías</h4>
                {suggestions.categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setFilters(prev => ({ 
                        ...prev, 
                        categories: prev.categories.includes(category.id) 
                          ? prev.categories 
                          : [...prev.categories, category.id]
                      }));
                      setShowSuggestions(false);
                    }}
                    className="flex items-center w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded"
                  >
                    <span className="mr-2">{category.icono}</span>
                    <span className="text-gray-900">{category.nombre}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Sugerencias de etiquetas */}
            {suggestions.tags.length > 0 && (
              <div className="p-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Etiquetas</h4>
                {suggestions.tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      setFilters(prev => ({ 
                        ...prev, 
                        tags: prev.tags.includes(tag.id) 
                          ? prev.tags 
                          : [...prev.tags, tag.id]
                      }));
                      setShowSuggestions(false);
                    }}
                    className="inline-block m-1 px-3 py-1 text-sm rounded-full hover:opacity-80"
                    style={{ backgroundColor: tag.color, color: 'white' }}
                  >
                    {tag.nombre}
                  </button>
                ))}
              </div>
            )}

            {isLoading && (
              <div className="p-3 text-center text-sm text-gray-500">
                Cargando sugerencias...
              </div>
            )}
          </div>
        )}
      </form>

      {/* Panel de filtros avanzados */}
      {showAdvanced && showAdvancedFilters && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros Avanzados</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Categorías */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categorías
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({ 
                            ...prev, 
                            categories: [...prev.categories, category.id] 
                          }));
                        } else {
                          setFilters(prev => ({ 
                            ...prev, 
                            categories: prev.categories.filter(id => id !== category.id)
                          }));
                        }
                      }}
                      className="rounded border-gray-300 text-[#2e3954] focus:ring-[#2e3954]"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {category.icono} {category.nombre}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Etiquetas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Etiquetas
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {tags.map((tag) => (
                  <label key={tag.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.tags.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({ 
                            ...prev, 
                            tags: [...prev.tags, tag.id] 
                          }));
                        } else {
                          setFilters(prev => ({ 
                            ...prev, 
                            tags: prev.tags.filter(id => id !== tag.id)
                          }));
                        }
                      }}
                      className="rounded border-gray-300 text-[#2e3954] focus:ring-[#2e3954]"
                    />
                    <span 
                      className="ml-2 text-sm px-2 py-1 rounded-full text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.nombre}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tipos de archivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipos de archivo
              </label>
              <div className="space-y-2">
                {FILE_TYPE_OPTIONS.map((fileType) => (
                  <label key={fileType.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.fileTypes.includes(fileType.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({ 
                            ...prev, 
                            fileTypes: [...prev.fileTypes, fileType.value] 
                          }));
                        } else {
                          setFilters(prev => ({ 
                            ...prev, 
                            fileTypes: prev.fileTypes.filter(type => type !== fileType.value)
                          }));
                        }
                      }}
                      className="rounded border-gray-300 text-[#2e3954] focus:ring-[#2e3954]"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {fileType.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rango de fechas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha desde
              </label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  dateFrom: e.target.value || undefined 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha hasta
              </label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  dateTo: e.target.value || undefined 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent"
              />
            </div>

            {/* Descargas mínimas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descargas mínimas
              </label>
              <input
                type="number"
                min="0"
                value={filters.minDownloads}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  minDownloads: parseInt(e.target.value) || 0 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="mt-4 flex justify-between">
            <button
              type="button"
              onClick={() => {
                setFilters({
                  query: '',
                  categories: [],
                  tags: [],
                  fileTypes: [],
                  minDownloads: 0
                });
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Limpiar filtros
            </button>
            
            <button
              type="button"
              onClick={() => handleSearch()}
              className="px-6 py-2 bg-[#2e3954] text-white rounded-md hover:bg-[#1e2537] transition-colors"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 