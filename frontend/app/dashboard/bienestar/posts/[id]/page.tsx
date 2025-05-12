'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePosts } from '../../context/PostsContext';
import CategoryBadge from '../../../../../components/bienestar/CategoryBadge';
import Notifications from '../../../../../components/bienestar/Notifications';
import { Post } from '../../../../../lib/bienestar/types';

export default function PostDetail() {
  const params = useParams();
  const router = useRouter();
  const postId = Number(params.id);
  
  const { getPostById, getCategoryById, loading } = usePosts();
  // Inicializamos el estado con tipo Post | undefined
  const [post, setPost] = useState<Post | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  
  // Obtenemos el post usando useEffect para evitar la actualización durante el renderizado
  useEffect(() => {
    const fetchPost = () => {
      if (postId) {
        const postData = getPostById(postId);
        setPost(postData);
        setIsLoading(false);
      }
    };
    
    fetchPost();
  }, [postId, getPostById]);
  
  // Si no se encontró el post, redirigir a la lista de posts
  useEffect(() => {
    if (!isLoading && !loading && !post) {
      router.push('/dashboard/bienestar/posts');
    }
  }, [post, loading, isLoading, router]);
  
  // Formatear fecha
  const formatearFecha = (fechaString: string) => {
    if (!fechaString) return '';
    
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  
  // Si está cargando o no se encuentra el post
  if (loading || isLoading || !post) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2e3954]"></div>
      </div>
    );
  }
  
  // Obtener la categoría
  const category = getCategoryById(post.categoriaId);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
        <Notifications />
        
        {/* Botón de regreso */}
        <button 
          onClick={() => router.back()}
          className="mb-6 flex items-center text-[#2e3954] hover:underline"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Volver a Posts
        </button>
        
        {/* Imagen destacada */}
        {post.imagenUrl && (
          <div className="h-64 md:h-96 bg-gray-200 relative rounded-lg overflow-hidden mb-6">
            <div 
              className="absolute inset-0 bg-cover bg-center" 
              style={{ backgroundImage: `url(${post.imagenUrl})` }}
            />
          </div>
        )}
        
        {/* Cabecera del post */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              {category && (
                <CategoryBadge 
                  category={category}
                  className="text-sm"
                />
              )}
              {post.destacado && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                  <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Destacado
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {formatearFecha(post.fecha)}
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-[#2e3954] mb-4">{post.titulo}</h1>
          
          <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
            <div>Por <span className="font-medium">{post.autor}</span></div>
            <div>{post.vistas.toLocaleString()} lecturas</div>
          </div>
          
          <p className="text-lg text-gray-700 italic border-l-4 border-[#2e3954] pl-4 py-2 bg-gray-50 rounded-sm">
            {post.extracto}
          </p>
        </div>
        
        {/* Contenido del post */}
        <div className="prose prose-lg max-w-none text-gray-800">
          {post.contenido ? (
            <div className="text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: post.contenido }}></div>
          ) : (
            <div className="text-gray-600 italic">
              Este post no tiene contenido detallado disponible.
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 