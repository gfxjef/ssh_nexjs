import { Category, Post, PostFilters, PostStatus } from '../bienestar/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const BASE_URL = `${API_BASE_URL}/api/bienestar`;

// Helper para manejar respuestas de la API
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      // Si el cuerpo del error no es JSON, usar el texto de estado
      errorData = { error: response.statusText || 'Error desconocido en la API' };
    }
    const errorMessage = errorData?.error || `Error ${response.status}: ${response.statusText}`;
    console.error('Error API:', errorMessage, 'URL:', response.url, 'Status:', response.status);
    throw new Error(errorMessage);
  }
  // Si la respuesta es 204 No Content, no intentar parsear JSON
  if (response.status === 204) {
    return undefined as T; // o {} as T, o lo que sea apropiado para un No Content
  }
  return response.json();
}

// --- Endpoints de Categorías ---

/**
 * Obtener todas las categorías
 */
export const getAllCategories = async (): Promise<Category[]> => {
  const response = await fetch(`${BASE_URL}/categories`);
  const result = await handleResponse<{ success: boolean, data: Category[] }>(response);
  return result.data;
};

/**
 * Obtener una categoría específica por ID
 */
export const getCategoryById = async (id: number): Promise<Category> => {
  const response = await fetch(`${BASE_URL}/categories/${id}`);
  const result = await handleResponse<{ success: boolean, data: Category }>(response);
  return result.data;
};

/**
 * Crear una nueva categoría
 * @param categoryData Datos de la categoría a crear (nombre, color)
 */
export const createCategory = async (categoryData: Pick<Category, 'nombre' | 'color'>): Promise<Category> => {
  const response = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(categoryData),
  });
  const result = await handleResponse<{ success: boolean, message: string, data: Category }>(response);
  return result.data;
};

/**
 * Actualizar una categoría existente
 * @param id ID de la categoría a actualizar
 * @param categoryData Datos a actualizar (nombre, color)
 */
export const updateCategory = async (id: number, categoryData: Partial<Pick<Category, 'nombre' | 'color'>>): Promise<Category> => {
  const response = await fetch(`${BASE_URL}/categories/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(categoryData),
  });
  const result = await handleResponse<{ success: boolean, message: string, data: Category }>(response);
  return result.data;
};

/**
 * Eliminar una categoría
 * @param id ID de la categoría a eliminar
 */
export const deleteCategory = async (id: number): Promise<void> => {
  const response = await fetch(`${BASE_URL}/categories/${id}`, {
    method: 'DELETE',
  });
  await handleResponse<void>(response);
};

// --- Endpoints de Posts ---

/**
 * Obtener todos los posts
 * @param filters Filtros opcionales para la búsqueda (status, category, search, destacados)
 */
export const getAllPosts = async (filters?: PostFilters): Promise<Post[]> => {
  let url = `${BASE_URL}/posts`;
  const queryParams = new URLSearchParams();

  if (filters) {
    if (filters.status && filters.status !== 'todos') {
      queryParams.append('status', filters.status);
    }
    if (filters.category && filters.category !== 'todas') {
      // Asumiendo que filters.category puede ser ID (número) o nombre (string)
      // El backend debería manejar esto o se necesita una conversión aquí
      queryParams.append('category', String(filters.category)); 
    }
    if (filters.search) {
      queryParams.append('search', filters.search);
    }
    if (filters.destacados) { // El endpoint espera `destacados=true`
      queryParams.append('destacados', 'true');
    }
    // Nota: sortBy no está en endpoint_post_readme.md, se omite por ahora
  }

  const queryString = queryParams.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  console.log("API CALL: getAllPosts URL:", url);
  const response = await fetch(url);
  const result = await handleResponse<{ success: boolean, data: Post[] }>(response);
  return result.data;
};

/**
 * Obtener un post específico por ID
 * @param id ID del post
 * @param incrementViews Booleano para incrementar el contador de vistas (opcional)
 */
export const getPostById = async (id: number, incrementViews?: boolean): Promise<Post> => {
  let url = `${BASE_URL}/posts/${id}`;
  if (incrementViews) {
    url += '?increment_views=true';
  }
  console.log(`API CALL: getPostById URL: ${url}`);
  const response = await fetch(url);
  const result = await handleResponse<{ success: boolean, data: Post }>(response);
  return result.data;
};

/**
 * Crear un nuevo post
 * @param postData Datos del post a crear
 */
export const createPost = async (postData: Omit<Post, 'id' | 'fecha' | 'vistas' | 'categoria'>): Promise<Post> => {
  const response = await fetch(`${BASE_URL}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData),
  });
  const result = await handleResponse<{ success: boolean, message: string, data: Post }>(response);
  return result.data;
};

