'use client';

import React, { useState, useCallback } from 'react';
import { Document, DocumentCategory, DocumentTag } from '../../types';
import { GroupSelector } from '../../components';
import { documentsApi, handleApiError } from '../../lib/api';

interface FileUploaderProps {
  categories: DocumentCategory[];
  tags: DocumentTag[];
  onDocumentUploaded: (document: Document) => void;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  preview?: string;
}

interface DocumentFormData {
  titulo: string;
  descripcion: string;
  categoria_id: number;
  etiquetas: number[];
  es_publico: boolean;
  autor: string;
  grupo: 'kossodo' | 'kossomet' | 'grupo_kossodo';
}

/**
 * Componente para subir archivos con drag & drop y formulario de metadatos
 */
export default function FileUploader({ categories, tags, onDocumentUploaded }: FileUploaderProps) {
  // Estados del componente
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [formData, setFormData] = useState<DocumentFormData>({
    titulo: '',
    descripcion: '',
    categoria_id: 0,
    etiquetas: [],
    es_publico: true,
    autor: 'Usuario Actual', // En implementación real, obtener del contexto de usuario
    grupo: 'grupo_kossodo' // Valor por defecto
  });

  // Tipos de archivo permitidos
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Formatos de imagen ampliados
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
    'image/svg+xml',
    'image/tiff',
    'image/tif',
    'image/ico',
    'image/x-icon',
    // Otros tipos
    'text/plain',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ];

  // Tamaño máximo: 10MB
  const maxFileSize = 10 * 1024 * 1024;

  // Función para validar archivos
  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `Tipo de archivo no permitido: ${file.type}`;
    }
    if (file.size > maxFileSize) {
      return `El archivo es demasiado grande. Máximo: ${formatFileSize(maxFileSize)}`;
    }
    return null;
  };

  // Función para formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Función para obtener icono según tipo de archivo
  const getFileIcon = (file: File): string => {
    const type = file.type;
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('powerpoint') || type.includes('presentation')) return '📈';
    if (type.includes('image')) return '🖼️';
    if (type.includes('zip') || type.includes('rar')) return '🗜️';
    return '📎';
  };

  // Manejar selección de archivos
  const handleFileSelect = useCallback((files: FileList) => {
    const newFiles: UploadFile[] = [];
    
    Array.from(files).forEach((file) => {
      const error = validateFile(file);
      const id = Math.random().toString(36).substr(2, 9);
      
             const uploadFile: UploadFile = {
         file,
         id,
         progress: 0,
         status: error ? 'error' : 'pending',
         error: error || undefined
       };

      // Crear preview para imágenes
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadFiles(prev => prev.map(f => 
            f.id === id ? { ...f, preview: e.target?.result as string } : f
          ));
        };
        reader.readAsDataURL(file);
      }

      newFiles.push(uploadFile);
    });

    setUploadFiles(prev => [...prev, ...newFiles]);
  }, []);

  // Manejar drag & drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // Manejar cambio de input file
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Limpiar el input para permitir seleccionar el mismo archivo otra vez
    e.target.value = '';
  };

  // Remover archivo de la lista
  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  // Manejar cambios en el formulario
  const handleFormChange = (field: keyof DocumentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Manejar toggle de etiquetas
  const handleTagToggle = (tagId: number) => {
    setFormData(prev => ({
      ...prev,
      etiquetas: prev.etiquetas.includes(tagId)
        ? prev.etiquetas.filter(id => id !== tagId)
        : [...prev.etiquetas, tagId]
    }));
  };

  // Subir archivo usando API real
  const uploadFileAsync = async (uploadFile: UploadFile): Promise<Document> => {
    try {
      // Actualizar estado a uploading
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      // Crear documento con archivo usando la API real
      const response = await documentsApi.createDocumentWithFile({
        titulo: formData.titulo || uploadFile.file.name,
        descripcion: formData.descripcion || '',
        categoria_id: formData.categoria_id,
        etiquetas: formData.etiquetas,
        es_publico: formData.es_publico,
        grupo: formData.grupo,
        file: uploadFile.file
      });

      // Simular progreso visual (la API real no proporciona progreso en tiempo real)
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 20;
        if (progress >= 100) {
          clearInterval(progressInterval);
        }
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, progress: Math.min(progress, 100) } : f
        ));
      }, 100);

      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  };

    // Procesar subida de archivos
  const handleUpload = async () => {
    if (uploadFiles.length === 0 || isUploading) return;
    
    // Validar que se haya seleccionado una categoría
    if (formData.categoria_id === 0) {
      alert('Por favor selecciona una categoría antes de subir los archivos.');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Subir archivos uno por uno
      for (let i = 0; i < uploadFiles.length; i++) {
        const uploadFile = uploadFiles[i];
        if (uploadFile.status === 'error') continue;
        
        try {
          const document = await uploadFileAsync(uploadFile);
          
          setUploadFiles(prev => prev.map(f => 
            f.id === uploadFile.id ? { ...f, status: 'success', progress: 100 } : f
          ));
          
          onDocumentUploaded(document);
          
        } catch (error) {
          setUploadFiles(prev => prev.map(f => 
            f.id === uploadFile.id ? { ...f, status: 'error', error: handleApiError(error) } : f
          ));
        }
      }
      
      // Limpiar archivos exitosos después de un tiempo
      setTimeout(() => {
        setUploadFiles(prev => prev.filter(f => f.status !== 'success'));
      }, 2000);
      
    } finally {
      setIsUploading(false);
    }
  };

  // Limpiar todos los archivos
  const clearFiles = () => {
    setUploadFiles([]);
    setShowMetadataForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Área de drag & drop */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-[#2e3954] bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          type="file"
          multiple
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept={allowedTypes.join(',')}
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Arrastra archivos aquí o haz clic para seleccionar
            </h3>
            <p className="text-sm text-gray-500">
              Tipos permitidos: PDF, Word, Excel, PowerPoint, Imágenes, ZIP<br />
              Tamaño máximo: {formatFileSize(maxFileSize)}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de archivos seleccionados */}
      {uploadFiles.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Archivos seleccionados ({uploadFiles.length})
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowMetadataForm(!showMetadataForm)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {showMetadataForm ? 'Ocultar' : 'Configurar'} Metadatos
              </button>
              <button
                onClick={clearFiles}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Limpiar Todo
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            {uploadFiles.map((uploadFile) => (
              <div key={uploadFile.id} className="flex items-center space-x-4 p-3 bg-white rounded border">
                <div className="text-2xl">{getFileIcon(uploadFile.file)}</div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(uploadFile.file.size)} • {uploadFile.file.type}
                  </p>
                  
                  {/* Barra de progreso */}
                  {uploadFile.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${uploadFile.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Estado del archivo */}
                  {uploadFile.status === 'error' && (
                    <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                  )}
                  {uploadFile.status === 'success' && (
                    <p className="text-xs text-green-600 mt-1">✓ Subido exitosamente</p>
                  )}
                </div>
                
                {/* Preview para imágenes */}
                {uploadFile.preview && (
                  <img 
                    src={uploadFile.preview} 
                    alt="Preview" 
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                
                {/* Estado visual */}
                <div className="flex items-center space-x-2">
                  {uploadFile.status === 'pending' && (
                    <div className="w-5 h-5 rounded-full bg-gray-300" />
                  )}
                  {uploadFile.status === 'uploading' && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 animate-pulse" />
                  )}
                  {uploadFile.status === 'success' && (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {uploadFile.status === 'error' && (
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  
                  <button
                    onClick={() => removeFile(uploadFile.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario de metadatos */}
      {showMetadataForm && uploadFiles.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Metadatos del Documento</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Título */}
            <div className="md:col-span-2">
              <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-2">
                Título del documento
              </label>
              <input
                type="text"
                id="titulo"
                value={formData.titulo}
                onChange={(e) => handleFormChange('titulo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent"
                placeholder="Dejar vacío para usar el nombre del archivo"
              />
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                id="descripcion"
                rows={3}
                value={formData.descripcion}
                onChange={(e) => handleFormChange('descripcion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent"
                placeholder="Descripción opcional del documento"
              />
            </div>

            {/* Categoría */}
            <div>
              <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-2">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                id="categoria"
                value={formData.categoria_id}
                onChange={(e) => handleFormChange('categoria_id', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent ${
                  formData.categoria_id === 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                required
              >
                <option value={0}>Seleccionar categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icono} {category.nombre}
                  </option>
                ))}
              </select>
              {formData.categoria_id === 0 && (
                <p className="text-xs text-red-600 mt-1">La categoría es obligatoria para subir documentos</p>
              )}
            </div>

            {/* Autor */}
            <div>
              <label htmlFor="autor" className="block text-sm font-medium text-gray-700 mb-2">
                Autor
              </label>
              <input
                type="text"
                id="autor"
                value={formData.autor}
                onChange={(e) => handleFormChange('autor', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent"
              />
            </div>

            {/* Grupo Empresarial */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grupo Empresarial
              </label>
              <GroupSelector
                selectedGroup={formData.grupo}
                onGroupChange={(grupo: 'kossodo' | 'kossomet' | 'grupo_kossodo') => handleFormChange('grupo', grupo)}
                size="md"
                placeholder="Seleccionar grupo empresarial"
                className="w-full"
                required
              />
            </div>

            {/* Visibilidad */}
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.es_publico}
                  onChange={(e) => handleFormChange('es_publico', e.target.checked)}
                  className="w-4 h-4 text-[#2e3954] bg-gray-100 border-gray-300 rounded focus:ring-[#2e3954] focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">Documento público</span>
              </label>
              <p className="text-xs text-gray-500 ml-6">Los documentos públicos pueden ser vistos por todos los usuarios</p>
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
          </div>
        </div>
      )}

      {/* Botones de acción */}
      {uploadFiles.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {uploadFiles.filter(f => f.status === 'pending').length} archivo(s) listo(s) para subir
            {formData.categoria_id === 0 && uploadFiles.filter(f => f.status === 'pending').length > 0 && (
              <span className="text-red-600 ml-2">• Categoría requerida</span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={clearFiles}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isUploading}
            >
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading || uploadFiles.filter(f => f.status === 'pending').length === 0 || formData.categoria_id === 0}
              className="px-6 py-2 bg-[#2e3954] text-white rounded-md hover:bg-[#1e2633] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              title={formData.categoria_id === 0 ? 'Selecciona una categoría para habilitar la subida' : ''}
            >
              {isUploading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              )}
              <span>{isUploading ? 'Subiendo...' : 'Subir Documentos'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 