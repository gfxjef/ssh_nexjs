'use client';

import React from 'react';
import FeaturedPostsSlider from './FeaturedPostsSlider';
import RecentPostsGrid from './RecentPostsGrid';
// import { PostsProvider } from '../../app/dashboard/bienestar/context/PostsContext'; // Eliminado
// import { NotificationsProvider } from '../../app/dashboard/bienestar/context/NotificationsContext'; // Eliminado
// import { clearStorage, initializeStorage } from '../../lib/bienestar/storage'; // Comentado: Ya no se usa directamente aquí

interface BienestarPostsProps {
  title?: string;
  featuredTitle?: string;
  recentTitle?: string;
  maxFeatured?: number;
  maxRecent?: number;
}

/**
 * Componente principal para mostrar posts de bienestar con slider destacados y cuadrícula de recientes
 */
export default function BienestarPosts({
  title = 'Blog de Bienestar',
  featuredTitle = 'Destacados',
  recentTitle = 'Artículos Recientes',
  maxFeatured = 5,
  maxRecent = 6
}: BienestarPostsProps) {
  // Función para reiniciar los datos (COMENTADA)
  // const handleResetData = () => {
  //   if (confirm('¿Estás seguro que deseas reiniciar los datos? Esta acción no se puede deshacer.')) {
  //     // clearStorage(); // No llamar a funciones neutralizadas
  //     // initializeStorage(true); // No llamar a funciones neutralizadas
  //     console.log("Simulación: Datos reiniciados (funcionalidad eliminada)");
  //     window.location.reload();
  //   }
  // };

  return (
    // <NotificationsProvider> Eliminado
    //   <PostsProvider> Eliminado
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#2e3954]">{title}</h1>
              <div className="w-20 h-1 bg-[#8dbba3] mt-2"></div>
            </div>
            {/* Botón de reiniciar datos (COMENTADO) */}
            {/* 
            <button 
              onClick={handleResetData}
              className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
              title="Reiniciar datos (solo para desarrollo)"
            >
              Reiniciar datos
            </button>
            */}
          </div>
          
          {/* Sección de posts destacados */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-[#2e3954] mb-4">{featuredTitle}</h2>
            <FeaturedPostsSlider maxPosts={maxFeatured} />
          </div>
          
          {/* Sección de posts recientes */}
          <div>
            <h2 className="text-2xl font-semibold text-[#2e3954] mb-4">{recentTitle}</h2>
            <RecentPostsGrid maxPosts={maxRecent} />
          </div>
        </div>
    //   </PostsProvider> Eliminado
    // </NotificationsProvider> Eliminado
  );
} 