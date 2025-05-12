'use client';

import { useState } from 'react';
import { usePosts } from '../context/PostsContext';
import CategoryBadge from '../../../../components/bienestar/CategoryBadge';
import Notifications from '../../../../components/bienestar/Notifications';
import { useRouter } from 'next/navigation';

export default function Posts() {
  // Estados locales para la interfaz
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  
  // Obtener datos del contexto
  const { 
    filteredPosts, 
    filters, 
    setFilters, 
    loading, 
    categories 
  } = usePosts();
  
  // Aplicar búsqueda cuando se presiona Enter o el botón de buscar
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ search: searchTerm });
  };
  
  // Función para formatear fecha
  const formatearFecha = (fechaString: string) => {
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  
  // Manejar clic en un post para ver su detalle
  const handlePostClick = (postId: number) => {
    router.push(`/dashboard/bienestar/posts/${postId}`);
  };
  
  // Filtrar solo posts publicados
  const postsPublicados = filteredPosts.filter(post => post.estado === 'publicado');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Componente de notificaciones */}
        <Notifications />
        
        {/* Cabecera con título y buscador */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-2xl font-bold text-[#2e3954]">Blog de Bienestar</h1>
          
          <form onSubmit={handleSearch} className="w-full md:w-1/3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar artículos..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent text-gray-800 bg-white"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#2e3954]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </form>
        </div>
        
        {/* Filtros de categorías */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setFilters({ category: 'todas' })}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filters.category === 'todas' 
                ? 'bg-[#2e3954] text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Todas
          </button>
          
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setFilters({ category: category.nombre })}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filters.category === category.nombre 
                  ? `text-white`
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              style={{
                backgroundColor: filters.category === category.nombre ? category.color : undefined
              }}
            >
              {category.nombre}
            </button>
          ))}
        </div>
        
        {/* Posts destacados */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-[#2e3954] border-b pb-2">Posts Destacados</h2>
          
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2e3954]"></div>
            </div>
          ) : postsPublicados.filter(post => post.destacado).length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay posts destacados en este momento.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {postsPublicados
                .filter(post => post.destacado)
                .map(post => (
                  <div 
                    key={post.id} 
                    className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
                    onClick={() => handlePostClick(post.id)}
                  >
                    {post.imagenUrl && (
                      <div className="h-48 bg-gray-200 relative">
                        <div 
                          className="absolute inset-0 bg-cover bg-center" 
                          style={{ backgroundImage: `url(${post.imagenUrl})` }}
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <CategoryBadge 
                          category={post.categoria}
                          color={categories.find(c => c.id === post.categoriaId)?.color}
                        />
                        <span className="text-xs text-gray-500">{formatearFecha(post.fecha)}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-[#2e3954] line-clamp-2">{post.titulo}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-3">{post.extracto}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Por {post.autor}</span>
                        <span className="text-xs text-gray-500">{post.vistas.toLocaleString()} lecturas</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
        
        {/* Lista de posts */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-[#2e3954] border-b pb-2">Artículos Recientes</h2>
          
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2e3954]"></div>
            </div>
          ) : postsPublicados.filter(post => !post.destacado).length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay posts que coincidan con los criterios de búsqueda.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {postsPublicados
                .filter(post => !post.destacado)
                .map(post => (
                  <div 
                    key={post.id} 
                    className="flex bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
                    onClick={() => handlePostClick(post.id)}
                  >
                    {post.imagenUrl && (
                      <div className="w-1/3 bg-gray-200 relative">
                        <div 
                          className="absolute inset-0 bg-cover bg-center" 
                          style={{ backgroundImage: `url(${post.imagenUrl})` }}
                        />
                      </div>
                    )}
                    <div className="p-4 flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <CategoryBadge 
                          category={post.categoria}
                          color={categories.find(c => c.id === post.categoriaId)?.color}
                        />
                        <span className="text-xs text-gray-500">{formatearFecha(post.fecha)}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-[#2e3954] line-clamp-2">{post.titulo}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{post.extracto}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Por {post.autor}</span>
                        <span className="text-xs text-gray-500">{post.vistas.toLocaleString()} lecturas</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 