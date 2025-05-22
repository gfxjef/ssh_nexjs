'use client';

import { useState, useEffect } from 'react';
import Loader from '@/components/Loader';

// Mapeo de nombres de productos
const PRODUCTOS_MAPPING = {
  'merch_lapiceros_normales': 'merch_lapiceros_normales',
  'merch_lapicero_ejecutivos': 'merch_lapicero_ejecutivos',
  'merch_blocks': 'merch_blocks',
  'merch_tacos': 'merch_tacos',
  'merch_gel_botella': 'merch_gel_botella',
  'merch_bolas_antiestres': 'merch_bolas_antiestres',
  'merch_padmouse': 'merch_padmouse',
  'merch_bolsa': 'merch_bolsa',
  'merch_lapiceros_esco': 'merch_lapiceros_esco'
};

export default function ConfirmacionesSolicitudes() {
  // Estados
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [modalConfirmacionVisible, setModalConfirmacionVisible] = useState(false);
  const [modalAgregarProductoVisible, setModalAgregarProductoVisible] = useState(false);
  const [modalCancelarVisible, setModalCancelarVisible] = useState(false);
  const [solicitudActual, setSolicitudActual] = useState<any>(null);
  const [solicitudACancelar, setSolicitudACancelar] = useState<any>(null);
  const [productosConfirmacion, setProductosConfirmacion] = useState<{[key: string]: number}>({});
  const [productosDisponibles, setProductosDisponibles] = useState<{[key: string]: {nombre: string, cantidad: number}}>({});
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('');
  const [cantidadProducto, setCantidadProducto] = useState<number>(1);
  const [confirmador, setConfirmador] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [mensaje, setMensaje] = useState<{tipo: 'success' | 'error', texto: string} | null>(null);
  const [cargando, setCargando] = useState<boolean>(false);
  const [datosUsuario, setDatosUsuario] = useState<{ nombre: string; grupo: string; username?: string }>({ nombre: '', grupo: '' });
  
  // Cargar datos al montar el componente
  useEffect(() => {
    // Simular datos del usuario autenticado (obtener de localStorage)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setDatosUsuario({
          nombre: userData.nombre || userData.usuario || 'Usuario Desconocido',
          grupo: userData.grupo || 'kossodo', // El grupo del confirmador no es tan relevante aquí
          username: userData.usuario
        });
        setConfirmador(userData.nombre || userData.usuario || 'Usuario Desconocido');
      } catch (error) {
        console.error("Error al parsear datos del usuario del localStorage:", error);
        setConfirmador('Usuario Desconocido');
      }
    } else {
      setConfirmador('Usuario Desconocido');
    }
    cargarSolicitudesPendientes();
  }, []);
  
  // Función para cargar solicitudes pendientes
  const cargarSolicitudesPendientes = async () => {
    setCargando(true);
    setMensaje(null);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      // Por defecto, pedimos las pendientes. Ajusta si necesitas otro status inicial.
      const response = await fetch(`${apiBaseUrl}/api/marketing/solicitudes?status=pending`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({message: `Error ${response.status}`}));
        throw new Error(errorData.error || errorData.message || `Error ${response.status} al cargar solicitudes.`);
      }
      const data = await response.json();
      setSolicitudes(data || []); // Asegurar que sea un array
    } catch (error: any) {
      console.error("Error al cargar solicitudes pendientes:", error);
      setSolicitudes([]);
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudo cargar la lista de solicitudes.' });
    } finally {
      setCargando(false);
    }
  };
  
  // Función para formatear nombres de producto (similar a la otra página)
  const formatearNombreProducto = (idBackend: string): string => {
    let nombre = idBackend.replace(/^merch_/, '');
    if (nombre.endsWith('_eje')) {
      nombre = nombre.replace(/_eje$/, '');
    }
    nombre = nombre.replace(/_/g, ' ');
    nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    nombre = nombre.replace(/\b\w/g, char => char.toUpperCase());
    return nombre;
  };

  // Función para cargar datos de stock para un grupo específico
  const cargarStockGrupo = async (grupo: string) => {
    // No establecer cargando(true) aquí para no afectar el loader principal de la página,
    // El modal podría tener su propio indicador de carga si es una operación larga.
    // O, si se prefiere un loader general, entonces sí setCargando(true)
    // setCargando(true); 
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/marketing/stock?grupo=${grupo}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({message: `Error ${response.status}`}));
        throw new Error(errorData.error || errorData.message || `Error ${response.status} al cargar stock del grupo.`);
      }
      const data = await response.json();
      // Transformar el stock para que coincida con la estructura esperada por el modal
      const stockTransformado: {[key: string]: {nombre: string, cantidad: number}} = {};
      for (const [id, cantidad] of Object.entries(data)) {
        stockTransformado[id] = { nombre: formatearNombreProducto(id), cantidad: cantidad as number };
      }
      setProductosDisponibles(stockTransformado);
    } catch (error: any) {
      console.error("Error al cargar stock del grupo:", error);
      setProductosDisponibles({}); // Limpiar en caso de error
      // Podrías mostrar un mensaje específico en el modal si falla la carga de stock
      setMensaje({ tipo: 'error', texto: `No se pudo cargar el stock para el grupo ${grupo}. ${error.message}` });
    }
    // finally { setCargando(false); }
  };
  
  // Función para abrir el modal de confirmación
  const abrirModalConfirmacion = (solicitudId: number) => {
    const solicitud = solicitudes.find(s => s.id === solicitudId);
    if (solicitud) {
      setSolicitudActual(solicitud);
      
      // Inicializar productos de la solicitud con la cantidad solicitada
      const productosInicial: {[key: string]: number} = {};
      solicitud.productos.forEach((prod: string) => {
        productosInicial[prod] = solicitud.cantidad_packs;
      });
      setProductosConfirmacion(productosInicial);
      
      // Cargar stock disponible para este grupo
      cargarStockGrupo(solicitud.grupo);
      
      // Resetear campos del formulario
      setObservaciones('');
      
      // Mostrar modal
      setModalConfirmacionVisible(true);
    }
  };
  
  // Función para eliminar un producto de la lista de confirmación
  const eliminarProducto = (producto: string) => {
    const nuevosProductos = { ...productosConfirmacion };
    delete nuevosProductos[producto];
    setProductosConfirmacion(nuevosProductos);
  };
  
  // Función para actualizar la cantidad de un producto
  const actualizarCantidadProducto = (producto: string, cantidad: number) => {
    setProductosConfirmacion({
      ...productosConfirmacion,
      [producto]: cantidad
    });
  };
  
  // Función para abrir el modal de agregar producto
  const abrirModalAgregarProducto = () => {
    setProductoSeleccionado('');
    setCantidadProducto(1);
    setModalAgregarProductoVisible(true);
  };
  
  // Función para agregar un producto a la lista de confirmación
  const agregarProducto = () => {
    if (!productoSeleccionado || !productosDisponibles[productoSeleccionado]) {
      setMensaje({
        tipo: 'error',
        texto: 'Por favor seleccione un producto válido'
      });
      return;
    }
    
    // Actualizar la lista de productos
    setProductosConfirmacion({
      ...productosConfirmacion,
      [productoSeleccionado]: (productosConfirmacion[productoSeleccionado] || 0) + cantidadProducto
    });
    
    // Cerrar el modal
    setModalAgregarProductoVisible(false);
  };
  
  // Función para confirmar la solicitud
  const confirmarSolicitud = async () => {
    if (!confirmador.trim()) {
      setMensaje({
        tipo: 'error',
        texto: 'Por favor ingrese el nombre del confirmador'
      });
      return;
    }
    
    if (Object.keys(productosConfirmacion).length === 0) {
      setMensaje({
        tipo: 'error',
        texto: 'Debe incluir al menos un producto en la confirmación'
      });
      return;
    }
    
    setCargando(true);
    setMensaje(null);

    const payload = {
      confirmador: confirmador,
      observaciones: observaciones,
      productos: productosConfirmacion // Este es el diccionario { [productoId]: cantidad }
    };

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/marketing/solicitudes/${solicitudActual.id}/confirm`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || `Error ${response.status} al confirmar.`);
      }

      setMensaje({
        tipo: 'success',
        texto: responseData.message || `¡Éxito! Solicitud #${solicitudActual.id} confirmada correctamente.`
      });
      
      // Recargar solicitudes pendientes o filtrar la actual de la lista
      cargarSolicitudesPendientes(); // La forma más simple de actualizar
      setModalConfirmacionVisible(false);

    } catch (error: any) {
      console.error("Error al confirmar solicitud:", error);
      setMensaje({
        tipo: 'error',
        texto: error.message || 'No se pudo confirmar la solicitud.'
      });
    } finally {
      setCargando(false);
    }
  };

  // Nueva función para abrir el modal de cancelar solicitud
  const abrirModalCancelar = (solicitud: any) => {
    setSolicitudACancelar(solicitud);
    setModalCancelarVisible(true);
    setMensaje(null); // Limpiar mensajes previos
  };

  // Nueva función para ejecutar la cancelación de la solicitud
  const ejecutarCancelacionSolicitud = async () => {
    if (!solicitudACancelar) return;

    setCargando(true);
    setMensaje(null);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/marketing/solicitudes/${solicitudACancelar.id}`, {
        method: 'DELETE',
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || `Error ${response.status} al cancelar la solicitud.`);
      }
      setMensaje({ tipo: 'success', texto: `Solicitud #${solicitudACancelar.id} cancelada correctamente.` });
      cargarSolicitudesPendientes(); // Recargar la lista de solicitudes
      setModalCancelarVisible(false);
      setSolicitudACancelar(null);
    } catch (error: any) {
      console.error("Error al cancelar solicitud:", error);
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudo cancelar la solicitud.' });
      // Mantener el modal abierto en caso de error para que el usuario vea el mensaje
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Contenedor principal de la sección con posicionamiento relativo */}
      <div className="relative">
        {cargando && <Loader mensaje={modalConfirmacionVisible || modalAgregarProductoVisible || modalCancelarVisible ? "Procesando..." : "Cargando solicitudes..."} />}
        
        {/* Contenido principal al que se le aplicará opacidad si el loader está activo */}
        <div className={`bg-white p-6 rounded-lg shadow-md ${cargando ? 'opacity-50' : ''}`}> 
          <h1 className="text-2xl font-bold text-[#2e3954] mb-6 text-center">Confirmaciones de Solicitudes</h1>
          
          {/* Tabla de solicitudes */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Solicitante</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Grupo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Fecha Visita</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Cantidad Packs</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {solicitudes.length > 0 ? (
                  solicitudes.map(solicitud => (
                    <tr key={solicitud.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border border-gray-200 text-gray-800">{solicitud.id}</td>
                      <td className="px-4 py-2 border border-gray-200 text-gray-800">{solicitud.solicitante}</td>
                      <td className="px-4 py-2 border border-gray-200 text-gray-800">{solicitud.grupo}</td>
                      <td className="px-4 py-2 border border-gray-200 text-gray-800">{solicitud.fecha_visita}</td>
                      <td className="px-4 py-2 border border-gray-200 text-gray-800">{solicitud.cantidad_packs}</td>
                      <td className="px-4 py-2 border border-gray-200">
                        <span className={`px-2 py-1 text-xs rounded-full ${solicitud.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : solicitud.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {solicitud.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 border border-gray-200">
                        {solicitud.status === 'pending' && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => abrirModalConfirmacion(solicitud.id)}
                              className="px-3 py-1 bg-[#2e3954] text-white text-sm rounded hover:bg-[#8dbba3] transition-colors duration-200"
                            >
                              Confirmar
                            </button>
                            <button 
                              onClick={() => abrirModalCancelar(solicitud)} 
                              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-700 transition-colors duration-200"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-gray-500 italic">
                      {!cargando ? "No hay solicitudes pendientes." : "Cargando..."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Mensajes de error o éxito Globales (fuera de modales) */}
          {mensaje && !modalConfirmacionVisible && !modalAgregarProductoVisible && !modalCancelarVisible && (
            <div className={`mb-6 p-3 rounded-md ${
              mensaje.tipo === 'success' 
                ? 'bg-green-50 border-l-4 border-green-500 text-green-700' 
                : 'bg-red-50 border-l-4 border-red-500 text-red-700'
            }`}>
              {mensaje.texto}
            </div>
          )}
          
          {/* Modal de Confirmación */}
          {modalConfirmacionVisible && solicitudActual && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-3xl max-h-[90vh] overflow-auto">
                {/* Cabecera del modal */}
                <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center rounded-t-lg">
                  <h3 className="text-lg font-medium text-gray-900">
                    Confirmar Solicitud #{solicitudActual.id}
                  </h3>
                  <button 
                    onClick={() => { setModalConfirmacionVisible(false); setMensaje(null); }}
                    className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-bold"
                  >
                    &times;
                  </button>
                </div>
                
                {/* Cuerpo del modal */}
                <div className="p-6 space-y-6">
                  {/* Mensaje de error/éxito específico del modal de confirmación */}
                  {mensaje && (modalConfirmacionVisible || modalAgregarProductoVisible) && (
                     <div className={`mb-4 p-3 rounded-md ${
                        mensaje.tipo === 'success' 
                        ? 'bg-green-50 border-l-4 border-green-500 text-green-700' 
                        : 'bg-red-50 border-l-4 border-red-500 text-red-700'
                      }`}>
                       {mensaje.texto}
                     </div>
                  )}
                  
                  {/* Datos de la confirmación */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Confirmador (automático)
                      </label>
                      <input
                        type="text"
                        value={confirmador}                        
                        readOnly
                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Catálogos Solicitados
                      </label>
                      <textarea
                        readOnly
                        value={solicitudActual.catalogos || 'Ninguno'}
                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                        rows={1}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Observaciones (Opcional)
                      </label>
                      <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-2 focus:ring-[#d48b45] focus:outline-none"
                        rows={2}
                        placeholder="Ej: Ajustar cantidades, aprobada con modificaciones..."
                      />
                    </div>
                  </div>
                  
                  <hr className="border-gray-200" />
                  
                  {/* Sección Productos */}
                  <div>
                    <h3 className="text-base font-medium text-gray-900 mb-4">Productos a Confirmar:</h3>
                    
                    <div className="space-y-3">
                      {Object.keys(productosConfirmacion).length > 0 ? (
                        Object.entries(productosConfirmacion).map(([productoId, cantidad]) => {
                          const nombreProd = formatearNombreProducto(productoId);
                          const stockDisponibleProducto = productosDisponibles[productoId]?.cantidad ?? 0;
                          return (
                            <div 
                              key={productoId} 
                              className="flex items-center gap-3 bg-gray-50 p-3 rounded-md"
                            >
                              <label className="flex-1 text-sm font-medium text-gray-700">
                                {nombreProd} (Disp: {stockDisponibleProducto})
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={stockDisponibleProducto} // No permitir confirmar más del stock disponible
                                value={cantidad}
                                onChange={(e) => {
                                  const nuevaCantidad = parseInt(e.target.value) || 0;
                                  actualizarCantidadProducto(productoId, Math.min(nuevaCantidad, stockDisponibleProducto));
                                }}
                                className="w-20 p-2 border border-gray-300 rounded-md text-gray-700 focus:ring-2 focus:ring-[#d48b45] focus:outline-none"
                              />
                              <button
                                onClick={() => eliminarProducto(productoId)}
                                className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors text-xs"
                              >
                                Quitar
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-gray-500 italic">No hay productos seleccionados para confirmar.</p>
                      )}
                    </div>
                  </div>
                </div> {/* Fin cuerpo del modal de confirmación */}
                
                {/* Pie del modal de confirmación */}
                <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center rounded-b-lg">
                  <button
                    onClick={abrirModalAgregarProducto}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                    disabled={Object.keys(productosDisponibles).length === 0} // Deshabilitar si no hay stock cargado
                  >
                    Agregar/Modificar Producto
                  </button>
                  <div className="space-x-2">
                    <button
                      onClick={() => { setModalConfirmacionVisible(false); setMensaje(null); }}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors text-sm"
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={confirmarSolicitud}
                      className="px-4 py-2 bg-[#2e3954] text-white rounded hover:bg-[#8dbba3] transition-colors text-sm"
                      disabled={Object.keys(productosConfirmacion).length === 0} // Deshabilitar si no hay productos
                    >
                      Confirmar Solicitud
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Modal para agregar productos */}
          {modalAgregarProductoVisible && solicitudActual && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-md overflow-auto">
                {/* Cabecera del modal */}
                <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center rounded-t-lg">
                  <h3 className="text-lg font-medium text-gray-900">
                    Agregar Producto a Solicitud #{solicitudActual.id}
                  </h3>
                  <button 
                    onClick={() => { setModalAgregarProductoVisible(false); setMensaje(null);}}
                    className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-bold"
                  >
                    &times;
                  </button>
                </div>
                
                {/* Cuerpo del modal */}
                <div className="p-6 space-y-6">
                  {/* Mensaje de error/éxito específico del modal de agregar producto */}
                  {mensaje && modalAgregarProductoVisible && (
                     <div className={`mb-4 p-3 rounded-md ${
                        mensaje.tipo === 'success' 
                        ? 'bg-green-50 border-l-4 border-green-500 text-green-700' 
                        : 'bg-red-50 border-l-4 border-red-500 text-red-700'
                      }`}>
                       {mensaje.texto}
                     </div>
                  )}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Producto (Stock: {productosDisponibles[productoSeleccionado]?.cantidad ?? 'N/A'})
                      </label>
                      <select
                        value={productoSeleccionado}
                        onChange={(e) => setProductoSeleccionado(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-2 focus:ring-[#d48b45] focus:outline-none"
                      >
                        <option value="">Seleccione un producto</option>
                        {Object.entries(productosDisponibles)
                           .filter(([key, { cantidad }]) => cantidad > 0) // Solo mostrar productos con stock > 0
                           .map(([key, { nombre, cantidad }]) => (
                          <option key={key} value={key}>
                            {nombre} (Stock: {cantidad})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Cantidad a Agregar/Ajustar
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={productosDisponibles[productoSeleccionado]?.cantidad ?? 1} // No permitir agregar más del stock disponible
                        value={cantidadProducto}
                        onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            const maxStock = productosDisponibles[productoSeleccionado]?.cantidad ?? 1;
                            setCantidadProducto(Math.min(val, maxStock));
                        }}
                        disabled={!productoSeleccionado} // Deshabilitar si no hay producto seleccionado
                        className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-2 focus:ring-[#d48b45] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Pie del modal */}
                <div className="bg-gray-50 px-6 py-4 border-t flex justify-end items-center space-x-2 rounded-b-lg">
                  <button
                    onClick={() => { setModalAgregarProductoVisible(false); setMensaje(null); }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={agregarProducto}
                    className="px-4 py-2 bg-[#2e3954] text-white rounded hover:bg-[#8dbba3] transition-colors text-sm"
                    disabled={!productoSeleccionado || cantidadProducto <= 0}
                  >
                    Agregar/Actualizar Producto
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Nuevo Modal de Confirmación para Cancelar Solicitud */}
          {modalCancelarVisible && solicitudACancelar && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-md">
                <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center rounded-t-lg">
                  <h3 className="text-lg font-medium text-gray-900">Cancelar Solicitud #{solicitudACancelar.id}</h3>
                  <button onClick={() => { setModalCancelarVisible(false); setMensaje(null); }} className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-bold">
                    &times;
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {mensaje && modalCancelarVisible && (
                     <div className={`mb-4 p-3 rounded-md ${ mensaje.tipo === 'success' ? 'bg-green-50 border-l-4 border-green-500 text-green-700' : 'bg-red-50 border-l-4 border-red-500 text-red-700' }`}>
                       {mensaje.texto}
                     </div>
                  )}
                  <p className="text-gray-700">¿Está seguro de que desea cancelar la solicitud de <strong>{solicitudACancelar.solicitante}</strong> (ID: {solicitudACancelar.id})?</p>
                  <p className="text-sm text-gray-500">Esta acción cambiará el estado de la solicitud a 'cancelled' y no se podrá revertir fácilmente.</p>
                </div>
                <div className="bg-gray-50 px-6 py-4 border-t flex justify-end items-center space-x-2 rounded-b-lg">
                  <button onClick={() => { setModalCancelarVisible(false); setMensaje(null); }} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors text-sm">
                    Cerrar
                  </button>
                  <button
                    onClick={ejecutarCancelacionSolicitud}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                    disabled={cargando} // Deshabilitar si ya se está procesando
                  >
                    Sí, Cancelar Solicitud
                  </button>
                </div>
              </div>
            </div>
          )}
        </div> {/* Cierre del div con clase bg-white... (contenido principal) */}
      </div> {/* Cierre del div con clase relative (contenedor para el loader) */}
    </div> // Cierre del div con clase container...
  );
} 