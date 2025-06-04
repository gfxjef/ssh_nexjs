'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileUploader, 
  CategoryManager, 
  TagManager, 
  DocumentManager 
} from './components';
import { Document, DocumentCategory, DocumentTag } from '../types';
import { documentsApi, categoriesApi, tagsApi, handleApiError } from '../lib/api';

export default function DocumentAdminPage() {
  const router = useRouter();
  
  // Estados globales del admin
  const [activeTab, setActiveTab] = useState<'upload' | 'documents' | 'categories' | 'tags'>('upload');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [tags, setTags] = useState<DocumentTag[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    
    try {
      // Cargar datos reales de la API
      const [categoriesResponse, tagsResponse, documentsResponse] = await Promise.all([
        categoriesApi.getCategories(),
        tagsApi.getTags(),
        documentsApi.getDocuments()
      ]);

      setCategories(categoriesResponse.data || []);
      setTags(tagsResponse.data || []);
      setDocuments(documentsResponse.data || []);
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      
      // Mostrar mensaje de error al usuario
      const errorMessage = handleApiError(error);
      alert(`Error cargando datos: ${errorMessage}\n\nAsegúrate de que el backend esté funcionando en localhost:3001`);
      
      // Usar datos por defecto en caso de error para que la UI sea usable
      setCategories([]);
      setTags([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  // Handlers para comunicación entre componentes
  const handleDocumentUploaded = (newDocument: Document) => {
    // 🛡️ SEGURIDAD: Verificar que el documento es válido antes de agregarlo
    if (!newDocument || !newDocument.titulo) {
      console.error('⚠️ Documento inválido recibido en handleDocumentUploaded:', newDocument);
      return;
    }
    
    console.log('✅ Agregando documento válido:', newDocument.titulo);
    setDocuments(prev => [newDocument, ...prev]);
  };

  const handleDocumentUpdated = (updatedDocument: Document) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === updatedDocument.id ? updatedDocument : doc
    ));
  };

  const handleDocumentDeleted = (documentId: number) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const handleCategoryCreated = (newCategory: DocumentCategory) => {
    setCategories(prev => [...prev, newCategory]);
  };

  const handleCategoryUpdated = (updatedCategory: DocumentCategory) => {
    setCategories(prev => prev.map(cat => 
      cat.id === updatedCategory.id ? updatedCategory : cat
    ));
  };

  const handleCategoryDeleted = (categoryId: number) => {
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    // También actualizar documentos que usen esta categoría
    setDocuments(prev => prev.map(doc => 
      doc.categoria_id === categoryId 
        ? { ...doc, categoria_id: 0, categoria: undefined }
        : doc
    ));
  };

  const handleTagCreated = (newTag: DocumentTag) => {
    setTags(prev => [...prev, newTag]);
  };

  const handleTagUpdated = (updatedTag: DocumentTag) => {
    setTags(prev => prev.map(tag => 
      tag.id === updatedTag.id ? updatedTag : tag
    ));
  };

  const handleTagDeleted = (tagId: number) => {
    setTags(prev => prev.filter(tag => tag.id !== tagId));
    // También remover la etiqueta de todos los documentos
    setDocuments(prev => prev.map(doc => ({
      ...doc,
      etiquetas: doc.etiquetas.filter(tag => tag.id !== tagId)
    })));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2e3954]"></div>
      </div>
    );
  }

  const tabs = [
    { key: 'upload', label: 'Subir Documentos', icon: '📤' },
    { key: 'documents', label: 'Gestionar Documentos', icon: '📋' },
    { key: 'categories', label: 'Categorías', icon: '🏷️' },
    { key: 'tags', label: 'Etiquetas', icon: '🏷️' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#2e3954] mb-2">Administrador de Documentos</h1>
              <p className="text-gray-600">Gestiona documentos, categorías y etiquetas del sistema</p>
            </div>
            
            <button
              onClick={() => router.push('/dashboard/bienestar/documentos')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Volver a Documentos</span>
            </button>
          </div>
        </div>

        {/* Navegación por pestañas */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#2e3954] text-[#2e3954]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Contenido de las pestañas */}
        <div className="p-6">
          {activeTab === 'upload' && (
            <FileUploader
              categories={categories}
              tags={tags}
              onDocumentUploaded={handleDocumentUploaded}
            />
          )}
          
          {activeTab === 'documents' && (
            <DocumentManager
              documents={documents}
              categories={categories}
              tags={tags}
              onDocumentUpdated={handleDocumentUpdated}
              onDocumentDeleted={handleDocumentDeleted}
            />
          )}
          
          {activeTab === 'categories' && (
            <CategoryManager
              categories={categories}
              onCategoryCreated={handleCategoryCreated}
              onCategoryUpdated={handleCategoryUpdated}
              onCategoryDeleted={handleCategoryDeleted}
            />
          )}
          
          {activeTab === 'tags' && (
            <TagManager
              tags={tags}
              onTagCreated={handleTagCreated}
              onTagUpdated={handleTagUpdated}
              onTagDeleted={handleTagDeleted}
            />
          )}
        </div>
      </div>
    </div>
  );
} 