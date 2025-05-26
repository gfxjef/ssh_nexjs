'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DocumentViewer from './components/DocumentViewer';
import DocumentSidebar from './components/DocumentSidebar';
import { Document, DocumentCategory, DocumentTag } from '../types';
import { documentsApi, categoriesApi, tagsApi, handleApiError } from '../lib/api';
import { useDocuments, useDocument } from '../context/DocumentsContext';

export default function ViewerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentId = searchParams?.get('id');

  // Usar contexto global para datos base
  const { documents, categories, tags, loading: contextLoading, error: contextError } = useDocuments();
  
  // Hook específico para el documento actual
  const { document: currentDocument, loading: documentLoading } = useDocument(
    documentId ? parseInt(documentId) : 0
  );

  // Estados locales para UI
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Estado de carga combinado
  const loading = contextLoading || documentLoading;

  // Efecto para manejar errores del contexto
  useEffect(() => {
    if (contextError) {
      setError(contextError);
    }
  }, [contextError]);

  // Manejar selección de documento
  const handleDocumentSelect = (document: Document) => {
    router.push(`/dashboard/bienestar/documentos/viewer?id=${document.id}`);
  };

  // Manejar descarga
  const handleDownload = async (document: Document) => {
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
    }
  };

  // Navegar entre documentos
  const navigateToDocument = (direction: 'prev' | 'next') => {
    if (!currentDocument || documents.length === 0) return;
    
    const currentIndex = documents.findIndex(d => d.id === currentDocument.id);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : documents.length - 1;
    } else {
      newIndex = currentIndex < documents.length - 1 ? currentIndex + 1 : 0;
    }
    
    handleDocumentSelect(documents[newIndex]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2e3954] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando documentos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar documentos</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#2e3954] text-white rounded-md hover:bg-[#1e2633] transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <DocumentSidebar
            documents={documents}
            categories={categories}
            tags={tags}
            currentDocument={currentDocument || null}
            onDocumentSelect={handleDocumentSelect}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Área principal del viewer */}
      <div className="flex-1 flex flex-col">
        {/* Barra de herramientas */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Mostrar lista de documentos"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateToDocument('prev')}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Documento anterior"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={() => navigateToDocument('next')}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Documento siguiente"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {currentDocument && (
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{currentDocument.titulo}</h1>
                <p className="text-sm text-gray-500">{currentDocument.autor}</p>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {currentDocument && (
              <>
                <button
                  onClick={() => handleDownload(currentDocument)}
                  className="px-4 py-2 bg-[#2e3954] text-white rounded-md hover:bg-[#1e2633] transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Descargar</span>
                </button>
                
                <button
                  onClick={() => router.push('/dashboard/bienestar/documentos')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Volver a la lista
                </button>
              </>
            )}
          </div>
        </div>

        {/* Área de visualización */}
        <div className="flex-1 p-6">
          {currentDocument ? (
            <DocumentViewer
              document={currentDocument}
              onDownload={handleDownload}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay documento seleccionado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Selecciona un documento de la lista para visualizarlo.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 