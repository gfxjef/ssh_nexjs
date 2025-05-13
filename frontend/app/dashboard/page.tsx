'use client';

import { MouseEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BienestarPosts from '../../components/bienestar/BienestarPosts';

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
  const [animateStats, setAnimateStats] = useState(false);
  const router = useRouter();

  // Función para manejar clics en botones
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    console.log('Botón clickeado');
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

      {/* Componente de BienestarPosts */}
      <BienestarPosts 
        title="Noticias & Artículos"
        featuredTitle="Destacados" 
        recentTitle="Últimas Publicaciones"
        maxFeatured={5}
        maxRecent={3}
      />
      
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