/**
 * Actualizar un post existente
 * @param id ID del post a actualizar
 * @param postData Datos a actualizar en el post
 */
export const updatePost = async (id: number, postData: Partial<Omit<Post, 'id' | 'fecha' | 'vistas' | 'categoria'>>): Promise<Post> => {
  const response = await fetch(`${BASE_URL}/posts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData),
  });
  const result = await handleResponse<{ success: boolean, message: string, data: Post }>(response);
  return result.data;
};

/**
 * Cambiar estado de un post
 * @param id ID del post
 * @param status Nuevo estado del post
 */
export const changePostStatus = async (id: number, status: PostStatus): Promise<Post> => {
  try {
    const response = await fetch(`${BASE_URL}/posts/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      // Intenta obtener el mensaje de error del backend si está disponible
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Error al cambiar estado del post ${id}`);
    }
    return await handleResponse<Post>(response);
  } catch (error) {
    console.error('Error en changePostStatus:', error);
    throw error;
  }
};

/**
 * Marcar/desmarcar post como destacado
 * @param id ID del post
 * @param destacado Booleano para el estado destacado
 */
export const togglePostHighlight = async (id: number, destacado: boolean): Promise<Post> => {
  try {
    const response = await fetch(`${BASE_URL}/posts/${id}/highlight`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ destacado }),
    });
    if (!response.ok) {
      // Intenta obtener el mensaje de error del backend si está disponible
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Error al cambiar destacado del post ${id}`);
    }
    return await handleResponse<Post>(response);
  } catch (error) {
    console.error('Error en togglePostHighlight:', error);
    throw error;
  }
};

/**
 * Eliminar un post
 * @param id ID del post a eliminar
 */
export const deletePost = async (id: number): Promise<void> => {
  try {
    const response = await fetch(`${BASE_URL}/posts/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Error al eliminar post ${id}`);
    }
    // No se espera contenido en una respuesta DELETE exitosa, así que no llamamos a handleResponse
  } catch (error) {
    console.error('Error en deletePost:', error);
    throw error;
  }
};

/**
 * Re-enviar email de notificación para un post publicado
 * @param id ID del post
 */
export const resendPostEmail = async (id: number): Promise<{ success: boolean; message: string; post_title: string }> => {
  try {
    const response = await fetch(`${BASE_URL}/posts/${id}/resend-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      // Intenta obtener el mensaje de error del backend si está disponible
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Error al re-enviar email para el post ${id}`);
    }
    
    const result = await handleResponse<{ success: boolean; message: string; post_title: string }>(response);
    return result;
  } catch (error) {
    console.error('Error en resendPostEmail:', error);
    throw error;
  }
};

// Nueva función para Postularse a un Post
export async function postularAPost(postId: number, token: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`${BASE_URL}/posts/${postId}/postular`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return await response.json(); // Asume que el backend siempre devuelve JSON
  } catch (error) {
    console.error('Error en postularAPost:', error);
    // Devuelve una estructura de error consistente
    return { success: false, error: error instanceof Error ? error.message : 'Error de red o desconocido' };
  }
}

// Nueva función para verificar el estado de la postulación
export async function getEstadoPostulacion(postId: number, token: string): Promise<{ success: boolean; data?: { postulado: boolean }; error?: string }> {
  try {
    const response = await fetch(`${BASE_URL}/posts/${postId}/postulacion/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Error en getEstadoPostulacion:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error de red o desconocido' };
  }
}

// Interfaz para la respuesta de postulantes
export interface Postulante {
  usuarioId: number;
  nombre: string;
  correo: string;
  fechaPostulacion: string; // ISO Date string
}

export async function getPostulantesByPostId(postId: number, token?: string): Promise<Postulante[]> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}/posts/${postId}/postulantes`, {
      method: 'GET',
      headers: headers,
    });

    // No usar handleResponse aquí directamente si la estructura de éxito es diferente
    // (es decir, si no siempre tiene un campo 'data' anidado como las otras)
    // Asumimos que este endpoint devuelve { success: true, data: Postulante[] } o { success: false, error: string }
    const responseData = await response.json();

    if (!response.ok || !responseData.success) {
      throw new Error(responseData.error || `Error al obtener postulantes para el post ${postId}`);
    }
    return responseData.data as Postulante[]; // Aseguramos el tipado aquí
  } catch (error) {
    console.error('Error en getPostulantesByPostId:', error);
    throw error; // Re-lanzar para que el llamador lo maneje
  }
}

// TODO: Implementar el resto de funciones de API para POSTS
// - getAllPosts: Considerar parámetros de paginación, orden, etc.
// ... existing code ... 