import React from 'react';
import CategoryBadge from './CategoryBadge';

interface PostPreviewProps {
  titulo: string;
  extracto: string;
  contenido: string;
  imagenUrl: string;
  autor: string;
  fecha: string;
  categoria: string;
  categoriaColor?: string;
  destacado: boolean;
}

export default function PostPreview({
  titulo,
  extracto,
  contenido,
  imagenUrl,
  autor,
  fecha,
  categoria,
  categoriaColor = '#2e3954',
  destacado
}: PostPreviewProps) {
  const formatearFecha = (fechaString: string) => {
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Indicator de preview */}
        <div className="bg-blue-100 border-l-4 border-blue-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Vista Previa del Post</strong> - Así es como se verá cuando esté publicado
                {destacado && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    ⭐ Destacado
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Imagen destacada */}
        {imagenUrl && (
          <div className="w-full h-64 md:h-96 bg-cover bg-center" style={{ backgroundImage: `url(${imagenUrl})` }}></div>
        )}
        
        {/* Contenido del artículo */}
        <article className="p-6 md:p-10">
          <header className="mb-8">
            {categoria && (
              <CategoryBadge 
                category={categoria} 
                color={categoriaColor} 
              />
            )}
            <h1 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              {titulo || 'Título del post'}
            </h1>
            <p className="mt-3 text-sm text-gray-500">
              Por <span className="font-medium text-gray-700">{autor || 'Autor'}</span> el {fecha ? formatearFecha(fecha) : 'Fecha'}
            </p>
          </header>
          
          {extracto && (
            <p className="text-lg text-gray-600 mb-6 italic">{extracto}</p>
          )}
          
          <div 
            className="prose prose-lg max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: contenido || '<p class="text-gray-400">El contenido aparecerá aquí cuando escribas en el editor...</p>' }}
          />
        </article>
      </div>
    </div>
  );
} 