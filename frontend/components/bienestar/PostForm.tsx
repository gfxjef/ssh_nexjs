'use client';

import React, { useState, useEffect } from 'react';
import { Post, Category, PostStatus } from '../../lib/bienestar/types';
import { usePosts } from '../../app/dashboard/bienestar/context/PostsContext';
import TinyMCEEditor from '../wysiwyg/TinyMCEEditor';

interface PostFormProps {
  post?: Post;
  onClose: () => void;
  isEditMode?: boolean;
}

/**
 * Componente de formulario para crear y editar posts
 */
export default function PostForm({ post, onClose, isEditMode = false }: PostFormProps) {
  const { addPost, updatePost, getCategories } = usePosts();
  const categories = getCategories();
  
  // Estados del formulario
  const [titulo, setTitulo] = useState('');
  const [extracto, setExtracto] = useState('');
  const [contenido, setContenido] = useState('');
  const [categoriaId, setCategoriaId] = useState<number>(0);
  const [autor, setAutor] = useState('');
  const [fecha, setFecha] = useState('');
  const [estado, setEstado] = useState<PostStatus>('borrador');
  const [destacado, setDestacado] = useState(false);
  const [imagenUrl, setImagenUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar datos del post si estamos en modo edición
  useEffect(() => {
    if (isEditMode && post) {
      setTitulo(post.titulo);
      setExtracto(post.extracto);
      setContenido(post.contenido || '');
      setCategoriaId(post.categoriaId);
      setAutor(post.autor);
      setFecha(post.fecha);
      setEstado(post.estado);
      setDestacado(post.destacado);
      setImagenUrl(post.imagenUrl || '');
    } else {
      // Valores por defecto para modo creación
      setFecha(new Date().toISOString().split('T')[0]);
      setCategoriaId(categories.length > 0 ? categories[0].id : 0);
    }
  }, [post, isEditMode, categories]);

  // Validar el formulario
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!titulo.trim()) {
      newErrors.titulo = 'El título es obligatorio';
    }
    
    if (!extracto.trim()) {
      newErrors.extracto = 'El extracto es obligatorio';
    }
    
    if (!categoriaId) {
      newErrors.categoriaId = 'Debe seleccionar una categoría';
    }
    
    if (!autor.trim()) {
      newErrors.autor = 'El autor es obligatorio';
    }
    
    if (!fecha) {
      newErrors.fecha = 'La fecha es obligatoria';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Obtener la categoría seleccionada para obtener su nombre
      const selectedCategory = categories.find(cat => cat.id === categoriaId);
      
      if (!selectedCategory) {
        throw new Error('Categoría no válida');
      }
      
      const postData = {
        titulo,
        extracto,
        contenido,
        categoriaId,
        categoria: selectedCategory.nombre,
        autor,
        fecha,
        estado,
        destacado,
        imagenUrl,
        vistas: isEditMode && post ? post.vistas : 0
      };
      
      if (isEditMode && post) {
        await updatePost(post.id, postData);
      } else {
        await addPost(postData);
      }
      
      onClose();
    } catch (error) {
      console.error('Error al guardar post:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio en el editor de contenido
  const handleEditorChange = (value: string) => {
    setContenido(value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="titulo" className="block text-sm font-medium text-[#2e3954] mb-1">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg text-gray-800 bg-white ${errors.titulo ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Escribe el título del post"
        />
        {errors.titulo && <p className="mt-1 text-sm text-red-500">{errors.titulo}</p>}
      </div>

      <div>
        <label htmlFor="extracto" className="block text-sm font-medium text-[#2e3954] mb-1">
          Extracto <span className="text-red-500">*</span>
        </label>
        <textarea
          id="extracto"
          value={extracto}
          onChange={(e) => setExtracto(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg text-gray-800 bg-white ${errors.extracto ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Escribe un breve extracto del post"
          rows={2}
        />
        {errors.extracto && <p className="mt-1 text-sm text-red-500">{errors.extracto}</p>}
      </div>

      <div>
        <label htmlFor="contenido" className="block text-sm font-medium text-[#2e3954] mb-1">
          Contenido
        </label>
        <TinyMCEEditor 
          value={contenido}
          onChange={handleEditorChange}
          placeholder="Escribe el contenido completo del post"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="categoria" className="block text-sm font-medium text-[#2e3954] mb-1">
            Categoría <span className="text-red-500">*</span>
          </label>
          <select
            id="categoria"
            value={categoriaId}
            onChange={(e) => setCategoriaId(Number(e.target.value))}
            className={`w-full px-3 py-2 border rounded-lg text-gray-800 bg-white ${errors.categoriaId ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value={0} disabled>Seleccionar categoría</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.nombre}
              </option>
            ))}
          </select>
          {errors.categoriaId && <p className="mt-1 text-sm text-red-500">{errors.categoriaId}</p>}
        </div>

        <div>
          <label htmlFor="autor" className="block text-sm font-medium text-[#2e3954] mb-1">
            Autor <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="autor"
            value={autor}
            onChange={(e) => setAutor(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-gray-800 bg-white ${errors.autor ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Nombre del autor"
          />
          {errors.autor && <p className="mt-1 text-sm text-red-500">{errors.autor}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="fecha" className="block text-sm font-medium text-[#2e3954] mb-1">
            Fecha <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="fecha"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-gray-800 bg-white ${errors.fecha ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.fecha && <p className="mt-1 text-sm text-red-500">{errors.fecha}</p>}
        </div>

        <div>
          <label htmlFor="estado" className="block text-sm font-medium text-[#2e3954] mb-1">
            Estado
          </label>
          <select
            id="estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as PostStatus)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-800 bg-white"
          >
            <option value="borrador">Borrador</option>
            <option value="publicado">Publicado</option>
            <option value="archivado">Archivado</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="imagenUrl" className="block text-sm font-medium text-[#2e3954] mb-1">
            URL de la imagen destacada
          </label>
          <input
            type="text"
            id="imagenUrl"
            value={imagenUrl}
            onChange={(e) => setImagenUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-800 bg-white"
            placeholder="URL de la imagen destacada (opcional)"
          />
        </div>

        <div className="flex items-end">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={destacado}
              onChange={(e) => setDestacado(e.target.checked)}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            <span className="ms-3 text-sm font-medium text-gray-800">Destacado</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-gray-700 transition"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-white transition"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Guardando...
            </span>
          ) : (
            isEditMode ? 'Actualizar post' : 'Crear post'
          )}
        </button>
      </div>
    </form>
  );
} 