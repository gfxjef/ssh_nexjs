'use client';

import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation, Autoplay, EffectFade } from 'swiper/modules';
import { useRouter } from 'next/navigation';
import { usePosts } from '../../app/dashboard/bienestar/context/PostsContext';
import { Post } from '../../lib/bienestar/types';

// Importar los estilos de Swiper (bundle completo)
import 'swiper/swiper-bundle.css';

interface FeaturedPostsSliderProps {
  maxPosts?: number;
  autoplay?: boolean;
  intervalMs?: number;
}

/**
 * Componente de slider para mostrar posts destacados
 */
export default function FeaturedPostsSlider({ 
  maxPosts = 5, 
  autoplay = true,
  intervalMs = 5000
}: FeaturedPostsSliderProps) {
  const router = useRouter();
  const { posts, loading } = usePosts();
  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);
  
  useEffect(() => {
    // Filtrar solo posts destacados y publicados
    const filtered = posts
      .filter(post => post.destacado && post.estado === 'publicado')
      .slice(0, maxPosts);
    
    setFeaturedPosts(filtered);
  }, [posts, maxPosts]);
  
  const handleReadMore = (postId: number) => {
    router.push(`/dashboard/bienestar/posts/${postId}`);
  };
  
  if (loading) {
    return (
      <div className="mb-12 rounded-xl overflow-hidden shadow-2xl h-96 flex items-center justify-center bg-gradient-to-r from-[#2e3954] to-[#3a4665]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    );
  }
  
  if (featuredPosts.length === 0) {
    return (
      <div className="mb-12 rounded-xl overflow-hidden shadow-2xl h-96 flex items-center justify-center bg-gradient-to-r from-[#2e3954] to-[#3a4665]">
        <div className="text-center max-w-2xl px-6 z-10">
          <h2 className="text-3xl font-bold mb-4 text-white">No hay posts destacados</h2>
          <p className="text-white text-opacity-80 mb-6">
            Los posts destacados se mostrarán aquí cuando estén disponibles
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-12 rounded-xl overflow-hidden shadow-2xl transform transition-all duration-300 hover:shadow-[#8dbba3] hover:scale-[1.01]">
      <Swiper
        modules={[Pagination, Navigation, Autoplay, EffectFade]}
        pagination={{ clickable: true }}
        navigation
        effect="fade"
        autoplay={autoplay ? { delay: intervalMs, disableOnInteraction: false } : false}
        loop={featuredPosts.length > 1}
        className="h-96"
      >
        {featuredPosts.map((post) => (
          <SwiperSlide key={post.id}>
            <div className="relative h-96 cursor-pointer">
              {/* Imagen de fondo */}
              <div 
                className="absolute inset-0 bg-cover bg-center z-0" 
                style={{ 
                  backgroundImage: `url(${post.imagenUrl || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              
              {/* Gradiente de oscurecimiento suave para mejorar legibilidad */}
              <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black opacity-10 z-10"></div>
              
              {/* Efectos visuales (circulos decorativos) */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 z-20"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-1/4 -translate-x-1/4 z-20"></div>
              
              {/* Contenido del slide */}
              <div className="absolute inset-0 flex items-center justify-center z-30">
                <div className="text-center max-w-2xl px-6">
                  <div className="mb-3">
                    <span className="inline-block px-3 py-1 bg-white bg-opacity-20 backdrop-filter backdrop-blur-sm rounded-full text-white text-sm">
                      {post.categoria}
                    </span>
                  </div>
                  <h2 className="text-4xl font-extrabold mb-6 text-white drop-shadow-lg">
                    {post.titulo}
                  </h2>
                  <p className="text-white text-opacity-80 mb-6 line-clamp-2">
                    {post.extracto}
                  </p>
                  <button 
                    onClick={() => handleReadMore(post.id)}
                    className="px-6 py-3 rounded-lg bg-white text-[#2e3954] font-bold transition-all duration-300 hover:bg-opacity-90 hover:shadow-lg shadow-md transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  >
                    Leer Más
                  </button>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
} 