'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DocumentCard from './components/DocumentCard';
import CategoryFilter from './components/CategoryFilter';
import TagSelector from './components/TagSelector';
import AdvancedSearchBar from './components/AdvancedSearchBar';
import SearchHistory, { useSearchHistory } from './components/SearchHistory';
import { GroupSelector } from './components';
import { Document, DocumentCategory, DocumentTag, DocumentFilters, DocumentView } from './types';
import { documentsApi, categoriesApi, tagsApi, handleApiError } from './lib/api';
import { useDocuments } from './context/DocumentsContext';

export default function DocumentosPage() {
  const router = useRouter();
  
  // Usar el contexto global de documentos
  const { 
    documents, 
    categories, 
    tags, 
    loading, 
    error: contextError, 
    refreshDocuments,
    isInitialized 
  } = useDocuments();
  
  // Estados locales (solo para UI)
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<DocumentView>('grid');
  const [filters, setFilters] = useState<DocumentFilters>({
    search: '',
    category: 'todas',
    tags: [],
    limit: 20,
    offset: 0
  });
  
  // Estados para búsqueda avanzada
  const [searchResults, setSearchResults] = useState<Document[]>([]);
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [advancedSearchLoading, setAdvancedSearchLoading] = useState(false);
  
  // Hook para historial de búsqueda
  const { addToHistory } = useSearchHistory();

  // Estados para contadores (opcional)
  const [documentCounts, setDocumentCounts] = useState<Record<number, number>>({});
  const [tagCounts, setTagCounts] = useState<Record<number, number>>({});
  
  // Estado para controlar descargas en progreso
  const [downloadingDocuments, setDownloadingDocuments] = useState<Set<number>>(new Set());

  // Actualizar documentos cuando cambian los filtros
  useEffect(() => {
    if (isInitialized) {
      refreshDocuments(filters);
    }
  }, [filters, isInitialized, refreshDocuments]);

  // Manejar búsqueda
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchTerm, offset: 0 }));
  };

  // Manejar filtro de categoría
  const handleCategoryChange = (category: string | number) => {
    setFilters(prev => ({ ...prev, category, offset: 0 }));
  };

  // Manejar filtro de etiquetas
  const handleTagsChange = (selectedTags: number[]) => {
    setFilters(prev => ({ ...prev, tags: selectedTags, offset: 0 }));
  };

  // Manejar filtro de grupo empresarial
  const handleGroupChange = (grupo: 'kossodo' | 'kossomet' | 'grupo_kossodo') => {
    setFilters(prev => ({ ...prev, grupo, offset: 0 }));
  };

  // Limpiar filtro de grupo
  const clearGroupFilter = () => {
    setFilters(prev => ({ ...prev, grupo: undefined, offset: 0 }));
  };

  // Manejar búsqueda avanzada
  const handleAdvancedSearch = async (searchFilters: any) => {
    try {
      setAdvancedSearchLoading(true);
      setIsAdvancedSearch(true);
      
      // Construir parámetros de búsqueda
      const params = new URLSearchParams();
      
      if (searchFilters.query) params.append('q', searchFilters.query);
      if (searchFilters.categories.length > 0) {
        params.append('categories', searchFilters.categories.join(','));
      }
      if (searchFilters.tags.length > 0) {
        params.append('tags', searchFilters.tags.join(','));
      }
      if (searchFilters.dateFrom) params.append('date_from', searchFilters.dateFrom);
      if (searchFilters.dateTo) params.append('date_to', searchFilters.dateTo);
      if (searchFilters.fileTypes.length > 0) {
        params.append('file_types', searchFilters.fileTypes.join(','));
      }
      if (searchFilters.minDownloads > 0) {
        params.append('min_downloads', searchFilters.minDownloads.toString());
      }
      
      params.append('page', currentPage.toString());
      params.append('limit', '20');
      
      // Realizar búsqueda real cuando esté conectado a la API
      const response = await fetch(`/api/bienestar/documentos/api/search/advanced?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.data || []);
        setTotalResults(data.pagination?.total || 0);
        
        // Agregar al historial si hay query
        if (searchFilters.query) {
          addToHistory(searchFilters.query, data.data?.length || 0, searchFilters);
        }
      } else {
        // Fallback a búsqueda local en datos mock
        const filteredResults = documents.filter(doc => {
          if (searchFilters.query && !doc.titulo.toLowerCase().includes(searchFilters.query.toLowerCase())) {
            return false;
          }
          if (searchFilters.categories.length > 0 && !searchFilters.categories.includes(doc.categoria_id)) {
            return false;
          }
          if (searchFilters.tags.length > 0) {
            const hasMatchingTag = doc.etiquetas.some(tag => searchFilters.tags.includes(tag.id));
            if (!hasMatchingTag) return false;
          }
          return true;
        });
        
        setSearchResults(filteredResults);
        setTotalResults(filteredResults.length);
        
        if (searchFilters.query) {
          addToHistory(searchFilters.query, filteredResults.length, searchFilters);
        }
      }
      
    } catch (error) {
      console.error('Error en búsqueda avanzada:', error);
      // Fallback a datos actuales
      setSearchResults(documents);
      setTotalResults(documents.length);
    } finally {
      setAdvancedSearchLoading(false);
    }
  };

  // Manejar selección del historial
  const handleHistorySelect = (historyItem: any) => {
    const searchFilters = {
      query: historyItem.query,
      categories: historyItem.filters?.categories || [],
      tags: historyItem.filters?.tags || [],
      fileTypes: historyItem.filters?.fileTypes || [],
      minDownloads: 0,
      dateFrom: undefined,
      dateTo: undefined
    };
    
    handleAdvancedSearch(searchFilters);
  };

  // Resetear búsqueda avanzada
  const resetSearch = () => {
    setIsAdvancedSearch(false);
    setSearchResults([]);
    setSearchTerm('');
  };

  // Manejar visualización de documento
  const handleView = (document: Document) => {
    // Navegar al viewer en la misma ventana (no abrir nueva ventana)
    router.push(`/dashboard/bienestar/documentos/viewer?id=${document.id}`);
  };

  // Manejar descarga de documento
  const handleDownload = async (document: Document) => {
    // Marcar documento como descargando
    setDownloadingDocuments(prev => new Set(prev.add(document.id)));
    
    try {
      console.log('Descargando documento:', document.titulo);
      
      // Usar la API real para descargar
      const blob = await documentsApi.downloadDocument(document.id);
      
      // Crear URL del blob y descargar
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.nombre_archivo || `${document.titulo}.pdf`;
      window.document.body.appendChild(link);
      link.click();
      
      // Limpiar
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error al descargar documento:', error);
      alert('Error al descargar el documento');
    } finally {
      // Remover del estado de descarga
      setDownloadingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(document.id);
        return newSet;
      });
    }
  };

  // Manejar edición de documento
  const handleEdit = (document: Document) => {
    console.log('Editando documento:', document.titulo);
    // Aquí iría la navegación a la página de edición
  };

  // Manejar eliminación de documento
  const handleDelete = (document: Document) => {
    if (confirm(`¿Estás seguro de que deseas eliminar "${document.titulo}"?`)) {
      console.log('Eliminando documento:', document.titulo);
      // Aquí iría la lógica de eliminación real
    }
  };

  // Filtrar documentos mostrados
  const filteredDocuments = isAdvancedSearch ? searchResults : documents.filter(doc => {
    if (filters.search && !doc.titulo.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.category && filters.category !== 'todas' && doc.categoria_id !== filters.category) {
      return false;
    }
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = doc.etiquetas.some(tag => filters.tags!.includes(tag.id));
      if (!hasMatchingTag) return false;
    }
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Cabecera */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#2e3954] mb-2">Gestión de Documentos</h1>
            <p className="text-gray-600">Administra y organiza todos los documentos de bienestar</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Controles de vista */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setView('grid')}
                className={`p-2 rounded ${view === 'grid' ? 'bg-[#2e3954] text-white' : 'bg-gray-100 text-gray-600'}`}
                title="Vista de cuadrícula"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 rounded ${view === 'list' ? 'bg-[#2e3954] text-white' : 'bg-gray-100 text-gray-600'}`}
                title="Vista de lista"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Botón subir documento */}
            <button className="px-4 py-2 bg-[#2e3954] text-white rounded-lg hover:bg-[#1e2633] transition-colors flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Subir Documento</span>
            </button>
          </div>
        </div>

        {/* Sistema de búsqueda avanzada */}
        <div className="mb-6">
          <AdvancedSearchBar
            categories={categories}
            tags={tags}
            onSearch={handleAdvancedSearch}
            placeholder="Buscar documentos avanzado..."
            showAdvancedFilters={true}
          />
          
          {/* Historial de búsqueda */}
          <div className="mt-3 flex justify-between items-center">
            <SearchHistory onSelectHistory={handleHistorySelect} />
            
            {isAdvancedSearch && (
              <button
                onClick={resetSearch}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
              >
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar búsqueda
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-8 space-y-4">
          {/* Filtro de categorías */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Categorías</h3>
            <CategoryFilter
              categories={categories}
              selectedCategory={filters.category}
              onCategoryChange={handleCategoryChange}
              showCount={true}
              documentCounts={documentCounts}
            />
          </div>

          {/* Filtro de etiquetas */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Etiquetas</h3>
            <div className="max-w-md">
              <TagSelector
                tags={tags}
                selectedTags={filters.tags}
                onTagsChange={handleTagsChange}
                showCount={true}
                documentCounts={tagCounts}
              />
            </div>
          </div>

          {/* Filtro de grupos empresariales */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Grupo Empresarial</h3>
            <div className="flex items-center space-x-4">
              <div className="max-w-md">
                <GroupSelector
                  selectedGroup={filters.grupo}
                  onGroupChange={handleGroupChange}
                  placeholder="Filtrar por grupo empresarial"
                  showCounts={false}
                  size="md"
                />
              </div>
              {filters.grupo && (
                <button
                  onClick={clearGroupFilter}
                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-600">
              {loading ? 'Cargando...' : `${filteredDocuments.length} documento(s) encontrado(s)`}
            </p>
            {isAdvancedSearch && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                Búsqueda avanzada activa
              </span>
            )}
          </div>
          
          {/* Controles de vista */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-md ${view === 'grid' ? 'bg-[#2e3954] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title="Vista de grilla"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-md ${view === 'list' ? 'bg-[#2e3954] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title="Vista de lista"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Lista de documentos */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2e3954]"></div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay documentos</h3>
            <p className="mt-1 text-sm text-gray-500">
              No se encontraron documentos que coincidan con los criterios de búsqueda.
            </p>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map(document => (
              <DocumentCard
                key={document.id}
                document={document}
                view="grid"
                onView={handleView}
                onDownload={handleDownload}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isDownloading={downloadingDocuments.has(document.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map(document => (
              <DocumentCard
                key={document.id}
                document={document}
                view="list"
                onView={handleView}
                onDownload={handleDownload}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isDownloading={downloadingDocuments.has(document.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 