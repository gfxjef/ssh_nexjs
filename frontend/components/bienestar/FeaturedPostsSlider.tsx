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
  const { posts, loading, categories } = usePosts();
  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);
  
  useEffect(() => {
    // Filtrar solo posts destacados y publicados
    const filtered = posts
      .filter(post => post.destacado && post.estado === 'publicado')
      .slice(0, maxPosts);
    
    setFeaturedPosts(filtered);
  }, [posts, maxPosts]);
  
  // Obtener color de la categoría
  const obtenerColorCategoria = (categoriaId: number) => {
    const categoria = categories.find(cat => cat.id === categoriaId);
    return categoria ? categoria.color : '#2e3954';
  };

  // 📝 FUNCIONES DE TRUNCAMIENTO INTELIGENTE Y RESPONSIVO
  const truncateTitle = (title: string): string => {
    // Diferentes límites según el tamaño de pantalla (simulado)
    const maxLength = typeof window !== 'undefined' && window.innerWidth < 768 ? 45 : 65;
    
    if (title.length <= maxLength) return title;
    
    // Buscar un espacio cerca del límite para cortar de manera inteligente
    const truncated = title.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    // Si encontramos un espacio en los últimos 15 caracteres, cortar ahí
    if (lastSpace > maxLength - 15) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  };

  const truncateExtract = (extract: string): string => {
    // Diferentes límites según el tamaño de pantalla (simulado)  
    const maxLength = typeof window !== 'undefined' && window.innerWidth < 768 ? 80 : 120;
    
    if (extract.length <= maxLength) return extract;
    
    const truncated = extract.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength - 20) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  };
  
  const handleReadMore = (postId: number) => {
    router.push(`/dashboard/bienestar/posts/${postId}`);
  };
  
  if (loading) {
    return (
      <div className="rounded-xl overflow-hidden shadow-2xl h-96 flex items-center justify-center bg-gradient-to-r from-[#2e3954] to-[#3a4665]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    );
  }
  
  if (featuredPosts.length === 0) {
    return (
      <div className="rounded-xl overflow-hidden shadow-2xl h-96 flex items-center justify-center bg-gradient-to-r from-[#2e3954] to-[#3a4665]">
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
    <div className="rounded-xl overflow-hidden shadow-2xl transform transition-all duration-300 hover:shadow-[#8dbba3] hover:scale-[1.01]">
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
              
              {/* Gradiente azul de izquierda a derecha (80% a 0% opacidad) para mejorar legibilidad */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#2e3954] from-0% via-[#2e3954] via-40% to-transparent to-100% opacity-80 z-10"></div>
              
              {/* Efectos visuales (circulos decorativos) */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 z-20"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-1/4 -translate-x-1/4 z-20"></div>
              
              {/* Contenido del slide - Alineado a la izquierda */}
              <div className="absolute inset-0 flex flex-col justify-between z-30 p-6 md:p-8">
                {/* Contenido superior - Título */}
                <div className="text-left max-w-xl">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-3 md:mb-4 text-white drop-shadow-lg leading-tight">
                    {truncateTitle(post.titulo)}
                  </h2>
                  <p className="text-white text-opacity-90 mb-4 text-sm sm:text-base lg:text-lg leading-relaxed">
                    {truncateExtract(post.extracto)}
                  </p>
                </div>
                
                {/* Contenido inferior - Categoría y botón */}
                <div className="text-left max-w-xl">
                  <div className="mb-3 md:mb-4">
                    <span 
                      className="inline-block px-3 py-1.5 md:px-4 md:py-2 rounded-full text-white text-xs md:text-sm font-medium"
                      style={{ backgroundColor: obtenerColorCategoria(post.categoriaId) }}
                    >
                      {post.categoria}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleReadMore(post.id)}
                    className="px-4 py-2 md:px-6 md:py-3 rounded-lg bg-white text-[#2e3954] font-bold text-sm md:text-base transition-all duration-300 hover:bg-opacity-90 hover:shadow-lg shadow-md transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
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