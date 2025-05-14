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
  
  const { getPostById, getCategoryById, loading: contextLoading, posts: allPostsFromContext } = usePosts();
  
  const [currentPost, setCurrentPost] = useState<Post | undefined | null>(undefined); // undefined: aún no buscado, null: no encontrado
  const [pageLoading, setPageLoading] = useState(true);
  
  useEffect(() => {
    console.log("PostDetail EFFECT: Ejecutándose. Params:", params, "ContextLoading:", contextLoading);
    setPageLoading(true); // Siempre empezamos asumiendo que cargaremos algo o decidiremos.

    if (!params || typeof params.id !== 'string') {
      // Si params no está listo o id no es string, esperamos.
      // Si params.id es explícitamente undefined después de que params está disponible, es un problema.
      if (params && params.id === undefined) {
        console.error("PostDetail EFFECT: params.id es undefined.");
        setCurrentPost(null); // Marcar como no encontrado/inválido
        setPageLoading(false);
      }
      // Si !params, el efecto se re-ejecutará cuando params cambie.
      return;
    }

    const numericId = Number(params.id);

    if (isNaN(numericId) || numericId <= 0) {
      console.error("PostDetail EFFECT: ID de post no válido:", params.id);
      setCurrentPost(null); // Marcar como no encontrado/inválido
      setPageLoading(false);
      return;
    }

    // En este punto, tenemos un numericId válido.
    console.log(`PostDetail EFFECT: ID numérico válido: ${numericId}`);

    if (contextLoading) {
      console.log("PostDetail EFFECT: Contexto aún cargando. Esperando...");
      // Mantenemos pageLoading en true, el efecto se re-ejecutará cuando contextLoading cambie.
      return;
    }

    // El contexto está listo y tenemos un ID numérico válido.
    console.log(`PostDetail EFFECT: Contexto listo. Buscando post ID: ${numericId}`);
    const postData = getPostById(numericId);
    
    if (postData) {
      console.log(`PostDetail EFFECT: Post ID ${numericId} ENCONTRADO en contexto.`);
      setCurrentPost(postData);
    } else {
      console.log(`PostDetail EFFECT: Post ID ${numericId} NO ENCONTRADO en contexto.`);
      setCurrentPost(null); // Marcar como no encontrado
    }
    setPageLoading(false);

  }, [params, contextLoading, getPostById, allPostsFromContext]); // allPostsFromContext añadido por si getPostById depende de su referencia estable o contenido directo

  // Redirección si el post no se encontró (currentPost es null) y no estamos cargando
  useEffect(() => {
    if (!pageLoading && currentPost === null) {
      console.log("PostDetail REDIRECT EFFECT: currentPost es null y no estamos cargando. Redirigiendo...");
      router.push('/dashboard/bienestar/posts');
    }
  }, [pageLoading, currentPost, router]);

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
  
  // Si está cargando la página, o no se ha determinado si el post existe
  if (pageLoading || currentPost === undefined) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2e3954]"></div>
      </div>
    );
  }

  // Si después de cargar, el post es null (no encontrado)
  // Esta condición podría no alcanzarse si la redirección del useEffect anterior es más rápida.
  // Pero es una salvaguarda.
  if (currentPost === null) {
     // Ya se debería haber redirigido. Si llegamos aquí, es un estado inesperado,
     // pero mostramos un mensaje de error o un loader antes de la redirección final.
    console.log("PostDetail RENDER: currentPost es null, pero no se redirigió aún. Mostrando loader.");
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-96">
        <div className="text-center">
          <p className="text-xl text-gray-700">Post no encontrado. Serás redirigido...</p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2e3954] mx-auto mt-4"></div>
        </div>
      </div>
    );
  }
  
  // Si llegamos aquí, tenemos un post válido en currentPost
  const postToRender = currentPost;
  const category = getCategoryById(postToRender.categoriaId);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
        <Notifications />
        
        <button 
          onClick={() => router.back()}
          className="mb-6 flex items-center text-[#2e3954] hover:underline"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Volver a Posts
        </button>
        
        {postToRender.imagenUrl && (
          <div className="h-64 md:h-96 bg-gray-200 relative rounded-lg overflow-hidden mb-6">
            <div 
              className="absolute inset-0 bg-cover bg-center" 
              style={{ backgroundImage: `url(${postToRender.imagenUrl})` }}
            />
          </div>
        )}
        
        <div className="mb-8">
          <div className="flex flex-wrap justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              {category && (
                <CategoryBadge 
                  category={category}
                  className="text-sm"
                />
              )}
              {postToRender.destacado && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                  <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Destacado
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {formatearFecha(postToRender.fecha)}
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-[#2e3954] mb-4">{postToRender.titulo}</h1>
          
          <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
            <div>Por <span className="font-medium">{postToRender.autor}</span></div>
            <div>{postToRender.vistas.toLocaleString()} lecturas</div>
          </div>
          
          <p className="text-lg text-gray-700 italic border-l-4 border-[#2e3954] pl-4 py-2 bg-gray-50 rounded-sm">
            {postToRender.extracto}
          </p>
        </div>
        
        <div className="prose prose-lg max-w-none text-gray-800">
          {postToRender.contenido ? (
            <div className="text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: postToRender.contenido }}></div>
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