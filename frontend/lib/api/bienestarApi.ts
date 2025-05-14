import { Category, Post, PostFilters, PostStatus } from '../bienestar/types';

const BASE_URL = 'http://localhost:5000/api/bienestar';

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
  const response = await fetch(`${BASE_URL}/posts/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  const result = await handleResponse<{ success: boolean, message: string, data: Post }>(response);
  return result.data;
};

/**
 * Marcar/desmarcar post como destacado
 * @param id ID del post
 * @param destacado Booleano para el estado destacado
 */
export const togglePostHighlight = async (id: number, destacado: boolean): Promise<Post> => {
  const response = await fetch(`${BASE_URL}/posts/${id}/highlight`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ destacado }),
  });
  const result = await handleResponse<{ success: boolean, message: string, data: Post }>(response);
  return result.data;
};

/**
 * Eliminar un post
 * @param id ID del post a eliminar
 */
export const deletePost = async (id: number): Promise<void> => {
  const response = await fetch(`${BASE_URL}/posts/${id}`, {
    method: 'DELETE',
  });
  await handleResponse<void>(response);
}; 