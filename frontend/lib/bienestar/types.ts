/**
 * Tipos e interfaces para el sistema de Posts de Bienestar
 */

// Tipo para estados de post
export type PostStatus = 'publicado' | 'borrador' | 'archivado';

// Tipo para ordenamiento de posts
export type PostSort = 'recientes' | 'antiguos' | 'populares' | 'alfabetico';

// Interfaz para categoría
export interface Category {
  id: number;
  nombre: string;
  color: string;
}

// Interfaz para post
export interface Post {
  id: number;
  titulo: string;
  extracto: string;
  contenido?: string;  // Opcional para la vista de listado
  categoria: string;   // Nombre de la categoría (para mostrar)
  categoriaId: number; // ID de la categoría (para relaciones)
  fecha: string;       // Formato ISO
  autor: string;
  vistas: number;
  estado: PostStatus;
  destacado: boolean;
  imagenUrl?: string;  // URL de la imagen (opcional)
}

// Interfaz para filtros de posts
export interface PostFilters {
  status?: PostStatus | 'todos';
  search?: string;
  category?: string | number | 'todas';
  sortBy?: PostSort;
}

// Configuración visual para los estados
export interface StatusConfig {
  color: string;
  texto: string;
}

// Interfaz para el contexto de posts
export interface PostsContextType {
  posts: Post[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  
  // Métodos CRUD
  addPost: (post: Omit<Post, 'id'>) => Promise<Post>;
  updatePost: (id: number, updates: Partial<Post>) => Promise<Post>;
  deletePost: (id: number) => Promise<boolean>;
  getPostById: (id: number) => Post | undefined;
  
  // Métodos para categorías
  getCategories: () => Category[];
  getCategoryById: (id: number) => Category | undefined;
  
  // Estado y filtrado
  filters: PostFilters;
  setFilters: (filters: Partial<PostFilters>) => void;
  filteredPosts: Post[];
  
  // Acciones de gestión
  toggleHighlight: (id: number) => Promise<Post>;
  changeStatus: (id: number, status: PostStatus) => Promise<Post>;
}

// Interfaz para notificaciones
export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

// Interfaz para el contexto de notificaciones
export interface NotificationsContextType {
  notifications: Notification[];
  showNotification: (message: string, type: Notification['type'], duration?: number) => void;
  hideNotification: (id: string) => void;
  clearAllNotifications: () => void;
} 