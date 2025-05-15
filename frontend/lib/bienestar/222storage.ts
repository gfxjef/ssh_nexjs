/**
 * Servicio de almacenamiento local para posts y categorías
 * Utiliza localStorage para persistencia de datos
 */

import { Post, Category, PostStatus } from './types';

// Claves para localStorage
const POSTS_STORAGE_KEY = 'bienestar_posts';
const CATEGORIES_STORAGE_KEY = 'bienestar_categories';

// // Datos iniciales de ejemplo para categorías (COMENTADO - Ya no se usa para inicialización directa aquí)
// const initialCategories: Category[] = [
//   { id: 1, nombre: 'Tecnología', color: '#2e3954' },
//   { id: 2, nombre: 'Desarrollo', color: '#8dbba3' },
//   { id: 3, nombre: 'Diseño', color: '#d48b45' },
//   { id: 4, nombre: 'Bienestar', color: '#6366f1' },
//   { id: 5, nombre: 'Eventos', color: '#f59e0b' }
// ];

// // Datos iniciales de ejemplo para posts (COMENTADO - Ya no se usa para inicialización directa aquí)
// const initialPosts: Post[] = [
//   // ... (datos de posts comentados para brevedad, ya no se usan aquí)
// ];

/**
 * Inicializa el almacenamiento local si no existe (NEUTRALIZADA)
 */
export function initializeStorage(forceReset = false): void {
  console.log(`NEUTRALIZADO: initializeStorage llamado con forceReset=${forceReset}. No se interactúa con localStorage.`);
  // if (forceReset || !localStorage.getItem(CATEGORIES_STORAGE_KEY)) {
  //   localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(initialCategories));
  // }
  // if (forceReset || !localStorage.getItem(POSTS_STORAGE_KEY)) {
  //   localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(initialPosts));
  // }
}

/**
 * Limpia todos los datos almacenados (NEUTRALIZADA)
 */
export function clearStorage(): void {
  console.log("NEUTRALIZADO: clearStorage llamado. No se interactúa con localStorage.");
  // localStorage.removeItem(POSTS_STORAGE_KEY);
  // localStorage.removeItem(CATEGORIES_STORAGE_KEY);
}

/**
 * MÉTODOS PARA POSTS (NEUTRALIZADOS)
 */

/**
 * Carga todos los posts desde localStorage (NEUTRALIZADA)
 */
export function loadPosts(): Post[] {
  console.log("NEUTRALIZADO: loadPosts llamado. Devuelve array vacío. Usar mock data del contexto.");
  // try {
  //   const data = localStorage.getItem(POSTS_STORAGE_KEY);
  //   return data ? JSON.parse(data) : [];
  // } catch (error) {
  //   console.error('Error loading posts:', error);
  //   return [];
  // }
  return [];
}

/**
 * Guarda todos los posts en localStorage (NEUTRALIZADA)
 */
export function savePosts(posts: Post[]): void {
  console.log("NEUTRALIZADO: savePosts llamado. No se interactúa con localStorage.");
  // try {
  //   localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
  // } catch (error) {
  //   console.error('Error saving posts:', error);
  // }
}

/**
 * Obtiene un post por su ID (NEUTRALIZADA)
 */
export function getPostById(id: number): Post | undefined {
  console.log(`NEUTRALIZADO: getPostById llamado con ID ${id}. Devuelve undefined. Usar mock data del contexto.`);
  // const posts = loadPosts(); // No llamar a la versión neutralizada de loadPosts aquí
  // return posts.find(post => post.id === id);
  return undefined;
}

/**
 * Agrega un nuevo post (NEUTRALIZADA)
 */
export function addPost(post: Omit<Post, 'id'>): Post {
  console.log("NEUTRALIZADO: addPost llamado. No se interactúa con localStorage. Devuelve post de entrada con ID temporal.");
  // const posts = loadPosts();
  // const newId = posts.length > 0 
  //   ? Math.max(...posts.map(p => p.id)) + 1 
  //   : 1;
  const newMockPost: Post = {
    ...post,
    id: Date.now(), // ID temporal
    fecha: post.fecha || new Date().toISOString().split('T')[0],
    vistas: post.vistas || 0
  };
  // posts.push(newMockPost);
  // savePosts(posts);
  return newMockPost; // Devuelve el post con un ID mock para que la UI no rompa si espera un objeto Post
}

