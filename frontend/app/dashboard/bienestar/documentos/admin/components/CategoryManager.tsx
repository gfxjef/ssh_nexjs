'use client';

import React, { useState } from 'react';
import { DocumentCategory } from '../../types';

interface CategoryManagerProps {
  categories: DocumentCategory[];
  onCategoryCreated: (category: DocumentCategory) => void;
  onCategoryUpdated: (category: DocumentCategory) => void;
  onCategoryDeleted: (categoryId: number) => void;
}

interface CategoryFormData {
  nombre: string;
  descripcion: string;
  color: string;
  icono: string;
}

/**
 * Componente para gestión completa de categorías de documentos
 */
export default function CategoryManager({
  categories,
  onCategoryCreated,
  onCategoryUpdated,
  onCategoryDeleted,
}: CategoryManagerProps) {
  // Estados del componente
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    nombre: '',
    descripcion: '',
    color: '#3182CE',
    icono: '📁'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Colores predefinidos para categorías
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
    { name: 'Teal', value: '#319795' }
  ];

  // Iconos predefinidos
  const predefinedIcons = [
    '📁', '📋', '🏷️', '📊', '📈', '📉', '💼', '📝', '🗂️', '📂',
    '📄', '📑', '📖', '📚', '📓', '📒', '📕', '📗', '📘', '📙',
    '💰', '⚖️', '🏥', '🎓', '🔧', '⚙️', '🛠️', '📢', '👥', '🏢'
  ];

  // Filtrar categorías por búsqueda
  const filteredCategories = categories.filter(category =>
    category.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Manejar cambios en el formulario
  const handleFormChange = (field: keyof CategoryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Abrir formulario para nueva categoría
  const openCreateForm = () => {
    setEditingCategory(null);
    setFormData({
      nombre: '',
      descripcion: '',
      color: '#3182CE',
      icono: '📁'
    });
    setShowForm(true);
  };

  // Abrir formulario para editar categoría
  const openEditForm = (category: DocumentCategory) => {
    setEditingCategory(category);
    setFormData({
      nombre: category.nombre,
      descripcion: category.descripcion,
      color: category.color,
      icono: category.icono
    });
    setShowForm(true);
  };

  // Cerrar formulario
  const closeForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({
      nombre: '',
      descripcion: '',
      color: '#3182CE',
      icono: '📁'
    });
  };

  // Validar formulario
  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.nombre.trim()) {
      errors.push('El nombre es requerido');
    }
    
    if (formData.nombre.length > 50) {
      errors.push('El nombre no puede tener más de 50 caracteres');
    }
    
    if (formData.descripcion.length > 200) {
      errors.push('La descripción no puede tener más de 200 caracteres');
    }
    
    // Verificar nombre duplicado
    const existingCategory = categories.find(cat => 
      cat.nombre.toLowerCase() === formData.nombre.toLowerCase() &&
      (!editingCategory || cat.id !== editingCategory.id)
    );
    
    if (existingCategory) {
      errors.push('Ya existe una categoría con ese nombre');
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
      
      if (editingCategory) {
        // Actualizar categoría existente
        const updatedCategory: DocumentCategory = {
          ...editingCategory,
          ...formData,
          updated_at: new Date().toISOString()
        };
        onCategoryUpdated(updatedCategory);
      } else {
        // Crear nueva categoría
        const newCategory: DocumentCategory = {
          id: Date.now(), // En implementación real, el backend asignaría el ID
          ...formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        onCategoryCreated(newCategory);
      }
      
      closeForm();
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      alert('Error al guardar la categoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar eliminación de categoría
  const handleDelete = async (category: DocumentCategory) => {
    const confirmed = confirm(
      `¿Estás seguro de que deseas eliminar la categoría "${category.nombre}"?\n\n` +
      'Los documentos asociados quedarán sin categoría.'
    );
    
    if (!confirmed) return;
    
    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 300));
      onCategoryDeleted(category.id);
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      alert('Error al eliminar la categoría');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con búsqueda y botón crear */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Gestión de Categorías</h2>
          <p className="text-sm text-gray-600">
            Administra las categorías para organizar los documentos
          </p>
        </div>
        
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-[#2e3954] text-white rounded-md hover:bg-[#1e2633] transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nueva Categoría</span>
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Buscar categorías..."
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

      {/* Lista de categorías */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay categorías</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No se encontraron categorías que coincidan con la búsqueda.' : 'Comienza creando una nueva categoría.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredCategories.map((category) => (
              <div key={category.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Icono y color de categoría */}
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl"
                      style={{ backgroundColor: category.color }}
                    >
                      {category.icono}
                    </div>
                    
                    {/* Información de categoría */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{category.nombre}</h3>
                      {category.descripcion && (
                        <p className="text-sm text-gray-600 mt-1">{category.descripcion}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Creada: {new Date(category.created_at).toLocaleDateString('es-ES')}</span>
                        <span>Actualizada: {new Date(category.updated_at).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Acciones */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditForm(category)}
                      className="p-2 text-gray-600 hover:bg-blue-100 hover:text-blue-600 rounded-md transition-colors"
                      title="Editar categoría"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => handleDelete(category)}
                      className="p-2 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded-md transition-colors"
                      title="Eliminar categoría"
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

      {/* Modal/Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                {/* Header del modal */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
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
                    <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la categoría *
                    </label>
                    <input
                      type="text"
                      id="nombre"
                      required
                      maxLength={50}
                      value={formData.nombre}
                      onChange={(e) => handleFormChange('nombre', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent"
                      placeholder="Ej: Marketing, RRHH, Finanzas..."
                    />
                  </div>

                  {/* Descripción */}
                  <div>
                    <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      id="descripcion"
                      rows={3}
                      maxLength={200}
                      value={formData.descripcion}
                      onChange={(e) => handleFormChange('descripcion', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent"
                      placeholder="Descripción opcional de la categoría"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.descripcion.length}/200 caracteres
                    </p>
                  </div>

                  {/* Selección de icono */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icono
                    </label>
                    <div className="grid grid-cols-10 gap-2">
                      {predefinedIcons.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => handleFormChange('icono', icon)}
                          className={`p-2 text-lg rounded border-2 transition-colors ${
                            formData.icono === icon
                              ? 'border-[#2e3954] bg-blue-50'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selección de color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
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
                    <div className="mt-2">
                      <label htmlFor="custom-color" className="block text-xs text-gray-500 mb-1">
                        Color personalizado:
                      </label>
                      <input
                        type="color"
                        id="custom-color"
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
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: formData.color }}
                      >
                        {formData.icono}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {formData.nombre || 'Nombre de la categoría'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formData.descripcion || 'Descripción de la categoría'}
                        </p>
                      </div>
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
                  <span>{editingCategory ? 'Actualizar' : 'Crear'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 