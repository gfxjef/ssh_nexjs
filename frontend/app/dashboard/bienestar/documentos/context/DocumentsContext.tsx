'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Document, DocumentCategory, DocumentTag, DocumentFilters } from '../types';
import { documentsApi, categoriesApi, tagsApi, handleApiError } from '../lib/api';

interface DocumentsContextType {
  // Datos
  documents: Document[];
  categories: DocumentCategory[];
  tags: DocumentTag[];
  
  // Estados de carga
  loading: boolean;
  error: string | null;
  
  // Funciones de gestión
  refreshDocuments: (filters?: DocumentFilters) => Promise<void>;
  refreshAll: () => Promise<void>;
  updateDocument: (document: Document) => void;
  deleteDocument: (documentId: number) => void;
  addDocument: (document: Document) => void;
  
  // Cache de documentos específicos
  getDocument: (id: number) => Document | undefined;
  
  // Estado de inicialización
  isInitialized: boolean;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

interface DocumentsProviderProps {
  children: ReactNode;
}

export function DocumentsProvider({ children }: DocumentsProviderProps) {
  // Estados principales
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [tags, setTags] = useState<DocumentTag[]>([]);
  
  // Estados de control
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Cache de última búsqueda para evitar cargas duplicadas
  const [lastFilters, setLastFilters] = useState<DocumentFilters | null>(null);

  // Función para cargar datos base (categorías y etiquetas)
  const loadBaseData = async () => {
    try {
      const [categoriesResponse, tagsResponse] = await Promise.all([
        categoriesApi.getCategories(),
        tagsApi.getTags()
      ]);

      setCategories(categoriesResponse.data || []);
      setTags(tagsResponse.data || []);
      
      return true;
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(`Error cargando datos base: ${errorMessage}`);
      console.error('Error cargando datos base:', err);
      return false;
    }
  };

  // Función para cargar documentos con filtros
  const refreshDocuments = async (filters: DocumentFilters = {}) => {
    // Evitar cargas duplicadas con los mismos filtros
    if (lastFilters && JSON.stringify(lastFilters) === JSON.stringify(filters)) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const documentsResponse = await documentsApi.getDocuments(filters);
      setDocuments(documentsResponse.data || []);
      setLastFilters(filters);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(`Error cargando documentos: ${errorMessage}`);
      console.error('Error cargando documentos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para refrescar todos los datos
  const refreshAll = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const baseDataLoaded = await loadBaseData();
      if (baseDataLoaded) {
        await refreshDocuments();
      }
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(`Error refrescando datos: ${errorMessage}`);
      console.error('Error refrescando todos los datos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Funciones de gestión local (optimistic updates)
  const updateDocument = (updatedDocument: Document) => {
    setDocuments(prev => 
      prev.map(doc => doc.id === updatedDocument.id ? updatedDocument : doc)
    );
  };

  const deleteDocument = (documentId: number) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const addDocument = (newDocument: Document) => {
    setDocuments(prev => [newDocument, ...prev]);
  };

  // Función para obtener un documento específico del cache
  const getDocument = (id: number): Document | undefined => {
    return documents.find(doc => doc.id === id);
  };

  // Inicialización al montar el componente
  useEffect(() => {
    const initialize = async () => {
      if (!isInitialized) {
        setLoading(true);
        
        try {
          const baseDataLoaded = await loadBaseData();
          if (baseDataLoaded) {
            // Cargar documentos con filtros por defecto
            await refreshDocuments({
              search: '',
              category: 'todas',
              tags: [],
              limit: 50, // Cargar más documentos inicialmente
              offset: 0
            });
          }
          setIsInitialized(true);
        } catch (err) {
          console.error('Error inicializando DocumentsContext:', err);
          setError('Error inicializando el sistema de documentos');
        } finally {
          setLoading(false);
        }
      }
    };

    initialize();
  }, [isInitialized]);

  const contextValue: DocumentsContextType = {
    // Datos
    documents,
    categories,
    tags,
    
    // Estados
    loading,
    error,
    isInitialized,
    
    // Funciones
    refreshDocuments,
    refreshAll,
    updateDocument,
    deleteDocument,
    addDocument,
    getDocument
  };

  return (
    <DocumentsContext.Provider value={contextValue}>
      {children}
    </DocumentsContext.Provider>
  );
}

// Hook personalizado para usar el contexto
export function useDocuments() {
  const context = useContext(DocumentsContext);
  
  if (context === undefined) {
    throw new Error('useDocuments debe ser usado dentro de un DocumentsProvider');
  }
  
  return context;
}

// Hook para obtener un documento específico (con carga automática si no existe)
export function useDocument(id: number) {
  const { getDocument, refreshDocuments, loading } = useDocuments();
  const [documentLoading, setDocumentLoading] = useState(false);
  
  const document = getDocument(id);
  
  useEffect(() => {
    // Si no tenemos el documento en cache, intentar cargarlo
    if (!document && !loading && !documentLoading) {
      setDocumentLoading(true);
      refreshDocuments().finally(() => setDocumentLoading(false));
    }
  }, [id, document, loading, documentLoading, refreshDocuments]);
  
  return {
    document,
    loading: loading || documentLoading
  };
} 