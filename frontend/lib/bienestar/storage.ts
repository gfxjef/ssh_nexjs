/**
 * Servicio de almacenamiento local para posts y categorías
 * Utiliza localStorage para persistencia de datos
 */

import { Post, Category, PostStatus } from './types';

// Claves para localStorage
const POSTS_STORAGE_KEY = 'bienestar_posts';
const CATEGORIES_STORAGE_KEY = 'bienestar_categories';

// Datos iniciales de ejemplo para categorías
const initialCategories: Category[] = [
  { id: 1, nombre: 'Tecnología', color: '#2e3954' },
  { id: 2, nombre: 'Desarrollo', color: '#8dbba3' },
  { id: 3, nombre: 'Diseño', color: '#d48b45' },
  { id: 4, nombre: 'Bienestar', color: '#6366f1' },
  { id: 5, nombre: 'Eventos', color: '#f59e0b' }
];

// Datos iniciales de ejemplo para posts
const initialPosts: Post[] = [
  {
    id: 1,
    titulo: 'Cómo implementar autenticación en NextJS',
    extracto: 'Una guía paso a paso para implementar autenticación segura en tus aplicaciones web...',
    contenido: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc eu nisl. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc eu nisl.',
    categoria: 'Tecnología',
    categoriaId: 1,
    fecha: '2023-06-02',
    autor: 'Ana Martínez',
    vistas: 1240,
    estado: 'publicado',
    destacado: true,
    imagenUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop'
  },
  {
    id: 2,
    titulo: 'Los mejores hooks personalizados para React',
    extracto: 'Optimiza tu código y mejora la reutilización con estos hooks personalizados...',
    contenido: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc eu nisl. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc eu nisl.',
    categoria: 'Desarrollo',
    categoriaId: 2,
    fecha: '2023-05-28',
    autor: 'Pedro Sánchez',
    vistas: 985,
    estado: 'publicado',
    destacado: false,
    imagenUrl: 'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&auto=format&fit=crop'
  },
  {
    id: 3,
    titulo: 'Principios de diseño UI/UX para desarrolladores',
    extracto: 'Aprende los fundamentos de diseño que todo desarrollador debería conocer...',
    contenido: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc eu nisl. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc eu nisl.',
    categoria: 'Diseño',
    categoriaId: 3,
    fecha: '2023-05-20',
    autor: 'Lucía Rodríguez',
    vistas: 762,
    estado: 'borrador',
    destacado: false,
    imagenUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&auto=format&fit=crop'
  },
  {
    id: 4,
    titulo: '5 Ejercicios para prevenir lesiones por uso de computadora',
    extracto: 'Mantén tu cuerpo sano con estos ejercicios mientras trabajas muchas horas frente a la computadora...',
    contenido: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc eu nisl. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc eu nisl.',
    categoria: 'Bienestar',
    categoriaId: 4,
    fecha: '2023-05-15',
    autor: 'Martín García',
    vistas: 542,
    estado: 'publicado',
    destacado: false,
    imagenUrl: 'https://images.unsplash.com/photo-1579126038374-6064e9370f0f?w=800&auto=format&fit=crop'
  },
  {
    id: 5,
    titulo: 'Nextjs 13: Novedades y mejoras en el framework',
    extracto: 'Descubre las nuevas características y mejoras de rendimiento que trae la versión 13 de Next.js...',
    contenido: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc eu nisl. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc eu nisl.',
    categoria: 'Tecnología',
    categoriaId: 1,
    fecha: '2023-05-12',
    autor: 'Carlos Vega',
    vistas: 1576,
    estado: 'borrador',
    destacado: true,
    imagenUrl: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800&auto=format&fit=crop'
  },
  {
    id: 6,
    titulo: 'Automatiza tus pruebas con Jest y Testing Library',
    extracto: 'Aprende a configurar y usar estas potentes herramientas para pruebas automatizadas...',
    contenido: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc eu nisl. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc eu nisl.',
    categoria: 'Desarrollo',
    categoriaId: 2,
    fecha: '2023-05-08',
    autor: 'Sandra Morales',
    vistas: 892,
    estado: 'archivado',
    destacado: false,
    imagenUrl: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=800&auto=format&fit=crop'
  }
];

