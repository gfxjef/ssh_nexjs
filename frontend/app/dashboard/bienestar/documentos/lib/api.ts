/**
 * Servicio de API para el sistema de documentos
 * Conecta el frontend con el backend real (sin datos mock)
 */

import { Document, DocumentCategory, DocumentTag, DocumentFilters, DocumentGroup } from '../types';

// Configuración base de la API
const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/bienestar/documentos`;

// Función para obtener el token de autorización
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Headers por defecto
const getHeaders = () => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Headers para multipart/form-data (uploads)
const getUploadHeaders = () => {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  
  // No especificar Content-Type para que el browser lo maneje automáticamente con boundary
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Servicio de documentos
 */
export const documentsApi = {
  // Obtener todos los documentos con filtros
  async getDocuments(filters: DocumentFilters = {}) {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.category && filters.category !== 'todas') params.append('categoria', filters.category.toString());
    if (filters.tags && filters.tags.length > 0) params.append('etiquetas', filters.tags.join(','));
    if (filters.grupo) params.append('grupo', filters.grupo);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    
    const response = await fetch(`${API_BASE_URL}/api/documents?${params.toString()}`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener documentos: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Obtener un documento específico
  async getDocument(id: number) {
    const response = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener documento: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Crear documento con metadatos solamente
  async createDocument(data: {
    titulo: string;
    descripcion?: string;
    categoria_id: number;
    etiquetas?: number[];
    es_publico?: boolean;
    grupo: 'kossodo' | 'kossomet' | 'grupo_kossodo';
  }) {
    const response = await fetch(`${API_BASE_URL}/api/documents`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error al crear documento: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Subir archivo para un documento existente
  async uploadFile(documentId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: getUploadHeaders(),
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error al subir archivo: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Crear documento completo con archivo (usando endpoint local de Next.js)
  async createDocumentWithFile(data: {
    titulo: string;
    descripcion?: string;
    categoria_id: number;
    etiquetas?: number[];
    es_publico?: boolean;
    grupo: 'kossodo' | 'kossomet' | 'grupo_kossodo';
    file: File;
  }) {
    const formData = new FormData();
    formData.append('titulo', data.titulo);
    if (data.descripcion) formData.append('descripcion', data.descripcion);
    formData.append('categoria_id', data.categoria_id.toString());
    if (data.etiquetas && data.etiquetas.length > 0) formData.append('etiquetas', data.etiquetas.join(','));
    if (data.es_publico !== undefined) formData.append('es_publico', data.es_publico.toString());
    formData.append('grupo', data.grupo);
    formData.append('file', data.file);
    
    // Usar el endpoint local de Next.js que maneja archivo + metadata
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error al crear documento con archivo: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Actualizar documento
  async updateDocument(id: number, data: {
    titulo?: string;
    descripcion?: string;
    categoria_id?: number;
    etiquetas?: number[];
    es_publico?: boolean;
    grupo?: 'kossodo' | 'kossomet' | 'grupo_kossodo';
  }) {
    const response = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error al actualizar documento: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Eliminar documento
  async deleteDocument(id: number) {
    const response = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error al eliminar documento: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Descargar documento
  async downloadDocument(id: number) {
    const response = await fetch(`${API_BASE_URL}/api/documents/${id}/download`, {
      headers: getUploadHeaders() // Sin Content-Type para descargas
    });
    
    if (!response.ok) {
      throw new Error(`Error al descargar documento: ${response.statusText}`);
    }
    
    // Retornar el blob para manejo en el frontend
    return await response.blob();
  }
};

/**
 * Servicio de categorías
 */
export const categoriesApi = {
  // Obtener todas las categorías
  async getCategories() {
    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener categorías: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Crear categoría
  async createCategory(data: {
    nombre: string;
    descripcion?: string;
    color?: string;
    icono?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error al crear categoría: ${response.statusText}`);
    }
    
    return await response.json();
  }
};

/**
 * Servicio de etiquetas
 */
export const tagsApi = {
  // Obtener todas las etiquetas
  async getTags() {
    const response = await fetch(`${API_BASE_URL}/api/tags`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener etiquetas: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Crear etiqueta
  async createTag(data: {
    nombre: string;
    color?: string;
    descripcion?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/tags`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error al crear etiqueta: ${response.statusText}`);
    }
    
    return await response.json();
  }
};

/**
 * Servicio de grupos empresariales
 */
export const groupsApi = {
  // Obtener información de grupos con contadores
  async getGroups() {
    const response = await fetch(`${API_BASE_URL}/groups`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener grupos: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Obtener documentos por grupo
  async getDocumentsByGroup(grupo: 'kossodo' | 'kossomet' | 'grupo_kossodo') {
    return documentsApi.getDocuments({ grupo });
  }
};

/**
 * Configuración de grupos empresariales (local)
 */
export const BUSINESS_GROUPS: DocumentGroup[] = [
  {
    id: 'kossodo',
    nombre: 'Kossodo',
    icono: '🏢',
    color: '#2563EB',
    descripcion: 'Empresa principal del grupo'
  },
  {
    id: 'kossomet',
    nombre: 'Kossomet',
    icono: '🏭',
    color: '#059669',
    descripcion: 'División metalúrgica'
  },
  {
    id: 'grupo_kossodo',
    nombre: 'Grupo Kossodo',
    icono: '🏛️',
    color: '#6B7280',
    descripcion: 'Corporativo del grupo'
  }
];

/**
 * Función de utilidad para manejo de errores
 */
export const handleApiError = (error: any) => {
  console.error('API Error:', error);
  
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Error de conexión con el servidor. Verifica que el backend esté funcionando.';
  }
  
  return error.message || 'Error desconocido en la API';
}; 