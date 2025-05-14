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
  getAllCategories as apiGetAllCategories,
  // getCategoryById as apiGetCategoryById, // No se usa directamente en el contexto para "getCategoryById", se filtra del estado local
  createCategory as apiCreateCategory, // Para futura admin de categorías
  updateCategory as apiUpdateCategory, // Para futura admin de categorías
  deleteCategory as apiDeleteCategory, // Para futura admin de categorías
  getAllPosts as apiGetAllPosts,
  getPostById as apiGetPostById, // Se usa para obtener un post individual, podría ser útil para refrescar
  createPost as apiCreatePost,
  updatePost as apiUpdatePost,
  deletePost as apiDeletePost,
  changePostStatus as apiChangePostStatus,
  togglePostHighlight as apiTogglePostHighlight
} from '../../../../lib/api/bienestarApi';
import { useNotifications } from './NotificationsContext';

const PostsContext = createContext<PostsContextType | undefined>(undefined);

export function PostsProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PostFilters>({
    status: 'todos',
    search: '',
    category: 'todas',
    sortBy: 'recientes', // El backend no soporta sortBy aún, el ordenamiento se hará en cliente
    destacados: false,
  });

  const { showNotification } = useNotifications();

  // Cargar datos iniciales desde la API
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Cargando datos iniciales desde la API...");
        const [fetchedPosts, fetchedCategories] = await Promise.all([
          apiGetAllPosts(filters), // Carga inicial con filtros por defecto
          apiGetAllCategories()
        ]);
        setPosts(fetchedPosts);
        setCategories(fetchedCategories);
        console.log("Datos iniciales cargados desde API:", { numPosts: fetchedPosts.length, numCategories: fetchedCategories.length });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        showNotification(`Error al cargar datos iniciales: ${errorMsg}`, 'error');
        console.error("Error cargando datos iniciales:", errorMsg);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Cargar solo una vez al montar. Los filtros se aplicarán con otra llamada.

  // Efecto para recargar posts cuando cambian los filtros
  useEffect(() => {
    const fetchPostsByFilters = async () => {
      // No recargar en la carga inicial, ya se hizo arriba
      if(loading && posts.length === 0 && categories.length === 0) return;

      try {
        setLoading(true);
        setError(null);
        console.log("Recargando posts por filtros desde API:", filters);
        const fetchedPosts = await apiGetAllPosts(filters);
        setPosts(fetchedPosts);
        console.log("Posts recargados desde API:", { numPosts: fetchedPosts.length });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        showNotification(`Error al cargar posts: ${errorMsg}`, 'error');
        console.error("Error recargando posts:", errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchPostsByFilters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]); // Dependencia solo de filters para recargar posts

  const filteredPostsClientSide = useMemo(() => {
    let result = [...posts];
    // El filtrado por API ya debería haber hecho la mayor parte del trabajo.
    // Este filtrado/ordenamiento cliente es principalmente para sortBy, o si la API no cubre todos los casos.

    // Ordenar posts (ya que el backend no lo hace por ahora)
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
  }, [posts, filters.sortBy]);

  const updateFilters = useCallback((newFilters: Partial<PostFilters>) => {
    console.log("Contexto: Actualizando filtros y disparando recarga de posts", newFilters);
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const addPost = useCallback(async (postData: Omit<Post, 'id' | 'fecha' | 'vistas' | 'categoria'>): Promise<Post> => {
    setLoading(true);
    try {
      const newPost = await apiCreatePost(postData);
      setPosts(prev => [newPost, ...prev]);
      showNotification('Post creado correctamente.', 'success');
      return newPost;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showNotification(`Error al crear post: ${errorMsg}`, 'error');
      console.error("Error en addPost:", errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const updatePost = useCallback(async (id: number, updates: Partial<Omit<Post, 'id' | 'fecha' | 'vistas' | 'categoria'>>): Promise<Post> => {
    setLoading(true);
    try {
      const updatedPost = await apiUpdatePost(id, updates);
      setPosts(prev => prev.map(p => (p.id === id ? updatedPost : p)));
      showNotification(`Post ID ${id} actualizado correctamente.`, 'success');
      return updatedPost;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showNotification(`Error al actualizar post: ${errorMsg}`, 'error');
      console.error("Error en updatePost:", errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const deletePost = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    try {
      await apiDeletePost(id);
      setPosts(prev => prev.filter(post => post.id !== id));
      showNotification(`Post ID ${id} eliminado correctamente.`, 'success');
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showNotification(`Error al eliminar post: ${errorMsg}`, 'error');
      console.error("Error en deletePost:", errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const getPostById = useCallback((id: number): Post | undefined => {
    // Esta función ahora simplemente busca en el estado local.
    // Para obtener/refrescar un post específico desde la API, se debe llamar a `apiGetPostById` directamente donde se necesite.
    console.log(`CONTEXTO: Buscando post por ID ${id} en estado local.`);
    return posts.find(p => p.id === id);
  }, [posts]);

  const getCategories = useCallback((): Category[] => {
    return categories;
  }, [categories]);

  const getCategoryById = useCallback((id: number): Category | undefined => {
    return categories.find(category => category.id === id);
  }, [categories]);

  const toggleHighlight = useCallback(async (id: number): Promise<Post> => {
    setLoading(true);
    try {
      const currentPost = posts.find(p => p.id === id);
      if (!currentPost) throw new Error("Post no encontrado para destacar");
      const updatedPost = await apiTogglePostHighlight(id, !currentPost.destacado);
      setPosts(prev => prev.map(p => (p.id === id ? updatedPost : p)));
      showNotification(`Destacado del Post ID ${id} cambiado.`, 'success');
      return updatedPost;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showNotification(`Error al cambiar destacado: ${errorMsg}`, 'error');
      console.error("Error en toggleHighlight:", errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [posts, showNotification]);

  const changeStatus = useCallback(async (id: number, status: PostStatus): Promise<Post> => {
    setLoading(true);
    try {
      const updatedPost = await apiChangePostStatus(id, status);
      setPosts(prev => prev.map(p => (p.id === id ? updatedPost : p)));
      showNotification(`Estado del Post ID ${id} cambiado a ${status}.`, 'success');
      return updatedPost;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showNotification(`Error al cambiar estado: ${errorMsg}`, 'error');
      console.error("Error en changeStatus:", errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const value = {
    posts,
    categories,
    loading,
    error,
    addPost,
    updatePost,
    deletePost,
    getPostById,
    getCategories,
    getCategoryById,
    filters,
    setFilters: updateFilters,
    filteredPosts: filteredPostsClientSide, // Usar los posts filtrados/ordenados por el cliente
    toggleHighlight,
    changeStatus
  };

  return (
    <PostsContext.Provider value={value}>
      {children}
    </PostsContext.Provider>
  );
}

export function usePosts() {
  const context = useContext(PostsContext);
  if (context === undefined) {
    throw new Error('usePosts debe usarse dentro de un PostsProvider');
  }
  return context;
} 