/**
 * Inicializa el almacenamiento local si no existe
 */
export function initializeStorage(forceReset = false): void {
  // Si se fuerza el reset o no hay datos en localStorage, inicializar
  if (forceReset || !localStorage.getItem(CATEGORIES_STORAGE_KEY)) {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(initialCategories));
  }
  
  if (forceReset || !localStorage.getItem(POSTS_STORAGE_KEY)) {
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(initialPosts));
  }
}

/**
 * Limpia todos los datos almacenados
 */
export function clearStorage(): void {
  localStorage.removeItem(POSTS_STORAGE_KEY);
  localStorage.removeItem(CATEGORIES_STORAGE_KEY);
}

/**
 * MÉTODOS PARA POSTS
 */

/**
 * Carga todos los posts desde localStorage
 */
export function loadPosts(): Post[] {
  try {
    const data = localStorage.getItem(POSTS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading posts:', error);
    return [];
  }
}

/**
 * Guarda todos los posts en localStorage
 */
export function savePosts(posts: Post[]): void {
  try {
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
  } catch (error) {
    console.error('Error saving posts:', error);
  }
}

/**
 * Obtiene un post por su ID
 */
export function getPostById(id: number): Post | undefined {
  const posts = loadPosts();
  return posts.find(post => post.id === id);
}

/**
 * Agrega un nuevo post
 */
export function addPost(post: Omit<Post, 'id'>): Post {
  const posts = loadPosts();
  
  // Generar un nuevo ID único
  const newId = posts.length > 0 
    ? Math.max(...posts.map(p => p.id)) + 1 
    : 1;
  
  const newPost: Post = {
    ...post,
    id: newId,
    fecha: post.fecha || new Date().toISOString().split('T')[0],
    vistas: post.vistas || 0
  };
  
  posts.push(newPost);
  savePosts(posts);
  
  return newPost;
}

/**
 * Actualiza un post existente
 */
export function updatePost(id: number, updates: Partial<Post>): Post | null {
  const posts = loadPosts();
  const index = posts.findIndex(post => post.id === id);
  
  if (index === -1) {
    return null;
  }
  
  const updatedPost = { ...posts[index], ...updates };
  posts[index] = updatedPost;
  savePosts(posts);
  
  return updatedPost;
}

/**
 * Elimina un post por su ID
 */
export function deletePost(id: number): boolean {
  const posts = loadPosts();
  const filteredPosts = posts.filter(post => post.id !== id);
  
  if (filteredPosts.length === posts.length) {
    return false; // No se encontró el post con el ID proporcionado
  }
  
  savePosts(filteredPosts);
  return true;
}

/**
 * Cambia el estado de un post
 */
export function changePostStatus(id: number, status: PostStatus): Post | null {
  return updatePost(id, { estado: status });
}

/**
 * Cambia el valor destacado de un post
 */
export function togglePostHighlight(id: number): Post | null {
  const post = getPostById(id);
  if (!post) return null;
  
  return updatePost(id, { destacado: !post.destacado });
}

/**
 * MÉTODOS PARA CATEGORÍAS
 */

/**
 * Carga todas las categorías desde localStorage
 */
export function loadCategories(): Category[] {
  try {
    const data = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading categories:', error);
    return [];
  }
}

/**
 * Guarda todas las categorías en localStorage
 */
export function saveCategories(categories: Category[]): void {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch (error) {
    console.error('Error saving categories:', error);
  }
}

/**
 * Obtiene una categoría por su ID
 */
export function getCategoryById(id: number): Category | undefined {
  const categories = loadCategories();
  return categories.find(category => category.id === id);
}

/**
 * Obtiene una categoría por su nombre
 */
export function getCategoryByName(name: string): Category | undefined {
  const categories = loadCategories();
  return categories.find(category => category.nombre.toLowerCase() === name.toLowerCase());
} 