import { useState, useEffect, useCallback } from 'react';
import { Document } from '../types';

interface CachedDocument {
  url: string;
  validatedAt: number;
  isValid: boolean;
  documentHash: string; // Hash para detectar cambios en el documento
}

interface DocumentCache {
  [documentId: number]: CachedDocument;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en millisegundos
const CACHE_KEY = 'document-url-cache';

/** 
 * Hook para manejar cache de URLs de documentos con validación
 */
export function useDocumentCache() {
  const [cache, setCache] = useState<DocumentCache>({});
  const [loadingUrls, setLoadingUrls] = useState<Set<number>>(new Set());

  // Cargar cache desde localStorage al inicializar
  useEffect(() => {
    try {
      const savedCache = localStorage.getItem(CACHE_KEY);
      if (savedCache) {
        const parsedCache: DocumentCache = JSON.parse(savedCache);
        // Limpiar entradas expiradas
        const now = Date.now();
        const validCache: DocumentCache = {};
        
        Object.entries(parsedCache).forEach(([id, cachedDoc]) => {
          if (now - cachedDoc.validatedAt < CACHE_DURATION) {
            validCache[parseInt(id)] = cachedDoc;
          }
        });
        
        setCache(validCache);
        console.log('📦 [CACHE] Cache cargado desde localStorage:', Object.keys(validCache).length, 'entradas');
      }
    } catch (error) {
      console.error('❌ [CACHE] Error al cargar cache:', error);
    }
  }, []);

  // Guardar cache en localStorage cuando cambie
  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('❌ [CACHE] Error al guardar cache:', error);
    }
  }, [cache]);

  // Generar hash simple del documento para detectar cambios
  const generateDocumentHash = useCallback((document: Document): string => {
    return `${document.id}_${document.ruta_archivo}_${document.updated_at || document.created_at}`;
  }, []);

  // Obtener URL del documento con cache
  const getFileUrl = useCallback((document: Document): string => {
    // Si ruta_archivo contiene una URL de S3, usarla directamente
    if (document.ruta_archivo && 
        (document.ruta_archivo.startsWith('https://') && document.ruta_archivo.includes('amazonaws.com'))) {
      console.log('🔗 [S3] Usando URL directa de S3:', document.ruta_archivo);
      return document.ruta_archivo;
    }
    
    // Fallback para archivos locales
    const filename = document.ruta_archivo.split('/').pop();
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    const localUrl = `${baseUrl}/api/bienestar/documentos/files/${encodeURIComponent(filename || '')}`;
    console.log('📁 [LOCAL] Usando URL local:', localUrl);
    return localUrl;
  }, []);

  // Validar si una URL está disponible (para archivos locales principalmente)
  const validateUrl = useCallback(async (url: string): Promise<boolean> => {
    try {
      // Solo validar URLs locales, las de S3 se asumen válidas
      if (url.includes('amazonaws.com')) {
        return true;
      }

      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error('❌ [VALIDATION] Error al validar URL:', url, error);
      return false;
    }
  }, []);

  // Obtener URL con cache y validación
  const getCachedFileUrl = useCallback(async (document: Document): Promise<string> => {
    const documentHash = generateDocumentHash(document);
    const cachedDoc = cache[document.id];
    const now = Date.now();

    // Verificar si tenemos cache válido
    if (cachedDoc && 
        cachedDoc.documentHash === documentHash && 
        (now - cachedDoc.validatedAt) < CACHE_DURATION &&
        cachedDoc.isValid) {
      console.log(`✅ [CACHE HIT] Usando URL cacheada para documento ${document.id}`);
      return cachedDoc.url;
    }

    // Si ya estamos validando esta URL, esperar
    if (loadingUrls.has(document.id)) {
      console.log(`⏳ [CACHE] Ya validando documento ${document.id}, esperando...`);
      // Retornar URL directa mientras validamos
      return getFileUrl(document);
    }

    // Marcar como en proceso de validación
    setLoadingUrls(prev => new Set(prev.add(document.id)));

    try {
      const url = getFileUrl(document);
      console.log(`🔍 [CACHE MISS] Validando URL para documento ${document.id}: ${url}`);
      
      const isValid = await validateUrl(url);
      
      // Actualizar cache
      setCache(prev => ({
        ...prev,
        [document.id]: {
          url,
          validatedAt: now,
          isValid,
          documentHash
        }
      }));

      console.log(`${isValid ? '✅' : '❌'} [VALIDATION] URL documento ${document.id}: ${isValid ? 'válida' : 'inválida'}`);
      
      return url;
    } finally {
      // Remover de la lista de carga
      setLoadingUrls(prev => {
        const newSet = new Set(prev);
        newSet.delete(document.id);
        return newSet;
      });
    }
  }, [cache, loadingUrls, generateDocumentHash, getFileUrl, validateUrl]);

  // Invalidar cache de un documento específico
  const invalidateDocument = useCallback((documentId: number) => {
    setCache(prev => {
      const newCache = { ...prev };
      delete newCache[documentId];
      return newCache;
    });
    console.log(`🗑️ [CACHE] Cache invalidado para documento ${documentId}`);
  }, []);

  // Limpiar todo el cache
  const clearCache = useCallback(() => {
    setCache({});
    localStorage.removeItem(CACHE_KEY);
    console.log('🧹 [CACHE] Cache completamente limpiado');
  }, []);

  // Determinar si un documento debe mostrarse con preview
  const shouldShowPreview = useCallback((document: Document): boolean => {
    const mimeType = document.tipo_mime.toLowerCase();
    
    // Solo PDFs e imágenes tienen preview
    if (mimeType.includes('pdf')) return true;
    
    // Ampliar formatos de imagen soportados
    if (mimeType.includes('image/')) return true;
    if (mimeType.includes('jpeg')) return true;
    if (mimeType.includes('jpg')) return true;
    if (mimeType.includes('png')) return true;
    if (mimeType.includes('gif')) return true;
    if (mimeType.includes('bmp')) return true;
    if (mimeType.includes('webp')) return true;
    if (mimeType.includes('svg')) return true;
    if (mimeType.includes('tiff')) return true;
    if (mimeType.includes('tif')) return true;
    if (mimeType.includes('ico')) return true;
    
    return false;
  }, []);

  // Obtener tipo de visualización simplificado
  const getViewerType = useCallback((document: Document): 'pdf' | 'image' | 'download' => {
    const mimeType = document.tipo_mime.toLowerCase();
    
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('image/')) return 'image';
    
    return 'download';
  }, []);

  return {
    // Funciones principales
    getCachedFileUrl,
    getFileUrl,
    shouldShowPreview,
    getViewerType,
    
    // Gestión de cache
    invalidateDocument,
    clearCache,
    
    // Estado
    isLoading: (documentId: number) => loadingUrls.has(documentId),
    cacheSize: Object.keys(cache).length
  };
} 