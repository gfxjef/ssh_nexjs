'use client';

import { MouseEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePosts } from './bienestar/context/PostsContext';
import CategoryBadge from '../../components/bienestar/CategoryBadge';

// Datos de ejemplo para estadísticas
const statsData = [
  { id: 1, title: 'Usuarios Activos', value: '1,283', increase: true, percentage: '12%', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 2, title: 'Ventas Mensuales', value: '$24,583', increase: true, percentage: '8.2%', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 3, title: 'Tickets Pendientes', value: '48', increase: false, percentage: '5.3%', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 4, title: 'Campañas Activas', value: '12', increase: true, percentage: '25%', icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z' },
];

// Dashboard main page
export default function Dashboard() {
  // Estado para efectos hover en las tarjetas
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [animateStats, setAnimateStats] = useState(false);
  const router = useRouter();

  // Obtener datos de posts del contexto
  const { posts, loading, categories } = usePosts();

  // Filtrar posts publicados
  const postsPublicados = posts.filter(post => post.estado === 'publicado');
  
  // Obtener posts destacados
  const postsDestacados = postsPublicados.filter(post => post.destacado);
  
  // Obtener posts recientes (no destacados, ordenados por fecha)
  const postsRecientes = postsPublicados
    .filter(post => !post.destacado)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 3); // Limitamos a 3 posts recientes

  // Función para manejar navegación a un post
  const handlePostClick = (postId: number) => {
    router.push(`/dashboard/bienestar/posts/${postId}`);
  };

  // Función para manejar clics en botones
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    console.log('Botón clickeado');
  };

  // Función para cambiar slide
  const handleSlideChange = (index: number) => {
    setActiveSlide(index);
  };

  // Autoplay del slider cada 3 segundos
  useEffect(() => {
    if (postsDestacados.length <= 1) return;
    
    const interval = setInterval(() => {
      setActiveSlide(prevSlide => 
        prevSlide === postsDestacados.length - 1 ? 0 : prevSlide + 1
      );
    }, 3000);
    
    return () => clearInterval(interval);
  }, [postsDestacados.length]);

  // Log para depurar las imágenes destacadas
  useEffect(() => {
    if (postsDestacados.length > 0 && !loading) {
      console.log('Imágenes destacadas:', postsDestacados.map(post => ({
        id: post.id,
        titulo: post.titulo,
        imagenUrl: post.imagenUrl
      })));
    }
  }, [postsDestacados, loading]);

  // Formatear fecha para mostrar
  const formatearFecha = (fechaString: string) => {
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Efecto para animar las estadísticas al cargar
  useEffect(() => {
    setAnimateStats(true);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Estadísticas superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {statsData.map((stat, index) => (
          <div 
            key={stat.id}
            className={`bg-white rounded-xl p-6 shadow-md transition-all duration-500 transform hover:shadow-lg hover:scale-105 ${
              animateStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-full mr-4 ${
                index % 2 === 0 ? 'bg-[#2e3954]' : 'bg-[#d48b45]'
              }`}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 text-white" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
              <div>
                <p className="text-gray-600 text-sm">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`inline-flex items-center text-sm ${
                stat.increase ? 'text-green-600' : 'text-red-600'
              }`}>
                <svg 
                  className="w-3 h-3 mr-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d={stat.increase ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} 
                  />
                </svg>
                {stat.percentage}
              </span>
              <span className="text-gray-600 text-sm ml-2">desde el mes pasado</span>
            </div>
          </div>
        ))}
      </div>

      {/* Hero Banner / Post Destacado Principal */}
      <div className="mb-12 rounded-xl overflow-hidden shadow-2xl transform transition-all duration-300 hover:shadow-[#8dbba3] hover:scale-[1.01]">
        {loading ? (
          <div className="bg-gradient-to-r from-[#2e3954] to-[#3a4665] relative h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-[#d48b45]"></div>
          </div>
        ) : postsDestacados.length > 0 ? (
          <div 
            className="relative h-96 cursor-pointer"
            onClick={() => handlePostClick(postsDestacados[activeSlide].id)}
          >
            {/* Imagen de fondo si existe */}
            {postsDestacados[activeSlide].imagenUrl ? (
              <>
                {/* Imagen con gestión de errores */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-[#2e3954] to-[#3a4665]">
                  <img
                    src={postsDestacados[activeSlide].imagenUrl}
                    alt={postsDestacados[activeSlide].titulo}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Error al cargar la imagen:', postsDestacados[activeSlide].imagenUrl);
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>

                {/* Overlay más sutil */}
                <div className="absolute inset-0 bg-black bg-opacity-20 pointer-events-none"></div>
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-[#2e3954] to-[#3a4665]"></div>
            )}
            
            {/* Decoración visual solo cuando no hay imagen */}
            {!postsDestacados[activeSlide].imagenUrl && (
              <>
                <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-1/4 -translate-x-1/4"></div>
              </>
            )}
          
            {/* Contenido del post destacado - simplificado */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-2xl px-6 z-10">
                <h2 className="text-4xl font-extrabold mb-6 text-white drop-shadow-lg">{postsDestacados[activeSlide].titulo}</h2>
                <button 
                  className="px-6 py-3 rounded-lg bg-white text-[#2e3954] font-bold transition-all duration-300 hover:bg-opacity-90 hover:shadow-lg shadow-md transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePostClick(postsDestacados[activeSlide].id);
                  }}
                >
                  Leer Más
                </button>
              </div>
            </div>
            
            {/* Indicadores del slider - Solo si hay más de un post destacado */}
            {postsDestacados.length > 1 && (
              <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-3">
                {postsDestacados.map((_, index) => (
                  <button 
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      activeSlide === index 
                        ? 'bg-[#d48b45] scale-125 shadow-lg' 
                        : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSlideChange(index);
                    }}
                  ></button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-r from-[#2e3954] to-[#3a4665] relative h-96 flex items-center justify-center">
            <div className="text-center max-w-2xl px-6 z-10">
              <h2 className="text-4xl font-extrabold mb-3 text-white drop-shadow-md">No hay posts destacados</h2>
              <p className="text-lg mb-6 text-white opacity-90">Marca un post como destacado para que aparezca aquí</p>
          </div>
        </div>
        )}
      </div>
      
      {/* Sección de Blog - Con posts reales */}
      <div className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-800 relative">
            <span className="relative z-10">Últimas Publicaciones</span>
            <span className="absolute -bottom-1 left-0 w-12 h-1 bg-[#d48b45] rounded-full"></span>
          </h2>
          <button 
            className="text-[#2e3954] hover:text-[#d48b45] font-medium flex items-center transition-colors duration-300"
            onClick={() => router.push('/dashboard/bienestar/posts')}
          >
            Ver todas
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2e3954] border-t-[#d48b45]"></div>
            </div>
        ) : postsRecientes.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">No hay publicaciones recientes disponibles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {postsRecientes.map((post, index) => (
          <div 
                key={post.id}
            className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 ${
                  hoveredCard === index 
                ? 'transform -translate-y-2 shadow-xl shadow-[#2e3954]/10' 
                : 'hover:shadow-lg'
            }`}
                onMouseEnter={() => setHoveredCard(index)}
            onMouseLeave={() => setHoveredCard(null)}
                onClick={() => handlePostClick(post.id)}
              >
                {post.imagenUrl && (
                  <div className="h-48 bg-gray-200 relative overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${post.imagenUrl})` }}
                    ></div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-30"></div>
            </div>
                )}
            <div className="p-6">
              <div className="text-sm text-[#d48b45] mb-2 font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                    {formatearFecha(post.fecha)}
                  </div>
                  
                  <div className="mb-2">
                    <CategoryBadge 
                      category={post.categoria}
                      color={categories.find(c => c.id === post.categoriaId)?.color}
                    />
              </div>
                  
                  <h3 className="text-xl font-bold mb-2 text-gray-800 line-clamp-2">{post.titulo}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">{post.extracto}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Por {post.autor}</span>
              <button 
                className="text-[#2e3954] font-medium hover:text-[#d48b45] transition-colors duration-300 inline-flex items-center group"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePostClick(post.id);
                      }}
              >
                Leer artículo 
                <span className="transform transition-transform duration-300 group-hover:translate-x-1">→</span>
              </button>
            </div>
          </div>
        </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Banner de Suscripción - Diseño elegante */}
      <div className="rounded-xl p-10 mb-16 relative overflow-hidden bg-gradient-to-r from-[#2e3954] to-[#3a4665] shadow-xl">
        {/* Elementos decorativos */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/3 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full translate-y-1/3 -translate-x-1/3"></div>
        
        <div className="relative z-10 text-center">
          <h2 className="text-3xl font-bold mb-3 text-white">¿Quieres recibir más contenido?</h2>
          <p className="text-lg mb-6 max-w-xl mx-auto text-[#8dbba3]">Suscríbete a nuestro boletín para recibir las últimas actualizaciones y artículos directamente en tu correo.</p>
          <div className="flex max-w-md mx-auto shadow-lg rounded-lg overflow-hidden">
            <input 
              type="email" 
              placeholder="tucorreo@ejemplo.com" 
              className="flex-grow px-4 py-3 outline-none border-0 bg-white focus:ring-2 focus:ring-[#d48b45] focus:ring-inset" 
            />
            <button 
              className="bg-[#d48b45] text-white font-bold px-6 py-3 transition-all duration-300 hover:bg-[#be7b3d]"
              onClick={handleClick}
            >
              Suscribirse
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
