'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePosts } from '../../context/PostsContext';
import { useNotifications } from '../../context/NotificationsContext';
import CategoryBadge from '../../../../../components/bienestar/CategoryBadge';
import NotificationsComponent from '../../../../../components/bienestar/Notifications';
import { Post } from '../../../../../lib/bienestar/types';
import { 
  postularAPost, 
  getPostById as apiGetPostById,
  getEstadoPostulacion
} from '../../../../../lib/api/bienestarApi';

export default function PostDetail() {
  const params = useParams();
  const router = useRouter();
  const { getPostById: getPostFromContext, getCategoryById, loading: contextLoading } = usePosts();
  const { showNotification } = useNotifications();
  
  const [post, setPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [yaPostulado, setYaPostulado] = useState(false);
  const [loadingPostulacionStatus, setLoadingPostulacionStatus] = useState(false);

  const id = params?.id;
  const postIdNumeric = Number(id);

  const fetchPostData = useCallback(async () => {
    if (isNaN(postIdNumeric)) {
      showNotification('ID de post no válido.', 'error');
      setPost(null);
      setLoadingPost(false);
      return;
    }
    setLoadingPost(true);
    try {
      const postFromContext = getPostFromContext(postIdNumeric);
      let loadedPostData: Post | null = null;
      if (postFromContext) {
        console.log(`Post con ID ${postIdNumeric} encontrado en contexto.`);
        loadedPostData = postFromContext;
      } else {
        console.log(`Post con ID ${postIdNumeric} no encontrado en contexto, llamando a API.`);
        loadedPostData = await apiGetPostById(postIdNumeric, false);
      }
      setPost(loadedPostData);
    } catch (apiError) {
      const errorMessage = apiError instanceof Error ? apiError.message : 'Post no encontrado en API o error de carga.';
      showNotification(errorMessage, 'error');
      setPost(null);
    } finally {
      setLoadingPost(false);
    }
  }, [postIdNumeric, getPostFromContext, showNotification]);

  const checkPostulationStatus = useCallback(async () => {
    if (!post || !post.categoria || post.categoria.toLowerCase() !== 'postulaciones') {
      setYaPostulado(false);
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setYaPostulado(false);
      return;
    }

    setLoadingPostulacionStatus(true);
    try {
      const response = await getEstadoPostulacion(post.id, token);
      if (response.success && response.data) {
        setYaPostulado(response.data.postulado);
      } else {
        console.warn("No se pudo verificar el estado de postulación:", response.error);
        setYaPostulado(false);
      }
    } catch (error) {
      console.error("Error al llamar a getEstadoPostulacion:", error);
      showNotification('Error al verificar estado de postulación.', 'error');
      setYaPostulado(false);
    } finally {
      setLoadingPostulacionStatus(false);
    }
  }, [post, showNotification]);

  useEffect(() => {
    if (!contextLoading && postIdNumeric) {
      fetchPostData();
    }
  }, [postIdNumeric, contextLoading, fetchPostData]);

  useEffect(() => {
    if (post && !loadingPost) {
      checkPostulationStatus();
    }
  }, [post, loadingPost, checkPostulationStatus]);

  const handlePostularClick = async () => {
    if (!post) return;
    if (yaPostulado) {
        showNotification('Ya te has postulado a esta oferta.', 'info');
        return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      showNotification('Debes iniciar sesión para postularte.', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await postularAPost(post.id, token);
      if (response.success) {
        showNotification(response.message || '¡Postulación exitosa!', 'success');
        setYaPostulado(true);
      } else {
        showNotification(response.error || 'Error al postular', 'error');
      }
    } catch (error) {
      showNotification('Ocurrió un error inesperado al intentar postular.', 'error');
      console.error("Error en handlePostularClick:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingPost) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <NotificationsComponent />
        <h1 className="text-2xl font-bold text-red-600 mt-4">Post no encontrado</h1>
        <p className="text-gray-600 mt-2">El post que buscas no existe o no se pudo cargar.</p>
        <button 
          onClick={() => router.push('/dashboard/bienestar/posts')}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Volver a los posts
        </button>
      </div>
    );
  }

  const category = getCategoryById(post.categoriaId);
  const postDate = new Date(post.fecha).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
        <NotificationsComponent />
        {post.imagenUrl && (
          <div className="w-full h-64 md:h-96 bg-cover bg-center" style={{ backgroundImage: `url(${post.imagenUrl})` }}></div>
        )}
        <article className="p-6 md:p-10">
          <header className="mb-8">
            {category && <CategoryBadge category={category.nombre} color={category.color} />}
            <h1 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900 leading-tight">{post.titulo}</h1>
            <p className="mt-3 text-sm text-gray-500">
              Por <span className="font-medium text-gray-700">{post.autor}</span> el {postDate}
            </p>
            {post.vistas > 0 && <p className="text-xs text-gray-500">{post.vistas.toLocaleString()} vistas</p>}
          </header>
          
          {post.extracto && <p className="text-lg text-gray-600 mb-6 italic">{post.extracto}</p>}
          
          <div 
            className="prose prose-lg max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: post.contenido || '' }}
          />
          
          {post.categoria && post.categoria.toLowerCase() === 'postulaciones' && (
            <div className="mt-8 text-center">
              <button
                onClick={handlePostularClick}
                disabled={isSubmitting || yaPostulado || loadingPostulacionStatus}
                className={`px-6 py-3 font-semibold rounded-lg shadow-md transition-colors duration-150
                  ${yaPostulado 
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2'
                  }
                  ${isSubmitting || loadingPostulacionStatus ? 'opacity-70 cursor-wait' : ''}
                `}
              >
                {loadingPostulacionStatus ? 'Verificando...' : (isSubmitting ? 'Procesando...' : (yaPostulado ? 'Ya estás postulando' : 'Postularme a esta Oferta'))}
              </button>
            </div>
          )}

        </article>
      </div>
    </div>
  );
} 