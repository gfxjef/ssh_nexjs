'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Post, 
  Category, 
  PostsContextType, 
  PostStatus, 
  PostFilters 
} from '../../../../lib/bienestar/types';
import { 
  initializeStorage, 
  loadPosts, 
  loadCategories, 
  addPost as addPostToStorage, 
  updatePost as updatePostInStorage, 
  deletePost as deletePostFromStorage, 
  getPostById as getPostByIdFromStorage,
  getCategoryById as getCategoryByIdFromStorage,
  changePostStatus as changePostStatusInStorage,
  togglePostHighlight as togglePostHighlightInStorage,
  clearStorage
} from '../../../../lib/bienestar/storage';
import { useNotifications } from './NotificationsContext';

// Crear contexto con valor inicial
const PostsContext = createContext<PostsContextType | undefined>(undefined);

/**
 * Proveedor del contexto de posts
 */
export function PostsProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PostFilters>({
    status: 'todos',
    search: '',
    category: 'todas',
    sortBy: 'recientes'
  });

  const { showNotification } = useNotifications();

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Verificar si ya hay datos en localStorage antes de inicializar
        const existingPosts = localStorage.getItem('bienestar_posts');
        const existingCategories = localStorage.getItem('bienestar_categories');
        
        if (!existingPosts || !existingCategories) {
          // Solo inicializar si no hay datos
          console.log("Inicializando datos de bienestar posts...");
          initializeStorage(true);
        } else {
          console.log("Usando datos existentes de bienestar posts");
        }

        // Cargar posts y categorías
        const loadedPosts = loadPosts();
        const loadedCategories = loadCategories();

        setPosts(loadedPosts);
        setCategories(loadedCategories);
        setError(null);
      } catch (err) {
        setError('Error al cargar datos: ' + (err instanceof Error ? err.message : String(err)));
        showNotification('Error al cargar datos', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [showNotification]);

  // Función para filtrar posts según los criterios actuales
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Filtrar por estado
    if (filters.status && filters.status !== 'todos') {
      result = result.filter(post => post.estado === filters.status);
    }

    // Filtrar por búsqueda
    if (filters.search && filters.search.trim() !== '') {
      const searchTerm = filters.search.toLowerCase().trim();
      result = result.filter(post => 
        post.titulo.toLowerCase().includes(searchTerm) ||
        post.extracto.toLowerCase().includes(searchTerm) ||
        post.autor.toLowerCase().includes(searchTerm)
      );
    }

    // Filtrar por categoría
    if (filters.category && filters.category !== 'todas') {
      if (typeof filters.category === 'string') {
        result = result.filter(post => post.categoria === filters.category);
      } else if (typeof filters.category === 'number') {
        result = result.filter(post => post.categoriaId === filters.category);
      }
    }

    // Ordenar posts
    switch (filters.sortBy) {
      case 'recientes':
        result.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        break;
      case 'antiguos':
        result.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        break;
      case 'populares':
        result.sort((a, b) => b.vistas - a.vistas);
        break;
      case 'alfabetico':
        result.sort((a, b) => a.titulo.localeCompare(b.titulo));
        break;
    }

    return result;
  }, [posts, filters]);

  // Actualizar filtros
  const updateFilters = useCallback((newFilters: Partial<PostFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Métodos CRUD
  const addPost = useCallback(async (postData: Omit<Post, 'id'>) => {
    try {
      setLoading(true);
      const newPost = addPostToStorage(postData);
      setPosts(prev => [...prev, newPost]);
      showNotification('Post creado correctamente', 'success');
      return newPost;
    } catch (err) {
      const errorMsg = 'Error al crear post: ' + (err instanceof Error ? err.message : String(err));
      setError(errorMsg);
      showNotification(errorMsg, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const updatePost = useCallback(async (id: number, updates: Partial<Post>) => {
    try {
      setLoading(true);
      const updatedPost = updatePostInStorage(id, updates);
      
      if (!updatedPost) {
        throw new Error('Post no encontrado');
      }
      
      setPosts(prev => prev.map(post => post.id === id ? updatedPost : post));
      showNotification('Post actualizado correctamente', 'success');
      return updatedPost;
    } catch (err) {
      const errorMsg = 'Error al actualizar post: ' + (err instanceof Error ? err.message : String(err));
      setError(errorMsg);
      showNotification(errorMsg, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const deletePost = useCallback(async (id: number) => {
    try {
      setLoading(true);
      const success = deletePostFromStorage(id);
      
      if (!success) {
        throw new Error('Post no encontrado');
      }
      
      setPosts(prev => prev.filter(post => post.id !== id));
      showNotification('Post eliminado correctamente', 'success');
      return true;
    } catch (err) {
      const errorMsg = 'Error al eliminar post: ' + (err instanceof Error ? err.message : String(err));
      setError(errorMsg);
      showNotification(errorMsg, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const getPostById = useCallback((id: number): Post | undefined => {
    // Obtener post original
    const post = getPostByIdFromStorage(id);
    
    if (post && post.estado === 'publicado') {
      // Incrementar vistas solo si es un post publicado
      const updatedPost = updatePostInStorage(id, { vistas: post.vistas + 1 });
      
      // Actualizar el estado local si se incrementaron las vistas
      if (updatedPost) {
        setPosts(prev => prev.map(p => p.id === id ? updatedPost : p));
        return updatedPost;
      }
    }
    
    return post;
  }, []);

  // Métodos para categorías
  const getCategories = useCallback((): Category[] => {
    return categories;
  }, [categories]);

  const getCategoryById = useCallback((id: number): Category | undefined => {
    return getCategoryByIdFromStorage(id);
  }, []);

  // Acciones de gestión
  const toggleHighlight = useCallback(async (id: number): Promise<Post> => {
    try {
      setLoading(true);
      const updatedPost = togglePostHighlightInStorage(id);
      
      if (!updatedPost) {
        throw new Error('Post no encontrado');
      }
      
      setPosts(prev => prev.map(post => post.id === id ? updatedPost : post));
      showNotification(
        updatedPost.destacado 
          ? 'Post marcado como destacado' 
          : 'Post desmarcado como destacado', 
        'success'
      );
      return updatedPost;
    } catch (err) {
      const errorMsg = 'Error al cambiar destacado: ' + (err instanceof Error ? err.message : String(err));
      setError(errorMsg);
      showNotification(errorMsg, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const changeStatus = useCallback(async (id: number, status: PostStatus): Promise<Post> => {
    try {
      setLoading(true);
      const updatedPost = changePostStatusInStorage(id, status);
      
      if (!updatedPost) {
        throw new Error('Post no encontrado');
      }
      
      setPosts(prev => prev.map(post => post.id === id ? updatedPost : post));
      showNotification(`Post cambiado a estado: ${status}`, 'success');
      return updatedPost;
    } catch (err) {
      const errorMsg = 'Error al cambiar estado: ' + (err instanceof Error ? err.message : String(err));
      setError(errorMsg);
      showNotification(errorMsg, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // Valor del contexto
  const value = {
    posts,
    categories,
    loading,
    error,
    
    // Métodos CRUD
    addPost,
    updatePost,
    deletePost,
    getPostById,
    
    // Métodos para categorías
    getCategories,
    getCategoryById,
    
    // Estado y filtrado
    filters,
    setFilters: updateFilters,
    filteredPosts,
    
    // Acciones de gestión
    toggleHighlight,
    changeStatus
  };

  return (
    <PostsContext.Provider value={value}>
      {children}
    </PostsContext.Provider>
  );
}

/**
 * Hook personalizado para usar el contexto de posts
 */
export function usePosts() {
  const context = useContext(PostsContext);
  
  if (context === undefined) {
    throw new Error('usePosts debe usarse dentro de un PostsProvider');
  }
  
  return context;
} 