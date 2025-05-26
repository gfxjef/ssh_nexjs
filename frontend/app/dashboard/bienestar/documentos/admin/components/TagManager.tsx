'use client';

import React, { useState } from 'react';
import { DocumentTag } from '../../types';

interface TagManagerProps {
  tags: DocumentTag[];
  onTagCreated: (tag: DocumentTag) => void;
  onTagUpdated: (tag: DocumentTag) => void;
  onTagDeleted: (tagId: number) => void;
}

interface TagFormData {
  nombre: string;
  color: string;
}

/**
 * Componente para gestión completa de etiquetas de documentos
 */
export default function TagManager({
  tags,
  onTagCreated,
  onTagUpdated,
  onTagDeleted,
}: TagManagerProps) {
  // Estados del componente
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<DocumentTag | null>(null);
  const [formData, setFormData] = useState<TagFormData>({
    nombre: '',
    color: '#3182CE'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Colores predefinidos para etiquetas
  const predefinedColors = [
    { name: 'Azul', value: '#3182CE' },
    { name: 'Verde', value: '#38A169' },
    { name: 'Rojo', value: '#E53E3E' },
    { name: 'Naranja', value: '#DD6B20' },
    { name: 'Morado', value: '#805AD5' },
    { name: 'Rosa', value: '#D53F8C' },
    { name: 'Amarillo', value: '#D69E2E' },
    { name: 'Gris', value: '#4A5568' },
    { name: 'Índigo', value: '#4C51BF' },
    { name: 'Teal', value: '#319795' },
    { name: 'Cyan', value: '#0891B2' },
    { name: 'Lima', value: '#65A30D' },
    { name: 'Esmeralda', value: '#059669' },
    { name: 'Violeta', value: '#7C3AED' },
    { name: 'Fucsia', value: '#C026D3' }
  ];

  // Filtrar etiquetas por búsqueda
  const filteredTags = tags.filter(tag =>
    tag.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Manejar cambios en el formulario
  const handleFormChange = (field: keyof TagFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Abrir formulario para nueva etiqueta
  const openCreateForm = () => {
    setEditingTag(null);
    setFormData({
      nombre: '',
      color: '#3182CE'
    });
    setShowForm(true);
  };

  // Abrir formulario para editar etiqueta
  const openEditForm = (tag: DocumentTag) => {
    setEditingTag(tag);
    setFormData({
      nombre: tag.nombre,
      color: tag.color
    });
    setShowForm(true);
  };

  // Cerrar formulario
  const closeForm = () => {
    setShowForm(false);
    setEditingTag(null);
    setFormData({
      nombre: '',
      color: '#3182CE'
    });
  };

  // Validar formulario
  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.nombre.trim()) {
      errors.push('El nombre es requerido');
    }
    
    if (formData.nombre.length > 30) {
      errors.push('El nombre no puede tener más de 30 caracteres');
    }
    
    // Verificar nombre duplicado
    const existingTag = tags.find(tag => 
      tag.nombre.toLowerCase() === formData.nombre.toLowerCase() &&
      (!editingTag || tag.id !== editingTag.id)
    );
    
    if (existingTag) {
      errors.push('Ya existe una etiqueta con ese nombre');
    }
    
    return errors;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      alert('Errores en el formulario:\n' + errors.join('\n'));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (editingTag) {
        // Actualizar etiqueta existente
        const updatedTag: DocumentTag = {
          ...editingTag,
          ...formData,
          updated_at: new Date().toISOString()
        };
        onTagUpdated(updatedTag);
      } else {
        // Crear nueva etiqueta
        const newTag: DocumentTag = {
          id: Date.now(), // En implementación real, el backend asignaría el ID
          ...formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        onTagCreated(newTag);
      }
      
      closeForm();
    } catch (error) {
      console.error('Error al guardar etiqueta:', error);
      alert('Error al guardar la etiqueta');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar eliminación de etiqueta
  const handleDelete = async (tag: DocumentTag) => {
    const confirmed = confirm(
      `¿Estás seguro de que deseas eliminar la etiqueta "${tag.nombre}"?\n\n` +
      'Se eliminará de todos los documentos que la tengan asignada.'
    );
    
    if (!confirmed) return;
    
    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 300));
      onTagDeleted(tag.id);
    } catch (error) {
      console.error('Error al eliminar etiqueta:', error);
      alert('Error al eliminar la etiqueta');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con búsqueda y botón crear */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Gestión de Etiquetas</h2>
          <p className="text-sm text-gray-600">
            Administra las etiquetas para clasificar y filtrar los documentos
          </p>
        </div>
        
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-[#2e3954] text-white rounded-md hover:bg-[#1e2633] transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nueva Etiqueta</span>
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Buscar etiquetas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Vista de etiquetas */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {filteredTags.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay etiquetas</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No se encontraron etiquetas que coincidan con la búsqueda.' : 'Comienza creando una nueva etiqueta.'}
            </p>
          </div>
        ) : (
          <>
            {/* Grid de etiquetas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTags.map((tag) => (
                <div key={tag.id} className="group relative">
                  {/* Etiqueta visual */}
                  <div 
                    className="px-3 py-2 rounded-full text-white text-sm font-medium text-center cursor-pointer transition-transform group-hover:scale-105"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.nombre}
                  </div>
                  
                  {/* Información adicional */}
                  <div className="mt-2 text-center">
                    <div className="text-xs text-gray-500">
                      Creada: {new Date(tag.created_at).toLocaleDateString('es-ES')}
                    </div>
                    {tag.updated_at !== tag.created_at && (
                      <div className="text-xs text-gray-500">
                        Actualizada: {new Date(tag.updated_at).toLocaleDateString('es-ES')}
                      </div>
                    )}
                  </div>
                  
                  {/* Botones de acción */}
                  <div className="absolute top-0 right-0 translate-x-1 -translate-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => openEditForm(tag)}
                        className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        title="Editar etiqueta"
                      >
                        <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => handleDelete(tag)}
                        className="p-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-red-50 hover:border-red-300 transition-colors"
                        title="Eliminar etiqueta"
                      >
                        <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Información estadística */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                <strong>{filteredTags.length}</strong> etiqueta(s) {searchTerm && 'encontrada(s)'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal/Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                {/* Header del modal */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingTag ? 'Editar Etiqueta' : 'Nueva Etiqueta'}
                  </h3>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Nombre */}
                  <div>
                    <label htmlFor="tag-nombre" className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la etiqueta *
                    </label>
                    <input
                      type="text"
                      id="tag-nombre"
                      required
                      maxLength={30}
                      value={formData.nombre}
                      onChange={(e) => handleFormChange('nombre', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent"
                      placeholder="Ej: Importante, Confidencial, Draft..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.nombre.length}/30 caracteres
                    </p>
                  </div>

                  {/* Selección de color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color de la etiqueta
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {predefinedColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => handleFormChange('color', color.value)}
                          className={`p-3 rounded border-2 transition-all ${
                            formData.color === color.value
                              ? 'border-gray-800 scale-110'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                    
                    {/* Input de color personalizado */}
                    <div className="mt-3">
                      <label htmlFor="custom-tag-color" className="block text-xs text-gray-500 mb-1">
                        O selecciona un color personalizado:
                      </label>
                      <input
                        type="color"
                        id="custom-tag-color"
                        value={formData.color}
                        onChange={(e) => handleFormChange('color', e.target.value)}
                        className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vista previa
                    </label>
                    <div className="flex justify-center">
                      <span 
                        className="px-4 py-2 rounded-full text-white text-sm font-medium"
                        style={{ backgroundColor: formData.color }}
                      >
                        {formData.nombre || 'Nombre de la etiqueta'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer del modal */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.nombre.trim()}
                  className="px-4 py-2 bg-[#2e3954] text-white rounded-md hover:bg-[#1e2633] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  )}
                  <span>{editingTag ? 'Actualizar' : 'Crear'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 