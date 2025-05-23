'use client';

import { useEffect } from 'react';
import BienestarPosts from '../../components/bienestar/BienestarPosts';

// Dashboard main page
export default function Dashboard() {
  // Efecto para animar las estadísticas al cargar
  useEffect(() => {
    // Cualquier lógica de inicialización aquí
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Componente de BienestarPosts */}
      <BienestarPosts 
        title="Noticias & Artículos"
        featuredTitle="Destacados" 
        recentTitle="Últimas Publicaciones"
        maxFeatured={5}
        maxRecent={3}
      />
    </div>
  );
}