/**
 * Actualiza un post existente (NEUTRALIZADA)
 */
export function updatePost(id: number, updates: Partial<Post>): Post | null {
  console.log(`NEUTRALIZADO: updatePost llamado para ID ${id}. No se interactúa con localStorage. Devuelve null o post actualizado mock.`);
  // const posts = loadPosts();
  // const index = posts.findIndex(post => post.id === id);
  // if (index === -1) {
  //   return null;
  // }
  // const updatedPost = { ...posts[index], ...updates };
  // posts[index] = updatedPost;
  // savePosts(posts);
  // return updatedPost;
  
  // Para simular una actualización para la UI si es necesario, sin tocar localStorage
  const mockExistingPost = getPostById(id); // Usa la versión neutralizada que devuelve undefined
  if (mockExistingPost) {
    return { ...mockExistingPost, ...updates } as Post;
  }
  return null;
}

/**
 * Elimina un post por su ID (NEUTRALIZADA)
 */
export function deletePost(id: number): boolean {
  console.log(`NEUTRALIZADO: deletePost llamado para ID ${id}. No se interactúa con localStorage. Devuelve true como simulación.`);
  // const posts = loadPosts();
  // const filteredPosts = posts.filter(post => post.id !== id);
  // if (filteredPosts.length === posts.length) {
  //   return false; 
  // }
  // savePosts(filteredPosts);
  return true; // Simula éxito
}

/**
 * Cambia el estado de un post (NEUTRALIZADA)
 */
export function changePostStatus(id: number, status: PostStatus): Post | null {
  console.log(`NEUTRALIZADO: changePostStatus llamado para ID ${id} a estado ${status}. Devuelve null o post actualizado mock.`);
  // return updatePost(id, { estado: status }); 
  const mockUpdatedPost = updatePost(id, { estado: status }); // Llama a la versión neutralizada de updatePost
  return mockUpdatedPost;
}

/**
 * Cambia el valor destacado de un post (NEUTRALIZADA)
 */
export function togglePostHighlight(id: number): Post | null {
  console.log(`NEUTRALIZADO: togglePostHighlight llamado para ID ${id}. Devuelve null o post actualizado mock.`);
  // const post = getPostById(id); // Usa la versión neutralizada
  // if (!post) return null;
  // return updatePost(id, { destacado: !post.destacado });
  const mockPost = getPostById(id); // Usa la versión neutralizada
   if (!mockPost) return null;
  return updatePost(id, { destacado: !mockPost.destacado }); // Llama a la versión neutralizada de updatePost
}

/**
 * MÉTODOS PARA CATEGORÍAS (NEUTRALIZADOS)
 */

/**
 * Carga todas las categorías desde localStorage (NEUTRALIZADA)
 */
export function loadCategories(): Category[] {
  console.log("NEUTRALIZADO: loadCategories llamado. Devuelve array vacío. Usar mock data del contexto.");
  // try {
  //   const data = localStorage.getItem(CATEGORIES_STORAGE_KEY);
  //   return data ? JSON.parse(data) : [];
  // } catch (error) {
  //   console.error('Error loading categories:', error);
  //   return [];
  // }
  return [];
}

/**
 * Guarda todas las categorías en localStorage (NEUTRALIZADA)
 */
export function saveCategories(categories: Category[]): void {
  console.log("NEUTRALIZADO: saveCategories llamado. No se interactúa con localStorage.");
  // try {
  //   localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  // } catch (error) {
  //   console.error('Error saving categories:', error);
  // }
}

/**
 * Obtiene una categoría por su ID (NEUTRALIZADA)
 */
export function getCategoryById(id: number): Category | undefined {
  console.log(`NEUTRALIZADO: getCategoryById llamado para ID ${id}. Devuelve undefined. Usar mock data del contexto.`);
  // const categories = loadCategories(); // No llamar a la versión neutralizada
  // return categories.find(category => category.id === id);
  return undefined;
}

/**
 * Obtiene una categoría por su nombre (NEUTRALIZADA)
 */
export function getCategoryByName(name: string): Category | undefined {
  console.log(`NEUTRALIZADO: getCategoryByName llamado para nombre ${name}. Devuelve undefined. Usar mock data del contexto.`);
  // const categories = loadCategories(); // No llamar a la versión neutralizada
  // return categories.find(category => category.nombre.toLowerCase() === name.toLowerCase());
  return undefined;
} 