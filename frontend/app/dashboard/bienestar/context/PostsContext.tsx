'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Post,
  Category,
  PostsContextType,
  PostStatus,
  PostFilters
} from '../../../../lib/bienestar/types';
import {
  getAllCategories as apiGetAllCategories,
  getAllPosts as apiGetAllPosts,
  createPost as apiCreatePost,
  updatePost as apiUpdatePost,
  deletePost as apiDeletePost,
  changePostStatus as apiChangePostStatus,
  togglePostHighlight as apiTogglePostHighlight,
  resendPostEmail as apiResendPostEmail
} from '../../../../lib/api/bienestarApi';
import { useNotifications } from './NotificationsContext';

const PostsContext = createContext<PostsContextType | undefined>(undefined);

export function PostsProvider({ children }: { children: React.ReactNode }) {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
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
  const initialLoadComplete = useRef(false); // Nuevo Ref

  // Cargar datos iniciales desde la API
  useEffect(() => {
    // Si ya se completó la carga inicial en una ejecución anterior de este efecto (debido a StrictMode)
    // O si ya marcamos como completa, no hacer nada más.
    if (initialLoadComplete.current && allPosts.length > 0 && categories.length > 0) {
        // Esto es para manejar el doble efecto de StrictMode sin rehacer la llamada API si ya tenemos datos.
        // Pero si el estado se limpió por alguna razón, permitiría recargar.
        // Sin embargo, el ref previene la doble llamada de la lógica de fetch.
        // La comprobación de posts.length y categories.length es una doble seguridad.
        console.log("Carga inicial ya realizada o en progreso por otra instancia del efecto (StrictMode), o datos ya presentes.");
        if (!loading && (allPosts.length === 0 || categories.length === 0)) {
            // Caso raro: se marcó como completo, pero no hay datos y no estamos cargando. Forzar recarga.
            console.warn("Carga inicial marcada completa pero sin datos y no cargando. Reiniciando carga.");
        } else if (loading) {
            // Ya está cargando, probablemente la primera instancia del efecto en StrictMode
            return;
        } else {
            // Datos presentes y no cargando.
            return;
        }
    }

    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("CONTEXTO: Iniciando carga de datos iniciales desde la API...");
        const [fetchedPosts, fetchedCategories] = await Promise.all([
          apiGetAllPosts(filters), // Carga inicial con filtros por defecto
          apiGetAllCategories()
        ]);
        setAllPosts(fetchedPosts);
        setCategories(fetchedCategories);
        initialLoadComplete.current = true; // Marcar como completada
        console.log("CONTEXTO: Datos iniciales cargados y procesados desde API:", { numPosts: fetchedPosts.length, numCategories: fetchedCategories.length });
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

  // Efecto para recargar posts cuando cambian los filtros QUE REQUIEREN LLAMADA A API
  useEffect(() => {
    const previousFilters = initialLoadComplete.current ? filters : undefined; // Para evitar la comparación en la primera carga si initialLoadComplete es falso
    
    const fetchPostsIfNecessary = async () => {
      if (!initialLoadComplete.current) {
        console.log("CONTEXTO: Recarga por filtros diferida, carga inicial no completada.");
        return;
      }

      // Determinar si el cambio de filtro requiere una llamada a la API.
      // Solo llamamos a la API si cambia 'status', o 'destacados' 
      // o si volvemos a un estado "todos" desde un filtro específico.
      // La búsqueda (search) ahora se manejará en cliente si allPosts ya tiene datos.
      const requiresApiCall = 
        (previousFilters && previousFilters.status !== filters.status && filters.status !== 'todos') ||
        (previousFilters && previousFilters.destacados !== filters.destacados) || 
        ( (filters.status === 'todos' /*&& !filters.destacados*/) && // Volviendo a "ver todo" para status
          (previousFilters && (previousFilters.status !== 'todos' /*|| previousFilters.destacados*/))
        ) || (!allPosts.length && filters.search); // Llamar a la API si hay búsqueda y no hay posts cargados

      if (requiresApiCall) {
        try {
          setLoading(true);
          setError(null);
          console.log("CONTEXTO: Recargando posts por cambio de filtros (que requieren API) desde API:", filters);
          const fetchedPosts = await apiGetAllPosts(filters);
          setAllPosts(fetchedPosts); // Actualizar la base de posts
          console.log("CONTEXTO: Posts base recargados por filtros (que requieren API) desde API:", { numPosts: fetchedPosts.length });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          setError(errorMsg);
          showNotification(`Error al cargar posts: ${errorMsg}`, 'error');
          console.error("Error recargando posts:", errorMsg);
        } finally {
          setLoading(false);
        }
      } else if (previousFilters) { // Si no requiere API call, pero los filtros cambiaron (ej. category, sortBy)
        console.log("CONTEXTO: Filtros cambiados, aplicando en cliente:", filters);
        // No es necesario hacer nada aquí, el useMemo `filteredPosts` se recalculará automáticamente.
      }
    };

    fetchPostsIfNecessary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.destacados, showNotification]); // Quitado filters.search de aquí

  const filteredPosts = useMemo(() => {
    let result = [...allPosts]; // Empezar con todos los posts base
    console.log("CONTEXTO: Recalculando filteredPosts. Base:", allPosts.length, "Filtros:", filters);

    // Aplicar filtro de categoría (cliente)
    if (filters.category && filters.category !== 'todas') {
      // Asegurarse que category es un string para toLowerCase y la comparación
      const categoryName = String(filters.category).toLowerCase(); 
      const categoryObj = categories.find(c => c.nombre.toLowerCase() === categoryName);
      if (categoryObj) {
          result = result.filter(post => post.categoriaId === categoryObj.id);
          console.log(`CONTEXTO: Después de filtrar por categoría '${filters.category}': ${result.length} posts`);
      } else {
          console.warn(`CONTEXTO: Categoría '${filters.category}' no encontrada para filtrar.`);
      }
    }

    // Aplicar filtro de búsqueda (cliente)
    if (filters.search) {
      const searchTermLower = filters.search.toLowerCase();
      result = result.filter(post =>
        post.titulo.toLowerCase().includes(searchTermLower) ||
        post.extracto.toLowerCase().includes(searchTermLower) ||
        (post.contenido && post.contenido.toLowerCase().includes(searchTermLower)) || // Asumiendo que post.contenido existe y es string
        post.autor.toLowerCase().includes(searchTermLower) ||
        post.categoria.toLowerCase().includes(searchTermLower)
      );
      console.log(`CONTEXTO: Después de filtrar por búsqueda cliente '${filters.search}': ${result.length} posts`);
    }

    // Aplicar filtro de estado (cliente, si 'status' está presente y no se hizo llamada API por él)
    // Similar a la búsqueda, el useEffect ya maneja recargas de API para 'status'.
    if (filters.status && filters.status !== 'todos') {
        // Si el useEffect NO hizo una llamada API por este cambio de status (porque allPosts ya contenía todo)
        // entonces este filtro cliente es necesario.
        // Pero nuestra lógica de useEffect *sí* llama a la API si status cambia (y no es 'todos').
        // Entonces, este filtro cliente es principalmente una salvaguarda o para si `allPosts` es genérico.
        const currentAllPostsFilteredByApiForStatus = allPosts.every(p => p.estado === filters.status || allPosts.length === 0);
        if (!currentAllPostsFilteredByApiForStatus) { // Solo aplicar si allPosts no está ya filtrado por este status
            result = result.filter(post => post.estado === filters.status);
            console.log(`CONTEXTO: Después de filtrar por estado (cliente) '${filters.status}': ${result.length} posts`);
        }
    }
    
    // Aplicar filtro de destacados (cliente)
    // El filtro de destacados de la API ya se maneja en el useEffect si cambia.
    // Este es para si queremos alternar la vista de destacados sobre los posts ya filtrados.
    // No, filters.destacados en el contexto es para PEDIR destacados a la API.
    // El filtrado de si un post ES destacado se hace en la UI (como en posts/page.tsx).
    // No se aplica aquí a menos que queramos que filteredPosts solo contenga destacados.

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
    console.log(`CONTEXTO: Final filteredPosts después de ordenar por '${filters.sortBy}': ${result.length} posts`);
    return result;
  }, [allPosts, categories, filters]); // filters completos aquí para que reaccione a category y sortBy

  const updateFilters = useCallback((newFilters: Partial<PostFilters>) => {
    console.log("Contexto: Actualizando filtros", newFilters);
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const addPost = useCallback(async (postData: Omit<Post, 'id' | 'fecha' | 'vistas' | 'categoria'>): Promise<Post> => {
    setLoading(true);
    try {
      const newPost = await apiCreatePost(postData);
      setAllPosts(prev => [newPost, ...prev].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())); // Mantener orden
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
      const currentPost = allPosts.find(p => p.id === id);
      if (!currentPost) throw new Error("Post no encontrado para actualizar");
      
      // Guardar una copia del post actual por si la respuesta de la API viene sin algunos campos
      const currentPostBackup = { ...currentPost };
      
      const updatedPost = await apiUpdatePost(id, updates);
      
      // Asegurarse de que el post actualizado tenga todos los campos necesarios
      // Si alguno falta, usar el valor del post original
      const mergedPost = {
        ...currentPostBackup,  // Primero usamos los datos originales como base
        ...updatedPost,        // Luego aplicamos los datos actualizados encima
        // Asegurarnos de que vistas y otros campos vitales existan
        vistas: updatedPost.vistas !== undefined ? updatedPost.vistas : currentPostBackup.vistas || 0,
      };
      
      setAllPosts(prev => prev.map(p => (p.id === id ? mergedPost : p)));
      showNotification(`Post ID ${id} actualizado correctamente.`, 'success');
      return mergedPost;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showNotification(`Error al actualizar post: ${errorMsg}`, 'error');
      console.error("Error en updatePost:", errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showNotification, allPosts]);

  const deletePost = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    try {
      await apiDeletePost(id);
      setAllPosts(prev => prev.filter(post => post.id !== id));
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
    console.log(`CONTEXTO: Buscando post por ID ${id} en estado local (allPosts).`);
    return allPosts.find(p => p.id === id);
  }, [allPosts]);

  const getCategories = useCallback((): Category[] => {
    return categories;
  }, [categories]);

  const getCategoryById = useCallback((id: number): Category | undefined => {
    return categories.find(category => category.id === id);
  }, [categories]);

  const toggleHighlight = useCallback(async (id: number): Promise<Post> => {
    setLoading(true);
    try {
      const currentPost = allPosts.find(p => p.id === id);
      if (!currentPost) throw new Error("Post no encontrado para destacar");
      
      // Guardar una copia del post actual por si la respuesta de la API viene sin algunos campos
      const currentPostBackup = { ...currentPost };
      
      const updatedPost = await apiTogglePostHighlight(id, !currentPost.destacado);
      
      // Asegurarse de que el post actualizado tenga todos los campos necesarios
      // Si alguno falta, usar el valor del post original
      const mergedPost = {
        ...currentPostBackup,  // Primero usamos los datos originales como base
        ...updatedPost,        // Luego aplicamos los datos actualizados encima
        // Asegurarnos de que vistas y otros campos vitales existan
        vistas: updatedPost.vistas !== undefined ? updatedPost.vistas : currentPostBackup.vistas || 0,
        // Forzar el valor inverso al estado actual para asegurar que el cambio se vea inmediatamente
        destacado: !currentPostBackup.destacado,
      };
      
      setAllPosts(prev => prev.map(p => (p.id === id ? mergedPost : p)));
      showNotification(`Destacado del Post ID ${id} cambiado.`, 'success');
      return mergedPost;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showNotification(`Error al cambiar destacado: ${errorMsg}`, 'error');
      console.error("Error en toggleHighlight:", errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showNotification, allPosts]);

  const changeStatus = useCallback(async (id: number, status: PostStatus): Promise<Post> => {
    setLoading(true);
    try {
      const currentPost = allPosts.find(p => p.id === id);
      if (!currentPost) throw new Error("Post no encontrado para cambiar estado");
      
      // Guardar una copia del post actual por si la respuesta de la API viene sin algunos campos
      const currentPostBackup = { ...currentPost };
      
      const updatedPost = await apiChangePostStatus(id, status);
      
      // Asegurarse de que el post actualizado tenga todos los campos necesarios
      // Si alguno falta, usar el valor del post original
      const mergedPost = {
        ...currentPostBackup,  // Primero usamos los datos originales como base
        ...updatedPost,        // Luego aplicamos los datos actualizados encima
        // Asegurarnos de que vistas y otros campos vitales existan
        vistas: updatedPost.vistas !== undefined ? updatedPost.vistas : currentPostBackup.vistas || 0,
      };
      
      setAllPosts(prev => prev.map(p => (p.id === id ? mergedPost : p)));
      showNotification(`Estado del Post ID ${id} cambiado a ${status}.`, 'success');
      return mergedPost;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showNotification(`Error al cambiar estado: ${errorMsg}`, 'error');
      console.error("Error en changeStatus:", errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showNotification, allPosts]);

  const resendEmail = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    try {
      const currentPost = allPosts.find(p => p.id === id);
      if (!currentPost) throw new Error("Post no encontrado para re-enviar email");
      
      if (currentPost.estado !== 'publicado') {
        throw new Error("Solo se pueden re-enviar emails de posts publicados");
      }
      
      const result = await apiResendPostEmail(id);
      
      if (result.success) {
        showNotification(`Email re-enviado exitosamente para "${result.post_title}"`, 'success');
        return true;
      } else {
        throw new Error("Error al re-enviar email");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      showNotification(`Error al re-enviar email: ${errorMsg}`, 'error');
      console.error("Error en resendEmail:", errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [showNotification, allPosts]);

  const value = {
    posts: filteredPosts, // Asignar el resultado del useMemo a 'posts' para satisfacer PostsContextType
    allPosts, // Exponer por si es útil en algún componente
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
    filteredPosts: filteredPosts, // Mantener filteredPosts también por si se usa directamente
    toggleHighlight,
    changeStatus,
    resendEmail
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