'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Document {
  id: number;
  titulo: string;
  categoria_nombre?: string;
  categoria_color?: string;
  categoria_id?: number;
  grupo?: 'kossodo' | 'kossomet' | 'grupo_kossodo';
  tipo_mime: string;
  nombre_archivo: string;
  ruta_archivo?: string; // URL de S3 para descarga directa
}

interface LatestDocumentsProps {
  maxDocuments?: number;
  showHeader?: boolean;
}

export default function LatestDocuments({ maxDocuments = 5, showHeader = true }: LatestDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // CSS personalizado para el borde degradado y hover
  const gradientHoverStyle = `
    .grupo-kossodo-border {
      position: relative;
      background: white;
      border-radius: 6px;
      padding: 2px 6px;
      font-size: 12px;
      color: #afafaf;
    }
    
    .grupo-kossodo-border::before {
      content: '';
      position: absolute;
      inset: 0;
      padding: 2px;
      background: linear-gradient(45deg, #ef8535 0%, #2e3954 50%, #69b69e 100%);
      border-radius: 6px;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: xor;
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      pointer-events: none;
    }
    
    .group:hover .grupo-kossodo-border {
      background: linear-gradient(45deg, #ef8535 0%, #2e3954 50%, #69b69e 100%);
      color: white !important;
    }
    
    .group:hover .grupo-kossodo-border::before {
      display: none;
    }
    
    /* Forzar texto blanco en hover para todas las etiquetas de grupo */
    .group:hover .grupo-tag {
      color: white !important;
    }
  `;

  // Función para obtener la extensión del archivo
  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toUpperCase() || 'FILE';
  };

  // Función para obtener color según tipo de archivo
  const getFileTypeColor = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return 'bg-red-100 text-red-700 border-red-200';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'bg-green-100 text-green-700 border-green-200';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (mimeType.includes('image')) return 'bg-purple-100 text-purple-700 border-purple-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // Función para formatear el nombre del grupo
  const formatGroupName = (grupo?: string): string => {
    if (!grupo) return '';
    switch (grupo) {
      case 'kossodo': return 'KOSSODO';
      case 'kossomet': return 'KOSSOMET';
      case 'grupo_kossodo': return 'GRUPO KOSSODO';
      default: return grupo.toUpperCase();
    }
  };

  // Función para obtener el estilo del grupo
  const getGroupStyle = (grupo?: string): string => {
    if (!grupo) return 'bg-gray-100 text-gray-700 rounded-md transition-all duration-200';
    
    switch (grupo) {
      case 'kossodo': 
        return 'bg-white group-hover:bg-[#69b69e] rounded-md border-2 group-hover:border-transparent group-hover:text-white transition-all duration-200';
      case 'kossomet': 
        return 'bg-white group-hover:bg-[#ef8535] rounded-md border-2 group-hover:border-transparent group-hover:text-white transition-all duration-200';
      case 'grupo_kossodo': 
        return 'font-medium transition-all duration-200';
      default: 
        return 'bg-gray-100 text-gray-700 group-hover:bg-gray-200 rounded-md border-2 border-gray-300 group-hover:border-gray-400 transition-all duration-200';
    }
  };

  // Función para obtener el estilo inline del grupo (para bordes y colores)
  const getGroupInlineStyle = (grupo?: string): React.CSSProperties => {
    if (!grupo) return {};
    
    switch (grupo) {
      case 'kossodo': 
        return { 
          borderColor: '#69b69e',
          color: '#afafaf'
        };
      case 'kossomet': 
        return { 
          borderColor: '#ef8535',
          color: '#afafaf'
        };
      case 'grupo_kossodo': 
        return { 
          color: '#afafaf'
        };
      default: 
        return {};
    }
  };

  // Función para truncar títulos
  const truncateTitle = (title: string, maxLength: number = 30): string => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  useEffect(() => {
    const fetchLatestDocuments = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!API_BASE_URL) {
          throw new Error('API_BASE_URL no está definida');
        }

        const response = await fetch(
          `${API_BASE_URL}/api/bienestar/documentos/api/documents?limit=${maxDocuments}&sort=created_at&order=desc`,
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.success && result.data) {
          setDocuments(result.data);
        } else {
          throw new Error(result.error || 'Error al obtener documentos');
        }
      } catch (err) {
        console.error('Error al cargar documentos:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchLatestDocuments();
  }, [maxDocuments]);

  const handleViewMore = () => {
    router.push('/dashboard/bienestar/documentos');
  };

  // Función para determinar si se puede previsualizar
  const shouldShowPreview = (document: Document): boolean => {
    return document.tipo_mime.includes('pdf') || document.tipo_mime.includes('image');
  };

  // Función para manejar la acción Ver/Descargar
  const handleViewDocument = (document: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (shouldShowPreview(document)) {
      // Para PDFs e imágenes, navegar con parámetros para abrir en modo viewer
      const params = new URLSearchParams({
        view: document.id.toString(),
        mode: 'viewer'
      });
      router.push(`/dashboard/bienestar/documentos?${params.toString()}`);
    } else {
      // Para otros tipos, descargar directamente
      handleDownloadDocument(document, e);
    }
  };

  // Función para manejar la descarga
  const handleDownloadDocument = async (document: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const downloadUrl = (document as any).ruta_archivo;
      
      if (downloadUrl) {
        // Intentar descarga directa usando fetch para evitar navegación
        try {
          const response = await fetch(downloadUrl);
          
          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Crear enlace temporal para descarga
            const link = window.document.createElement('a');
            link.href = url;
            link.download = document.nombre_archivo || `${document.titulo}`;
            link.style.display = 'none';
            
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);
            
            // Limpiar la URL temporal
            window.URL.revokeObjectURL(url);
            
            console.log('📥 [DOWNLOAD] Archivo descargado:', document.titulo);
          } else {
            throw new Error('Error en la respuesta del servidor');
          }
        } catch (fetchError) {
          // Fallback: descarga directa sin fetch
          const link = window.document.createElement('a');
          link.href = downloadUrl;
          link.download = document.nombre_archivo || `${document.titulo}`;
          link.style.display = 'none';
          
          window.document.body.appendChild(link);
          link.click();
          window.document.body.removeChild(link);
          
          console.log('📥 [DOWNLOAD] Descarga directa:', downloadUrl);
        }
      } else {
        console.error('❌ [DOWNLOAD] No se encontró la URL de descarga para:', document.titulo);
        router.push('/dashboard/bienestar/documentos');
      }
    } catch (error) {
      console.error('❌ [DOWNLOAD] Error en descarga:', error);
      router.push('/dashboard/bienestar/documentos');
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 h-96 flex flex-col`}>
        {showHeader && (
          <div className="px-3 py-3 border-b border-gray-200 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-[#2e3954]">Últimos Documentos</h3>
              <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        )}
        <div className="px-3 py-3 flex-1">
          <div className="flex flex-col justify-center h-full">
            {[...Array(5)].map((_, index) => (
              <div key={index} className={`px-2 py-3 animate-pulse ${
                index < 4 ? 'border-b border-gray-100' : ''
              }`}>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-gray-200 rounded mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 h-96 flex flex-col`}>
        {showHeader && (
          <div className="px-3 py-3 border-b border-gray-200 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-[#2e3954]">Últimos Documentos</h3>
              <button
                onClick={handleViewMore}
                className="text-sm text-[#2e3954] hover:text-white font-medium transition-all duration-200 px-3 py-1 rounded-md hover:bg-[#2e3954] hover:shadow-sm"
              >
                Ver más
              </button>
            </div>
          </div>
        )}
        <div className="px-3 py-3 text-center text-gray-500 flex-1 flex items-center justify-center">
          <p className="text-sm">Error al cargar documentos</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: gradientHoverStyle }} />
      <div className={`bg-white rounded-xl border border-gray-200 ${showHeader ? 'h-96' : 'h-96'} flex flex-col`}>
      {/* Header - Solo se muestra si showHeader es true */}
      {showHeader && (
        <div className="px-3 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-[#2e3954]">Últimos Documentos</h3>
            <button
              onClick={handleViewMore}
              className="text-sm text-[#2e3954] hover:text-white font-medium transition-all duration-200 px-3 py-1 rounded-md hover:bg-[#2e3954] hover:shadow-sm"
            >
              Ver más
            </button>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="flex-1 overflow-hidden">
        {documents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-gray-500">
            <div>
              <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No hay documentos disponibles</p>
            </div>
          </div>
        ) : (
          <div className="px-3 py-3 h-full overflow-y-auto">
            <div className="flex flex-col justify-center h-full space-y-0">
              {documents.map((document, index) => (
              <div 
                key={document.id} 
                className={`group relative px-2 py-3 rounded-lg hover:bg-gray-50 transition-all duration-200 cursor-pointer border border-transparent hover:border-gray-200 hover:shadow-sm ${
                  index < documents.length - 1 ? 'border-b border-gray-100' : ''
                }`}
                onClick={handleViewMore}
              >
                {/* Contenido centrado verticalmente */}
                <div className="flex items-center space-x-3">
                  {/* File Type Icon - Con más padding */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded border flex items-center justify-center ${getFileTypeColor(document.tipo_mime)}`}>
                    <span className="text-xs font-bold">
                      {getFileExtension(document.nombre_archivo)}
                    </span>
                  </div>
                  
                  {/* Información del documento */}
                  <div className="flex-1 min-w-0">
                    {/* Título */}
                    <h4 className="text-sm font-bold text-gray-900 leading-tight mb-1" title={document.titulo}>
                      {truncateTitle(document.titulo)}
                    </h4>
                    
                    {/* Grupo / Categoría */}
                    <div className="flex items-center space-x-1">
                      {/* Etiqueta de Grupo */}
                      <span 
                        className={`${getGroupStyle(document.grupo)} ${
                          document.grupo === 'grupo_kossodo' ? 'grupo-kossodo-border' : 'font-medium grupo-tag'
                        }`}
                        style={{
                          ...getGroupInlineStyle(document.grupo),
                          ...(document.grupo !== 'grupo_kossodo' && { fontSize: '12px', padding: '2px 6px' })
                        }}
                      >
                        {formatGroupName(document.grupo)}
                      </span>
                      
                      {/* Etiqueta de Categoría */}
                      <span className="bg-gray-400 text-white group-hover:bg-gray-600 group-hover:text-white rounded-md font-medium transition-all duration-200" style={{ fontSize: '12px', padding: '2px 6px' }}>
                        {document.categoria_nombre || `Cat. ${document.categoria_id || document.id}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botones de acción que aparecen en hover */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
                  <button
                    onClick={(e) => handleViewDocument(document, e)}
                    className={`px-2 py-2 rounded text-xs font-medium transition-colors ${
                      shouldShowPreview(document)
                        ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                    title={shouldShowPreview(document) ? "Ver documento" : "Descargar archivo"}
                  >
                    {shouldShowPreview(document) ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </button>
                  
                  <button
                    onClick={(e) => handleDownloadDocument(document, e)}
                    className="px-2 py-2 rounded text-xs font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors"
                    title="Descargar"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
} 