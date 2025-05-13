'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePosts } from '../../app/dashboard/bienestar/context/PostsContext';
import { Post } from '../../lib/bienestar/types';

interface RecentPostsGridProps {
  maxPosts?: number;
  showCategory?: boolean;
}

/**
 * Componente para mostrar posts recientes en una cuadrícula
 */
export default function RecentPostsGrid({ 
  maxPosts = 6, 
  showCategory = true 
}: RecentPostsGridProps) {
  const router = useRouter();
  const { posts, loading, categories } = usePosts();
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  
  useEffect(() => {
    // Filtrar solo posts no destacados y publicados, ordenados por fecha
    const filtered = posts
      .filter(post => !post.destacado && post.estado === 'publicado')
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, maxPosts);
    
    setRecentPosts(filtered);
  }, [posts, maxPosts]);
  
  // Formatear fecha
  const formatearFecha = (fechaString: string) => {
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  
  // Obtener color de la categoría
  const obtenerColorCategoria = (categoriaId: number) => {
    const categoria = categories.find(cat => cat.id === categoriaId);
    return categoria ? categoria.color : '#2e3954';
  };
  
  const handlePostClick = (postId: number) => {
    router.push(`/dashboard/bienestar/posts/${postId}`);
  };
  
  if (loading) {
    return (
      <div className="my-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2e3954]"></div>
      </div>
    );
  }
  
  if (recentPosts.length === 0) {
    return (
      <div className="my-8 text-center py-10 bg-gray-50 rounded-xl">
        <h3 className="text-xl text-gray-600">No hay artículos recientes disponibles</h3>
        <p className="text-gray-500 mt-2">Los nuevos artículos aparecerán aquí cuando estén publicados</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-8">
      {recentPosts.map((post) => (
        <div 
          key={post.id} 
          className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
          onClick={() => handlePostClick(post.id)}
        >
          {/* Imagen del post */}
          <div className="h-48 bg-gray-200 relative">
            <div 
              className="absolute inset-0 bg-cover bg-center" 
              style={{ 
                backgroundImage: `url(${post.imagenUrl || 'https://images.unsplash.com/photo-1579126038374-6064e9370f0f?w=800&auto=format&fit=crop'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-30"></div>
          </div>
          
          {/* Contenido del post */}
          <div className="p-5">
            {showCategory && (
              <div className="mb-3">
                <span 
                  className="inline-block px-3 py-1 rounded-full text-xs text-white"
                  style={{ backgroundColor: obtenerColorCategoria(post.categoriaId) }}
                >
                  {post.categoria}
                </span>
              </div>
            )}
            
            <h3 className="text-xl font-bold mb-2 text-[#2e3954] line-clamp-2">
              {post.titulo}
            </h3>
            
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
              {post.extracto}
            </p>
            
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Por {post.autor}</span>
              <span>{formatearFecha(post.fecha)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 