'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DocumentCard from './components/DocumentCard';
import { Document, DocumentCategory, DocumentTag, DocumentFilters, DocumentView } from './types';
import { documentsApi, categoriesApi, tagsApi, handleApiError } from './lib/api';
import { useDocuments } from './context/DocumentsContext';
import { useDocumentCache } from './hooks/useDocumentCache';

export default function DocumentosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
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

  // Usar el hook de cache para URLs y visualización
  const { 
    getCachedFileUrl, 
    getFileUrl, 
    shouldShowPreview, 
    getViewerType,
    isLoading: isCacheLoading,
    cacheSize 
  } = useDocumentCache();
  
  // Estados locales para UI
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | number>('todas');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<'kossodo' | 'kossomet' | 'grupo_kossodo' | 'todas'>('todas');
  const [view, setView] = useState<DocumentView>('list');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Estado para controlar descargas en progreso
  const [downloadingDocuments, setDownloadingDocuments] = useState<Set<number>>(new Set());

  // Nuevo estado para el documento seleccionado para visualizar
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [viewerMode, setViewerMode] = useState(false);

  // Efecto para manejar parámetros URL (desde LatestDocuments)
  useEffect(() => {
    if (!searchParams) return;
    
    const viewDocumentId = searchParams.get('view');
    const mode = searchParams.get('mode');
    
    if (viewDocumentId && mode === 'viewer' && documents.length > 0) {
      const documentToView = documents.find(doc => doc.id === parseInt(viewDocumentId));
      
      if (documentToView && shouldShowPreview(documentToView)) {
        setSelectedDocument(documentToView);
        setViewerMode(true);
        console.log('🔗 [URL] Abriendo documento desde parámetros URL:', documentToView.titulo);
        
        // Limpiar los parámetros URL después de procesar
        router.replace('/dashboard/bienestar/documentos', { scroll: false });
      }
    }
  }, [searchParams, documents, router, shouldShowPreview]);

  // Calcular categorías y etiquetas que tienen documentos
  const categoriesWithDocuments = useMemo(() => {
    const categoryCounts = new Map<number, number>();
    
    documents.forEach(doc => {
      const count = categoryCounts.get(doc.categoria_id) || 0;
      categoryCounts.set(doc.categoria_id, count + 1);
    });
    
    return categories
      .filter(cat => categoryCounts.has(cat.id))
      .map(cat => ({
        ...cat,
        documentCount: categoryCounts.get(cat.id) || 0
      }));
  }, [documents, categories]);

  const tagsWithDocuments = useMemo(() => {
    const tagCounts = new Map<number, number>();
    
    documents.forEach(doc => {
      doc.etiquetas.forEach(tag => {
        const count = tagCounts.get(tag.id) || 0;
        tagCounts.set(tag.id, count + 1);
      });
    });
    
    return tags
      .filter(tag => tagCounts.has(tag.id))
      .map(tag => ({
        ...tag,
        documentCount: tagCounts.get(tag.id) || 0
      }));
  }, [documents, tags]);

  // Filtrar documentos
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
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

      // Filtro de grupo
      if (selectedGroup !== 'todas' && doc.grupo !== selectedGroup) {
        return false;
      }
      
      return true;
    });
  }, [documents, searchTerm, selectedCategory, selectedTags, selectedGroup]);

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
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  // Manejar cambio de grupo
  const handleGroupChange = (group: 'kossodo' | 'kossomet' | 'grupo_kossodo' | 'todas') => {
    setSelectedGroup(group);
  };

  // Limpiar todos los filtros
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('todas');
    setSelectedTags([]);
    setSelectedGroup('todas');
  };

  // Manejar visualización de documento (MODIFICADO - solo para PDFs e imágenes)
  const handleView = (document: Document) => {
    const viewerType = getViewerType(document);
    
    // Solo mostrar preview para PDFs e imágenes
    if (viewerType === 'pdf' || viewerType === 'image') {
      setSelectedDocument(document);
      setViewerMode(true);
      console.log(`🔍 [VIEW] Abriendo preview para documento ${document.id} (${viewerType})`);
    } else {
      // Para otros tipos, descargar directamente
      console.log(`📥 [VIEW] Descarga directa para documento ${document.id} (${viewerType})`);
      handleDownload(document);
    }
  };

  // Función para volver a la lista de documentos
  const handleBackToDocuments = () => {
    setSelectedDocument(null);
    setViewerMode(false);
  };

  // Manejar descarga de documento
  const handleDownload = async (document: Document) => {
    setDownloadingDocuments(prev => new Set(prev.add(document.id)));
    
    try {
      console.log('📥 [DOWNLOAD] Descargando documento:', document.titulo);
      const blob = await documentsApi.downloadDocument(document.id);
      
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.nombre_archivo || `${document.titulo}.pdf`;
      window.document.body.appendChild(link);
      link.click();
      
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(link);
      
    } catch (error) {
      console.error('❌ [DOWNLOAD] Error al descargar documento:', error);
      alert('Error al descargar el documento');
    } finally {
      setDownloadingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(document.id);
        return newSet;
      });
    }
  };



  // Renderizar el viewer de documento SIMPLIFICADO
  const renderDocumentViewer = () => {
    if (!selectedDocument) return null;

    const viewerType = getViewerType(selectedDocument);
    
    // Renderizar PDF con cache
    const renderPDFViewer = () => {
      const pdfUrl = `${getFileUrl(selectedDocument)}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH`;
      
      return (
        <div className="h-full bg-gray-50 rounded-lg relative">
          {isCacheLoading(selectedDocument.id) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2e3954] mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Validando PDF...</p>
              </div>
            </div>
          )}
          <iframe
            src={pdfUrl}
            className="w-full h-full rounded-lg"
            title={selectedDocument.titulo}
          />
        </div>
      );
    };

    // Renderizar imagen con cache
    const renderImageViewer = () => {
      const imageUrl = getFileUrl(selectedDocument);
      
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-lg relative">
          {isCacheLoading(selectedDocument.id) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2e3954] mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Validando imagen...</p>
              </div>
            </div>
          )}
          <div className="max-w-4xl max-h-full relative">
            <img
              src={imageUrl}
              alt={selectedDocument.titulo}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              onLoad={() => console.log(`✅ [IMAGE] Imagen cargada: ${selectedDocument.id}`)}
              onError={() => console.error(`❌ [IMAGE] Error cargando imagen: ${selectedDocument.id}`)}
            />
          </div>
        </div>
      );
    };

    return (
      <div className="flex-1 p-6">
        <div className="h-full flex flex-col">
          {/* Header del documento */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{selectedDocument.titulo}</h2>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span><strong>Autor:</strong> {selectedDocument.autor || 'No especificado'}</span>
                  <span><strong>Tipo:</strong> {getViewerType(selectedDocument).toUpperCase()}</span>
                  <span><strong>Tamaño:</strong> {formatFileSize(selectedDocument.tamaño_archivo)}</span>
                  <span><strong>Descargas:</strong> {selectedDocument.descargas}</span>
                  <span><strong>Subido:</strong> {formatDate(selectedDocument.created_at)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {/* Botones de acción */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownload(selectedDocument)}
                    className="px-4 py-2 bg-[#2e3954] text-white rounded-md hover:bg-[#1e2633] transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Descargar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Área de visualización */}
          <div className="flex-1 relative">
            {viewerType === 'pdf' && renderPDFViewer()}
            {viewerType === 'image' && renderImageViewer()}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2e3954] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando documentos...</p>
          {cacheSize > 0 && (
            <p className="text-xs text-gray-500 mt-1">Cache: {cacheSize} URLs</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar de filtros */}
      {sidebarOpen && !viewerMode && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="h-full flex flex-col">
            {/* Header del sidebar */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
                <div className="flex items-center space-x-2">
                  {cacheSize > 0 && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                      Cache: {cacheSize}
                    </span>
                  )}
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Cerrar filtros"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
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

              {/* Botón limpiar filtros */}
              {(searchTerm || selectedCategory !== 'todas' || selectedTags.length > 0 || selectedGroup !== 'todas') && (
                <button
                  onClick={clearAllFilters}
                  className="w-full mb-4 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Limpiar filtros
                </button>
              )}

              {/* Filtros de grupo empresarial */}
              <div className="mb-4">
                <h3 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Grupo Empresarial</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => handleGroupChange('todas')}
                    className={`w-full text-left px-2 py-1 text-sm rounded ${
                      selectedGroup === 'todas'
                        ? 'bg-[#2e3954] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Todos los grupos
                  </button>
                  <button
                    onClick={() => handleGroupChange('kossodo')}
                    className={`w-full text-left px-2 py-1 text-sm rounded ${
                      selectedGroup === 'kossodo'
                        ? 'bg-[#2e3954] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Kossodo
                  </button>
                  <button
                    onClick={() => handleGroupChange('kossomet')}
                    className={`w-full text-left px-2 py-1 text-sm rounded ${
                      selectedGroup === 'kossomet'
                        ? 'bg-[#2e3954] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Kossomet
                  </button>
                  <button
                    onClick={() => handleGroupChange('grupo_kossodo')}
                    className={`w-full text-left px-2 py-1 text-sm rounded ${
                      selectedGroup === 'grupo_kossodo'
                        ? 'bg-[#2e3954] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Grupo Kossodo
                  </button>
                </div>
              </div>

              {/* Filtros de categoría */}
              <div className="mb-4">
                <h3 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Categorías</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => handleCategoryChange('todas')}
                    className={`w-full text-left px-2 py-1 text-sm rounded flex items-center justify-between ${
                      selectedCategory === 'todas'
                        ? 'bg-[#2e3954] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>Todas las categorías</span>
                    <span className={`text-xs ${selectedCategory === 'todas' ? 'text-blue-200' : 'text-gray-500'}`}>
                      {documents.length}
                    </span>
                  </button>
                  
                  {categoriesWithDocuments.map(category => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryChange(category.id)}
                      className={`w-full text-left px-2 py-1 text-sm rounded flex items-center justify-between ${
                        selectedCategory === category.id
                          ? 'bg-[#2e3954] text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{category.icono}</span>
                        <span>{category.nombre}</span>
                      </div>
                      <span className={`text-xs ${selectedCategory === category.id ? 'text-blue-200' : 'text-gray-500'}`}>
                        {category.documentCount}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtros de etiquetas */}
              <div>
                <h3 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Etiquetas</h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {tagsWithDocuments.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagToggle(tag.id)}
                      className={`w-full text-left px-2 py-1 text-sm rounded flex items-center justify-between ${
                        selectedTags.includes(tag.id)
                          ? 'bg-blue-100 text-blue-800'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
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
                          className="px-2 py-0.5 text-xs rounded text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.nombre}
                        </span>
                      </div>
                      <span className={`text-xs ${selectedTags.includes(tag.id) ? 'text-blue-600' : 'text-gray-500'}`}>
                        {tag.documentCount}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Área principal */}
      <div className="flex-1 flex flex-col">
        {/* Barra de herramientas */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {!sidebarOpen && !viewerMode && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Mostrar filtros"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h16a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h16a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h16a1 1 0 110 2H4a1 1 0 01-1-1z" />
                </svg>
              </button>
            )}
            
            {/* Botón volver a documentos (solo en modo viewer) */}
            {viewerMode && (
              <button
                onClick={handleBackToDocuments}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Volver a Documentos</span>
              </button>
            )}
            
            <div>
              <h1 className="text-2xl font-bold text-[#2e3954]">Gestión de Documentos</h1>
              <p className="text-sm text-gray-600">
                {loading ? 'Cargando...' : viewerMode 
                  ? `Visualizando: ${selectedDocument?.titulo}`
                  : `${filteredDocuments.length} documento(s) encontrado(s)`
                }
                {cacheSize > 0 && !viewerMode && (
                  <span className="ml-2 text-xs text-green-600">• Cache: {cacheSize} URLs</span>
                )}
              </p>
            </div>
          </div>
          
          {/* Controles solo visibles en modo lista */}
          {!viewerMode && (
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

              {/* Botón de administración removido - Esta sección es solo para visualización */}
            </div>
          )}
        </div>

        {/* Contenido principal - Cambia según el modo */}
        {viewerMode ? (
          // Mostrar el viewer del documento
          renderDocumentViewer()
        ) : (
          // Mostrar la lista de documentos
          <div className="flex-1 overflow-y-auto p-6">
            {filteredDocuments.length === 0 ? (
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredDocuments.map(document => (
                  <DocumentCard
                    key={document.id}
                    document={document}
                    view="grid"
                    onView={handleView}
                    onDownload={handleDownload}
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
                    isDownloading={downloadingDocuments.has(document.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 