'use client';

import React, { useState } from 'react';
import { Document, DocumentCategory, DocumentTag } from '../../types';

interface DocumentManagerProps {
  documents: Document[];
  categories: DocumentCategory[];
  tags: DocumentTag[];
  onDocumentUpdated: (document: Document) => void;
  onDocumentDeleted: (documentId: number) => void;
}

interface DocumentEditFormData {
  titulo: string;
  descripcion: string;
  categoria_id: number;
  etiquetas: number[];
  es_publico: boolean;
  autor: string;
  estado: string;
}

/**
 * Componente para gestión completa de documentos existentes
 */
export default function DocumentManager({
  documents,
  categories,
  tags,
  onDocumentUpdated,
  onDocumentDeleted,
}: DocumentManagerProps) {
  // Estados del componente
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [formData, setFormData] = useState<DocumentEditFormData>({
    titulo: '',
    descripcion: '',
    categoria_id: 0,
    etiquetas: [],
    es_publico: true,
    autor: '',
    estado: 'activo'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'todas'>('todas');
  const [selectedStatus, setSelectedStatus] = useState<string | 'todos'>('todos');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados disponibles para documentos
  const documentStates = [
    { value: 'activo', label: 'Activo', color: '#38A169' },
    { value: 'inactivo', label: 'Inactivo', color: '#4A5568' },
    { value: 'archivado', label: 'Archivado', color: '#D69E2E' },
    { value: 'eliminado', label: 'Eliminado', color: '#E53E3E' }
  ];

  // Función para formatear tamaño de archivo
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
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Función para obtener icono según tipo MIME
  const getFileIcon = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📈';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
    return '📎';
  };

     // Filtrar documentos
   const filteredDocuments = documents.filter(doc => {
     // 🛡️ SEGURIDAD: Verificar que el documento existe y tiene propiedades requeridas
     if (!doc || !doc.titulo) {
       console.warn('⚠️ Documento inválido encontrado:', doc);
       return false;
     }
     
     const matchesSearch = doc.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (doc.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (doc.autor || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'todas' || doc.categoria_id === selectedCategory;
    const matchesStatus = selectedStatus === 'todos' || doc.estado === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Manejar cambios en el formulario
  const handleFormChange = (field: keyof DocumentEditFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Manejar toggle de etiquetas
  const handleTagToggle = (tagId: number) => {
    setFormData(prev => ({
      ...prev,
      etiquetas: (prev.etiquetas || []).includes(tagId)
        ? (prev.etiquetas || []).filter(id => id !== tagId)
        : [...(prev.etiquetas || []), tagId]
    }));
  };

  // Abrir formulario de edición
  const openEditForm = (document: Document) => {
    setEditingDocument(document);
         setFormData({
       titulo: document.titulo,
       descripcion: document.descripcion || '',
       categoria_id: document.categoria_id || 0,
       etiquetas: (document.etiquetas || []).map(tag => tag.id),
       es_publico: document.es_publico,
       autor: document.autor || '',
       estado: document.estado
     });
    setShowEditForm(true);
  };

  // Cerrar formulario de edición
  const closeEditForm = () => {
    setShowEditForm(false);
    setEditingDocument(null);
    setFormData({
      titulo: '',
      descripcion: '',
      categoria_id: 0,
      etiquetas: [],
      es_publico: true,
      autor: '',
      estado: 'activo'
    });
  };

  // Manejar envío del formulario de edición
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingDocument) return;
    
    setIsSubmitting(true);
    
    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedDocument: Document = {
        ...editingDocument,
        ...formData,
        estado: formData.estado as 'activo' | 'inactivo' | 'archivado' | 'eliminado',
        categoria: categories.find(c => c.id === formData.categoria_id),
        etiquetas: tags.filter(t => (formData.etiquetas || []).includes(t.id)),
        updated_at: new Date().toISOString()
      };
      
      onDocumentUpdated(updatedDocument);
      closeEditForm();
    } catch (error) {
      console.error('Error al actualizar documento:', error);
      alert('Error al actualizar el documento');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar eliminación de documento
  const handleDelete = async (document: Document) => {
    const confirmed = confirm(
      `¿Estás seguro de que deseas eliminar el documento "${document.titulo}"?\n\n` +
      'Esta acción no se puede deshacer.'
    );
    
    if (!confirmed) return;
    
    try {
      console.log('🗑️ Eliminando documento:', document.titulo, '(ID:', document.id, ')');
      
      // Usar la API real para eliminar el documento
      const { documentsApi } = await import('../../lib/api');
      const result = await documentsApi.deleteDocument(document.id);
      
      console.log('✅ Documento eliminado exitosamente:', result);
      
      // Llamar al callback para actualizar la lista en el componente padre
      onDocumentDeleted(document.id);
      
      // Mostrar mensaje de éxito
      alert(`Documento "${document.titulo}" eliminado exitosamente`);
      
    } catch (error) {
      console.error('❌ Error al eliminar documento:', error);
      
      // Mostrar mensaje de error específico
      let errorMessage = 'Error al eliminar el documento';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(`Error: ${errorMessage}`);
    }
  };

  // Manejar descarga de documento
  const handleDownload = async (document: Document) => {
    try {
      console.log('Descargando documento:', document.titulo);
      
      // Usar la API real para descargar
      const { documentsApi } = await import('../../lib/api');
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

  // Manejar visualización de documento
  const handleView = (document: Document) => {
    // Navegar en la misma ventana (no abrir nueva ventana)
    if (typeof window !== 'undefined') {
      window.location.href = `/dashboard/bienestar/documentos/viewer?id=${document.id}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Gestión de Documentos</h2>
        <p className="text-sm text-gray-600">
          Administra, edita y elimina documentos existentes en el sistema
        </p>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        {/* Búsqueda */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por título, descripción o autor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent text-gray-900"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Filtros por categoría y estado */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value === 'todas' ? 'todas' : parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent text-gray-900"
            >
              <option value="todas">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icono} {category.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              id="status-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent text-gray-900"
            >
              <option value="todos">Todos los estados</option>
              {documentStates.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="text-sm text-gray-600">
        {filteredDocuments.length} documento(s) encontrado(s)
      </div>

      {/* Lista de documentos */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDocuments.map((document) => (
              <div key={document.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Icono del archivo */}
                    <div className="flex-shrink-0 text-3xl">
                      {getFileIcon(document.tipo_mime)}
                    </div>
                    
                    {/* Información del documento */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {document.titulo}
                        </h3>
                        
                        {/* Estado */}
                        <span 
                          className="px-2 py-1 text-xs font-medium rounded-full text-white"
                          style={{ 
                            backgroundColor: documentStates.find(s => s.value === document.estado)?.color || '#4A5568'
                          }}
                        >
                          {documentStates.find(s => s.value === document.estado)?.label || document.estado}
                        </span>
                        
                        {/* Visibilidad */}
                        <span 
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            document.es_publico 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {document.es_publico ? 'Público' : 'Privado'}
                        </span>
                      </div>
                      
                      {document.descripcion && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {document.descripcion}
                        </p>
                      )}
                      
                      {/* Metadatos */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-3">
                        <span>📁 {document.nombre_archivo}</span>
                        <span>📏 {formatFileSize(document.tamaño_archivo)}</span>
                        <span>👤 {document.autor}</span>
                        <span>📥 {document.descargas} descargas</span>
                        <span>📅 {formatDate(document.created_at)}</span>
                      </div>
                      
                      {/* Categoría */}
                      {document.categoria && (
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-xs text-gray-500">Categoría:</span>
                          <span 
                            className="px-2 py-1 text-xs font-medium rounded text-white"
                            style={{ backgroundColor: document.categoria.color }}
                          >
                            {document.categoria.icono} {document.categoria.nombre}
                          </span>
                        </div>
                      )}
                      
                      {/* Etiquetas */}
                      {document.etiquetas && document.etiquetas.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {document.etiquetas.map((tag) => (
                            <span 
                              key={tag.id}
                              className="px-2 py-1 text-xs rounded text-white"
                              style={{ backgroundColor: tag.color }}
                            >
                              {tag.nombre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Acciones */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleView(document)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                      title="Visualizar documento"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => handleDownload(document)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                      title="Descargar documento"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => openEditForm(document)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                      title="Editar documento"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => handleDelete(document)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                      title="Eliminar documento"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de edición */}
      {showEditForm && editingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <form onSubmit={handleEditSubmit}>
              <div className="p-6">
                {/* Header del modal */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Editar Documento: {editingDocument.titulo}
                  </h3>
                  <button
                    type="button"
                    onClick={closeEditForm}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Título */}
                  <div className="md:col-span-2">
                    <label htmlFor="edit-titulo" className="block text-sm font-medium text-gray-700 mb-2">
                      Título del documento *
                    </label>
                    <input
                      type="text"
                      id="edit-titulo"
                      required
                      value={formData.titulo}
                      onChange={(e) => handleFormChange('titulo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent text-gray-900"
                    />
                  </div>

                  {/* Descripción */}
                  <div className="md:col-span-2">
                    <label htmlFor="edit-descripcion" className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      id="edit-descripcion"
                      rows={3}
                      value={formData.descripcion}
                      onChange={(e) => handleFormChange('descripcion', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent text-gray-900"
                    />
                  </div>

                  {/* Categoría */}
                  <div>
                    <label htmlFor="edit-categoria" className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría
                    </label>
                    <select
                      id="edit-categoria"
                      value={formData.categoria_id}
                      onChange={(e) => handleFormChange('categoria_id', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent text-gray-900"
                    >
                      <option value={0}>Sin categoría</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.icono} {category.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Autor */}
                  <div>
                    <label htmlFor="edit-autor" className="block text-sm font-medium text-gray-700 mb-2">
                      Autor
                    </label>
                    <input
                      type="text"
                      id="edit-autor"
                      value={formData.autor}
                      onChange={(e) => handleFormChange('autor', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent text-gray-900"
                    />
                  </div>

                  {/* Estado */}
                  <div>
                    <label htmlFor="edit-estado" className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <select
                      id="edit-estado"
                      value={formData.estado}
                      onChange={(e) => handleFormChange('estado', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent text-gray-900"
                    >
                      {documentStates.map((state) => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Visibilidad */}
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.es_publico}
                        onChange={(e) => handleFormChange('es_publico', e.target.checked)}
                        className="w-4 h-4 text-[#2e3954] bg-gray-100 border-gray-300 rounded focus:ring-[#2e3954] focus:ring-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Documento público</span>
                    </label>
                  </div>

                  {/* Etiquetas */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Etiquetas
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleTagToggle(tag.id)}
                          className={`px-3 py-1 text-sm rounded-full transition-colors ${
                            formData.etiquetas.includes(tag.id)
                              ? 'text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          style={{
                            backgroundColor: formData.etiquetas.includes(tag.id) ? tag.color : undefined
                          }}
                        >
                          {tag.nombre}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Información del archivo (solo lectura) */}
                  <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Información del archivo</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Nombre:</span> {editingDocument.nombre_archivo}
                      </div>
                      <div>
                        <span className="font-medium">Tamaño:</span> {formatFileSize(editingDocument.tamaño_archivo)}
                      </div>
                      <div>
                        <span className="font-medium">Tipo:</span> {editingDocument.tipo_mime}
                      </div>
                      <div>
                        <span className="font-medium">Descargas:</span> {editingDocument.descargas}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer del modal */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeEditForm}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.titulo.trim()}
                  className="px-4 py-2 bg-[#2e3954] text-white rounded-md hover:bg-[#1e2633] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  )}
                  <span>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 