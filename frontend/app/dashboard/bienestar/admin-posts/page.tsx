'use client';

import { useState, useCallback } from 'react';
import { Post, StatusConfig } from '../../../../lib/bienestar/types';
import { Postulante, getPostulantesByPostId } from '../../../../lib/api/bienestarApi';
import { usePosts } from '../context/PostsContext';
import { useNotifications } from '../context/NotificationsContext';
import PostForm from '../../../../components/bienestar/PostForm';
import CategoryBadge from '../../../../components/bienestar/CategoryBadge';
import Notifications from '../../../../components/bienestar/Notifications';
import { PermissionButton, WithPermission, usePermissions } from '@/lib/permissions';

export default function AdminPosts() {
  // Estados locales para la interfaz
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  const [modoEdicion, setModoEdicion] = useState<boolean>(false);
  const [postSeleccionado, setPostSeleccionado] = useState<Post | null>(null);
  const [modalEliminar, setModalEliminar] = useState<boolean>(false);
  const [postAEliminar, setPostAEliminar] = useState<Post | null>(null);
  const [vistaActual, setVistaActual] = useState<'posts' | 'postulaciones'>('posts');
  
  // Estados para el modal de ver postulantes
  const [modalPostulantesAbierto, setModalPostulantesAbierto] = useState<boolean>(false);
  const [postSeleccionadoParaVerPostulantes, setPostSeleccionadoParaVerPostulantes] = useState<Post | null>(null);
  const [postulantesList, setPostulantesList] = useState<Postulante[]>([]);
  const [loadingPostulantes, setLoadingPostulantes] = useState<boolean>(false);
  
  // Obtener los datos y funciones del contexto
  const { 
    filteredPosts, 
    filters, 
    setFilters, 
    loading, 
    deletePost, 
    changeStatus, 
    toggleHighlight,
    categories,
  } = usePosts();
  const { showNotification } = useNotifications();
  const { userRole } = usePermissions();
  
  // Función para abrir modal en modo crear
  const abrirModalCrear = () => {
    setPostSeleccionado(null);
    setModoEdicion(false);
    setModalAbierto(true);
  };
  
  // Función para abrir modal en modo editar
  const abrirModalEditar = (post: Post) => {
    setPostSeleccionado(post);
    setModoEdicion(true);
    setModalAbierto(true);
  };
  
  // Función para cerrar modal
  const cerrarModal = () => {
    setModalAbierto(false);
    setPostSeleccionado(null);
  };

  // Función para confirmar eliminación
  const confirmarEliminar = (post: Post) => {
    setPostAEliminar(post);
    setModalEliminar(true);
  };
  
  // Función para eliminar post
  const eliminarPost = async () => {
    if (postAEliminar) {
      await deletePost(postAEliminar.id);
      setModalEliminar(false);
      setPostAEliminar(null);
    }
  };
  
  // Función para formatear fecha
  const formatearFecha = (fechaString: string) => {
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Función para cambiar el estado de un post
  const cambiarEstado = async (post: Post, nuevoEstado: 'publicado' | 'borrador' | 'archivado') => {
    await changeStatus(post.id, nuevoEstado);
  };

  // Función para cambiar destacado
  const cambiarDestacado = async (post: Post) => {
    await toggleHighlight(post.id);
  };

  // Obtener el color de la categoría
  const obtenerColorCategoria = useCallback((categoriaId: number) => {
    const categoria = categories.find(cat => cat.id === categoriaId);
    return categoria ? categoria.color : '#2e3954';
  }, [categories]);

  // Obtener el color y texto para el estado
  const obtenerEstadoConfig = (estado: string): StatusConfig => {
    switch (estado) {
      case 'publicado':
        return { color: 'bg-green-100 text-green-800', texto: 'Publicado' };
      case 'borrador':
        return { color: 'bg-yellow-100 text-yellow-800', texto: 'Borrador' };
      case 'archivado':
        return { color: 'bg-gray-100 text-gray-800', texto: 'Archivado' };
      default:
        return { color: 'bg-gray-100 text-gray-800', texto: estado };
    }
  };

  const abrirModalVerPostulantes = async (post: Post) => {
    setPostSeleccionadoParaVerPostulantes(post);
    setModalPostulantesAbierto(true);
    setLoadingPostulantes(true);
    setPostulantesList([]); // Limpiar lista anterior
    try {
      // Asumimos que el token se gestiona globalmente o se obtiene de alguna manera aquí
      // Por ahora, si tu API no requiere token para este endpoint específico, puedes omitir el segundo argumento.
      // Si sí lo requiere, necesitarás obtenerlo (ej. de localStorage o un contexto de autenticación)
      const token = localStorage.getItem('token'); // Ejemplo de obtención de token
      const data = await getPostulantesByPostId(post.id, token || undefined);
      setPostulantesList(data);
    } catch (error) {
      console.error("Error obteniendo postulantes:", error);
      showNotification('Error al cargar la lista de postulantes.', 'error');
      setPostulantesList([]); // Asegurar que la lista esté vacía en caso de error
    }
    setLoadingPostulantes(false);
  };

  const cerrarModalVerPostulantes = () => {
    setModalPostulantesAbierto(false);
    setPostSeleccionadoParaVerPostulantes(null);
    setPostulantesList([]);
    setLoadingPostulantes(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Componente de notificaciones */}
        <Notifications />
        
        {/* Cabecera con título y botón de nuevo post */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-[#2e3954]">Administración de Posts</h1>
          <PermissionButton 
            permissionId="add-post" 
            variant="primary"
            onClick={abrirModalCrear}
          >
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Nuevo Post
            </span>
          </PermissionButton>
        </div>
        
        {/* Información sobre permisos */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-blue-600">
            <strong>Tu rol actual:</strong> {userRole || 'No identificado'}
          </p>
          <p className="text-sm text-blue-500 mt-1">
            Los botones de acciones están controlados por permisos. Solo verás aquellos a los que tienes acceso.
          </p>
        </div>
        
        {/* Pestañas de Administración */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setVistaActual('posts')}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                vistaActual === 'posts'
                  ? 'border-[#2e3954] text-[#2e3954]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Administración de Posts
            </button>
            <button
              onClick={() => setVistaActual('postulaciones')}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                vistaActual === 'postulaciones'
                  ? 'border-[#2e3954] text-[#2e3954]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Gestión de Postulaciones
            </button>
          </nav>
        </div>
        
        {/* Contenido condicional basado en la vista actual */}
        {vistaActual === 'posts' && (
          <>
            {/* Pestañas para filtrar por estado */}
            <div className="border-b border-gray-200 mb-6">
              <ul className="flex flex-wrap -mb-px">
                <li className="mr-2">
                  <button
                    onClick={() => setFilters({ status: 'todos' })}
                    className={`inline-block py-2 px-4 text-sm font-medium ${
                      filters.status === 'todos' 
                        ? 'text-[#2e3954] border-b-2 border-[#2e3954]' 
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Todos
                  </button>
                </li>
                <li className="mr-2">
                  <button
                    onClick={() => setFilters({ status: 'publicado' })}
                    className={`inline-block py-2 px-4 text-sm font-medium ${
                      filters.status === 'publicado' 
                        ? 'text-[#2e3954] border-b-2 border-[#2e3954]' 
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Publicados
                  </button>
                </li>
                <li className="mr-2">
                  <button
                    onClick={() => setFilters({ status: 'borrador' })}
                    className={`inline-block py-2 px-4 text-sm font-medium ${
                      filters.status === 'borrador' 
                        ? 'text-[#2e3954] border-b-2 border-[#2e3954]' 
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Borradores
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setFilters({ status: 'archivado' })}
                    className={`inline-block py-2 px-4 text-sm font-medium ${
                      filters.status === 'archivado' 
                        ? 'text-[#2e3954] border-b-2 border-[#2e3954]' 
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Archivados
                  </button>
                </li>
              </ul>
            </div>
            
            {/* Filtros y búsqueda */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="md:w-1/3">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Buscar posts..." 
                    value={filters.search || ''}
                    onChange={(e) => setFilters({ search: e.target.value })}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent text-gray-800 bg-white"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="md:w-1/3">
                <select
                  value={filters.category || 'todas'}
                  onChange={(e) => setFilters({ category: e.target.value === 'todas' ? 'todas' : e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent text-gray-800 bg-white"
                >
                  <option value="todas">Todas las categorías</option>
                  {categories.map(categoria => (
                    <option key={categoria.id} value={categoria.nombre}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="md:w-1/3">
                <select
                  value={filters.sortBy || 'recientes'}
                  onChange={(e) => setFilters({ sortBy: e.target.value as 'recientes' | 'antiguos' | 'populares' | 'alfabetico' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2e3954] focus:border-transparent text-gray-800 bg-white"
                >
                  <option value="recientes">Más recientes primero</option>
                  <option value="antiguos">Más antiguos primero</option>
                  <option value="populares">Más vistos primero</option>
                  <option value="alfabetico">Alfabéticamente</option>
                </select>
              </div>
            </div>
            
            {/* Tabla de posts */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2e3954]"></div>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No se encontraron posts con los criterios de búsqueda.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Post
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Autor
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vistas
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPosts.map((post) => {
                      const estadoConfig = obtenerEstadoConfig(post.estado);
                      
                      return (
                        <tr key={post.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-start space-x-3">
                              {post.destacado && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                  <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  Destacado
                                </span>
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">{post.titulo}</div>
                                <div className="text-xs text-gray-500 mt-1 max-w-lg line-clamp-2">{post.extracto}</div>
                                <div className="mt-2">
                                  <CategoryBadge
                                    category={post.categoria}
                                    color={obtenerColorCategoria(post.categoriaId)}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{post.autor}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatearFecha(post.fecha)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${estadoConfig.color}`}>
                              {estadoConfig.texto}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {post.vistas !== undefined ? post.vistas.toLocaleString() : '0'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <WithPermission permissionId="edit-post" type="button">
                                <button
                                  onClick={() => abrirModalEditar(post)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                  title="Editar"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                  </svg>
                                </button>
                              </WithPermission>
                              <WithPermission permissionId="delete-post" type="button">
                                <button
                                  onClick={() => confirmarEliminar(post)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Eliminar"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </WithPermission>
                              <button
                                onClick={() => cambiarDestacado(post)}
                                className={post.destacado ? 'text-yellow-500 hover:text-yellow-700' : 'text-gray-400 hover:text-yellow-500'}
                                title={post.destacado ? 'Quitar destacado' : 'Destacar'}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </button>
                              <div className="relative group">
                                <button
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Cambiar estado"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg overflow-hidden z-20 hidden group-hover:block">
                                  <div className="py-1">
                                    <button
                                      onClick={() => cambiarEstado(post, 'publicado')}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      disabled={post.estado === 'publicado'}
                                    >
                                      Publicar
                                    </button>
                                    <button
                                      onClick={() => cambiarEstado(post, 'borrador')}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      disabled={post.estado === 'borrador'}
                                    >
                                      Mover a borradores
                                    </button>
                                    <button
                                      onClick={() => cambiarEstado(post, 'archivado')}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      disabled={post.estado === 'archivado'}
                                    >
                                      Archivar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {vistaActual === 'postulaciones' && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-[#2e3954] mb-4">Gestión de Postulaciones</h2>
            <p className="text-gray-600">
              Aquí se mostrará la lista de posts que son de tipo "Postulaciones" y las opciones para ver quiénes se han postulado a cada uno.
            </p>
            
            {/* Lista de Posts de tipo "Postulaciones" */}
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2e3954]"></div>
              </div>
            ) : (() => {
              // TODO: Considerar si el nombre de la categoría "Postulaciones" debe ser dinámico o una constante
              const nombreCategoriaPostulaciones = "Postulaciones"; 
              const postsDePostulaciones = filteredPosts.filter(
                post => post.categoria && post.categoria.toLowerCase() === nombreCategoriaPostulaciones.toLowerCase()
              );

              if (postsDePostulaciones.length === 0) {
                return (
                  <div className="text-center py-10 text-gray-500">
                    No hay posts activos en la categoría "{nombreCategoriaPostulaciones}".
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto mt-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Título del Post (Oferta)
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Autor
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha de Publicación
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {postsDePostulaciones.map((post) => (
                        <tr key={post.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{post.titulo}</div>
                            <div className="text-xs text-gray-500 mt-1">ID: {post.id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{post.autor}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatearFecha(post.fecha)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => abrirModalVerPostulantes(post)} 
                              className="text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-3 py-1 rounded-md transition-colors duration-150"
                            >
                              Ver Postulantes
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

      </div>
      
      {/* Modal para crear/editar post */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#2e3954]">
                  {modoEdicion ? 'Editar Post' : 'Crear Nuevo Post'}
                </h2>
                <button
                  onClick={cerrarModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <PostForm 
                post={postSeleccionado || undefined}
                onClose={cerrarModal}
                isEditMode={modoEdicion}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para confirmar eliminación */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">¿Eliminar post?</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar permanentemente el post "{postAEliminar?.titulo}"?
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setModalEliminar(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={eliminarPost}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Ver Postulantes */}
      {modalPostulantesAbierto && postSeleccionadoParaVerPostulantes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#2e3954]">
                  Postulantes para: {postSeleccionadoParaVerPostulantes.titulo}
                </h2>
                <button
                  onClick={cerrarModalVerPostulantes}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-grow">
              {loadingPostulantes ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2e3954]"></div>
                </div>
              ) : postulantesList.length === 0 ? (
                <p className="text-gray-500 text-center">No hay postulantes para esta oferta aún.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {postulantesList.map(postulante => (
                    <li key={postulante.usuarioId} className="py-4">
                      <div className="flex space-x-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900">{postulante.nombre}</h3>
                            <p className="text-sm text-gray-500">{new Date(postulante.fechaPostulacion).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                          </div>
                          <p className="text-sm text-gray-500">{postulante.correo}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 text-right">
                <button
                  onClick={cerrarModalVerPostulantes}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cerrar
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 