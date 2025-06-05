'use client';

import $ from 'jquery';

if (typeof window !== 'undefined') {
  (window as any).jQuery = $;
  (window as any).$ = $;
}

import React, { useState, useEffect, useRef } from 'react';
import { Post, PostStatus } from '../../lib/bienestar/types';
import { usePosts } from '../../app/dashboard/bienestar/context/PostsContext';
// import TinyMCEEditor from '../wysiwyg/TinyMCEEditor'; // Eliminado
import { ReactSummernoteLite } from '@easylogic/react-summernote-lite';
import 'summernote/dist/summernote-lite.css';

interface PostFormProps {
  post?: Post;
  onClose: () => void;
  isEditMode?: boolean;
  onPreview?: (previewData: {
    titulo: string;
    extracto: string;
    contenido: string;
    imagenUrl: string;
    autor: string;
    fecha: string;
    categoria: string;
    categoriaColor?: string;
    destacado: boolean;
  }) => void;
}

/**
 * Componente de formulario para crear y editar posts con Summernote
 */
export default function PostForm({ post, onClose, isEditMode = false, onPreview }: PostFormProps) {
  const { addPost, updatePost, getCategories } = usePosts();
  const categories = getCategories();
  
  const [titulo, setTitulo] = useState('');
  const [extracto, setExtracto] = useState('');
  const [contenido, setContenido] = useState(''); // Aunque no lo usemos para setear en cada onChange del editor, es bueno tenerlo por si se necesita el valor inicial.
  const [categoriaId, setCategoriaId] = useState<number>(0);
  const [autor, setAutor] = useState('');
  const [fecha, setFecha] = useState('');
  const [estado, setEstado] = useState<PostStatus>('borrador');
  const [destacado, setDestacado] = useState(false);
  const [imagenUrl, setImagenUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const summernoteRef = useRef<any>(null);
  const isEditorInitializedRef = useRef(false); // Nuevo ref para controlar la inicialización del contenido
  const currentPostIdRef = useRef<string | number | undefined>(undefined); // Para detectar si el post ha cambiado

  useEffect(() => {
    // Si el post cambia (o pasamos de tener un post a no tenerlo, o viceversa),
    // reseteamos el flag de inicialización del editor.
    if (post?.id !== currentPostIdRef.current || (post && !currentPostIdRef.current) || (!post && currentPostIdRef.current)) {
      isEditorInitializedRef.current = false;
      currentPostIdRef.current = post?.id;
    }

    if (isEditMode && post) {
      setTitulo(post.titulo);
      setExtracto(post.extracto);
      setContenido(post.contenido || ''); // Guardar el contenido original en el estado de React
      setCategoriaId(post.categoriaId);
      setAutor(post.autor);
      setFecha(post.fecha);
      setEstado(post.estado);
      setDestacado(post.destacado);
      setImagenUrl(post.imagenUrl || '');
      // La carga del contenido en Summernote se hará en onInit y solo una vez
    } else {
      setTitulo('');
      setExtracto('');
      setContenido('');
      setFecha(new Date().toISOString().split('T')[0]);
      setCategoriaId(categories.length > 0 ? categories[0].id : 0);
      setAutor('');
      setEstado('borrador');
      setDestacado(false);
      setImagenUrl('');
      isEditorInitializedRef.current = false; // Resetear para el modo "nuevo post"
      if (summernoteRef.current) {
        console.log('useEffect: Clearing editor for new post mode');
        summernoteRef.current.summernote('code', '');
      }
    }
  }, [post, isEditMode, categories]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!titulo.trim()) newErrors.titulo = 'El título es obligatorio';
    if (!extracto.trim()) newErrors.extracto = 'El extracto es obligatorio';
    if (!categoriaId) newErrors.categoriaId = 'Debe seleccionar una categoría';
    if (!autor.trim()) newErrors.autor = 'El autor es obligatorio';
    if (!fecha) newErrors.fecha = 'La fecha es obligatoria';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    
    // Asegurarse de que el contenido del editor esté actualizado en el estado
    const currentEditorContent = summernoteRef.current ? summernoteRef.current.summernote('code') : contenido;

    try {
      const selectedCategory = categories.find(cat => cat.id === categoriaId);
      if (!selectedCategory) throw new Error('Categoría no válida');

      const postDataPayload = {
        titulo,
        extracto,
        contenido: currentEditorContent, // Usar el contenido del editor
        categoria_id: categoriaId,
        autor,
        estado,
        destacado,
        imagen_url: imagenUrl,
      };
      
      if (isEditMode && post) {
        await updatePost(post.id, {
            ...postDataPayload,
            categoriaId: postDataPayload.categoria_id,
            imagenUrl: postDataPayload.imagen_url,
        } as any);
      } else {
        await addPost(postDataPayload as any);
      }
      onClose();
    } catch (error) {
      console.error('Error al guardar post:', error);
      // Podrías añadir una notificación de error aquí
    } finally {
      setLoading(false);
    }
  };

  // Manejador para cambios en Summernote
  const handleSummernoteChange = (newContent: string) => {
    // No actualizamos el estado `contenido` de React aquí para evitar re-renderizados
    // que reinicien el editor. El valor se obtiene de la ref al hacer submit.
    console.log('Summernote internal onChange. New content provided:', newContent ? newContent.substring(0,50) + '...' : 'empty');
  };

  // Función para manejar la previsualización
  const handlePreview = () => {
    if (!onPreview) return;
    
    // Obtener el contenido actual del editor
    const contenidoActual = summernoteRef.current ? summernoteRef.current.summernote('code') : contenido;
    const selectedCategory = categories.find(cat => cat.id === categoriaId);
    
    const previewData = {
      titulo,
      extracto,
      contenido: contenidoActual,
      imagenUrl,
      autor,
      fecha,
      categoria: selectedCategory?.nombre || '',
      categoriaColor: selectedCategory?.color,
      destacado
    };
    
    onPreview(previewData);
  };

  // Función para manejar la subida de imágenes destacadas (input file)
  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    setImagenUrl(localPreview);
    const formData = new FormData();
    formData.append('image', file);
    try {
      setLoading(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/bienestar/posts/upload-image`, { 
        method: 'POST', 
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || 'Error al subir la imagen');
      }
      const data = await response.json();
      setImagenUrl(data.url);
      URL.revokeObjectURL(localPreview);
    } catch (error) {
      console.error('Error al subir imagen destacada:', error);
      if (imagenUrl === localPreview) setImagenUrl('');
      URL.revokeObjectURL(localPreview);
    } finally {
      setLoading(false);
    }
  };
  
  // Callback para la subida de imágenes dentro de Summernote
  const handleSummernoteImageUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    // Guardar el rango antes de la operación asíncrona
    if (summernoteRef.current) {
      summernoteRef.current.summernote('saveRange');
    }

    const formData = new FormData();
    formData.append('image', file);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/bienestar/posts/upload-image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || 'Error al subir la imagen desde el editor');
      }
      const data = await response.json();
      
      // Restaurar el rango, enfocar e insertar imagen en Summernote
      if (summernoteRef.current) {
        summernoteRef.current.summernote('restoreRange');
        summernoteRef.current.summernote('focus'); // Re-enfocar el editor
        summernoteRef.current.summernote('insertImage', data.url);
      }
    } catch (error) {
      console.error('Error en handleSummernoteImageUpload:', error);
      // Podrías mostrar una notificación al usuario aquí
      // Si hubo un error, también podría ser útil restaurar el rango si se guardó
      if (summernoteRef.current) {
        summernoteRef.current.summernote('restoreRange'); 
        summernoteRef.current.summernote('focus'); 
      }
    }
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
        <ReactSummernoteLite
          key="summernote-contenido"
          id="summernote-contenido"
          onInit={({ note }: any) => {
            console.log('Summernote onInit called. isEditorInitializedRef:', isEditorInitializedRef.current, 'isEditMode:', isEditMode);
            summernoteRef.current = note;
            if (isEditMode && post && post.contenido && !isEditorInitializedRef.current && summernoteRef.current) {
              console.log('Setting editor content in onInit (edit mode - first time):', post.contenido.substring(0,50) + '...');
              summernoteRef.current.summernote('code', post.contenido);
              isEditorInitializedRef.current = true;
            } else if (!isEditMode && !isEditorInitializedRef.current && summernoteRef.current) {
              console.log('Setting editor to empty in onInit (new mode - first time).');
              summernoteRef.current.summernote('code', '');
              isEditorInitializedRef.current = true; // También marcar como inicializado para modo nuevo
            } else if (summernoteRef.current) {
              // Si ya está inicializado y volvemos a onInit (ej. por un HMR), 
              // restaurar el contenido actual del editor para no perderlo.
              // Pero OJO: esto puede ser complicado si el contenido real que queremos es el del `post` que acaba de cambiar.
              // Por ahora, priorizamos no perder lo que el usuario ya escribió si es un HMR.
              console.log('onInit after already initialized. Content in ref:', summernoteRef.current.summernote('code').substring(0,50)+'...');
            }
          }}
          onChange={(content: string) => {
            handleSummernoteChange(content);
          }}
          toolbar={[
            ['style', ['style']],
            ['font', ['bold', 'underline', 'clear']],
            ['color', ['color']],
            ['para', ['ul', 'ol', 'paragraph']],
            ['table', ['table']],
            ['insert', ['link', 'picture', 'video']],
            ['view', ['fullscreen', 'codeview', 'help']]
          ]}
          onImageUpload={handleSummernoteImageUpload}
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
            Imagen destacada
          </label>
          <div className="flex flex-col space-y-2">
            <div className="flex space-x-2">
              <input
                type="text"
                id="imagenUrl"
                value={imagenUrl}
                onChange={(e) => setImagenUrl(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-800 bg-white"
                placeholder="URL de la imagen destacada"
              />
              <label 
                htmlFor="fileUpload" 
                className="px-3 py-2 bg-[#2e3954] text-white rounded-lg cursor-pointer hover:bg-opacity-90 transition flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                Subir
              </label>
              <input
                type="file"
                id="fileUpload"
                accept="image/*"
                onChange={handleFeaturedImageUpload} // Cambiado aquí
                className="hidden"
              />
            </div>
            
            {imagenUrl && (
              <div className="mt-2 relative">
                <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={imagenUrl} 
                    alt="Vista previa" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImagenUrl('')}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    title="Eliminar imagen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
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
        {onPreview && (
          <button
            type="button"
            onClick={handlePreview}
            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 rounded-lg font-medium text-white transition flex items-center"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            Previsualizar
          </button>
        )}
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