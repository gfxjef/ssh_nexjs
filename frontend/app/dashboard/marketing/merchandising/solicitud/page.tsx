'use client';

import { useState, useEffect } from 'react';
import Loader from '@/components/Loader'; // Importar el Loader

// Interfaz para un producto transformado
interface ProductoTransformado {
  id: string;       // Clave original del backend, ej: "merch_lapicero_esco_eje"
  nombre: string;   // Nombre legible, ej: "Lapicero Esco"
  tipo: 'normal' | 'ejecutivo';
  stock: number;
}

// Ya no se usa productosEjemplo
// const productosEjemplo = [
//   { id: 'merch_lapicero_esco', nombre: 'Lapicero Esco', tipo: 'normal', stock: 30 },
//   ...
// ];

export default function SolicitudMerchandising() {
  // Estados
  const [cantidadPacks, setCantidadPacks] = useState<number>(0);
  // Estado para el stock crudo de la API
  const [rawStockData, setRawStockData] = useState<{ [key: string]: number } | null>(null);
  // Estado para los productos transformados y listos para mostrar
  const [productosTransformados, setProductosTransformados] = useState<ProductoTransformado[]>([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState<string[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('');
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error', texto: string } | null>(null);
  const [datosUsuario, setDatosUsuario] = useState<{ nombre: string; grupo: string; username?: string }>({ nombre: '', grupo: '' });
  const [cargandoStock, setCargandoStock] = useState<boolean>(true);
  const [mostrandoLoader, setMostrandoLoader] = useState<boolean>(false); // Nuevo estado para el loader general

  // Función para formatear nombres de producto y determinar tipo
  const formatearProducto = (idBackend: string, stock: number): ProductoTransformado => {
    let nombre = idBackend.replace(/^merch_/, ''); // Quitar "merch_"
    let tipo: 'normal' | 'ejecutivo' = 'normal';

    if (nombre.endsWith('_eje')) {
      tipo = 'ejecutivo';
      nombre = nombre.replace(/_eje$/, ''); // Quitar "_eje"
    }

    nombre = nombre.replace(/_/g, ' '); // Reemplazar guiones bajos por espacios
    nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1); // Capitalizar primera letra
    // Capitalizar el resto de las palabras (opcional, mejora la legibilidad)
    nombre = nombre.replace(/\b\w/g, char => char.toUpperCase());

    return { id: idBackend, nombre, tipo, stock };
  };

  // Simular la carga de datos del usuario y luego cargar el stock
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    let userGrupo = 'kossodo'; // Grupo por defecto
    setMostrandoLoader(true); // Mostrar loader al iniciar carga de datos de usuario y stock

    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setDatosUsuario({
          nombre: userData.nombre || userData.usuario || 'Usuario Desconocido',
          grupo: userData.grupo || 'kossodo',
          username: userData.usuario
        });
        userGrupo = userData.grupo || 'kossodo';
        setGrupoSeleccionado(userGrupo);
      } catch (error) {
        console.error("Error al parsear datos del usuario del localStorage:", error);
        setDatosUsuario({ nombre: 'Usuario Desconocido', grupo: 'kossodo' });
        setGrupoSeleccionado('kossodo');
      }
    } else {
      setDatosUsuario({ nombre: 'Usuario Desconocido', grupo: 'kossodo' });
      setGrupoSeleccionado('kossodo');
    }

    // Cargar stock después de determinar el grupo del usuario
    const fetchStock = async (grupo: string) => {
      setCargandoStock(true);
      setMensaje(null); // Limpiar mensajes previos
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const response = await fetch(`${apiBaseUrl}/api/marketing/stock?grupo=${grupo}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({texto: `Error ${response.status} al cargar stock.`}));
          throw new Error(errorData.error || `Error ${response.status} al cargar stock.`);
        }
        const data = await response.json();
        setRawStockData(data);
      } catch (error: any) {
        console.error("Error al cargar stock:", error);
        setRawStockData(null); // En caso de error, limpiar stock
        setMensaje({ tipo: 'error', texto: error.message || 'No se pudo cargar el stock de productos.' });
      } finally {
        setCargandoStock(false);
        // No ocultar loader aquí directamente, se controlará con el mensaje o fin de operación
      }
    };

    if (userGrupo) {
      fetchStock(userGrupo);
    } else {
      setCargandoStock(false); // Si no hay grupo, no hay nada que cargar
      setMostrandoLoader(false); // Ocultar loader si no hay grupo
    }
  }, []); // Se ejecuta una vez al montar

  // useEffect para transformar rawStockData cuando cambie
  useEffect(() => {
    if (rawStockData) {
      const transformados = Object.entries(rawStockData)
        .filter(([, stock]) => stock > 0)
        .map(([id, stock]: [string, number]) => formatearProducto(id, stock));
      setProductosTransformados(transformados);
    } else {
      setProductosTransformados([]); // Si no hay datos crudos, la lista de transformados está vacía
    }
  }, [rawStockData]);

  // La función actualizarProductosDisponibles ya no es necesaria de la misma forma,
  // ya que el filtrado por cantidadPacks se hace directamente en el JSX.
  // Si se quisiera pre-filtrar `productosTransformados` por `cantidadPacks`
  // y guardarlo en otro estado, se podría hacer aquí en un useEffect que dependa de `cantidadPacks` y `rawStockData`
  // Pero por ahora, el JSX maneja el filtro visual.
  
  // useEffect(() => {
  //   // Esta lógica ahora está implícita en el renderizado del JSX
  //   // que itera sobre productosTransformados y filtra visualmente por cantidadPacks
  // }, [cantidadPacks, productosTransformados]);

  // Manejar cambio en los checkboxes
  const manejarCambioCheckbox = (productoId: string, isChecked: boolean) => {
    if (isChecked) {
      setProductosSeleccionados([...productosSeleccionados, productoId]);
    } else {
      setProductosSeleccionados(productosSeleccionados.filter(id => id !== productoId));
    }
  };

  // Manejar envío del formulario
  const enviarFormulario = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null); // Limpiar mensajes previos
    setMostrandoLoader(true); // Mostrar loader al iniciar envío de formulario

    // Obtener RUC y Fecha de Visita de los inputs
    const rucInput = document.getElementById('ruc') as HTMLInputElement;
    const fechaVisitaInput = document.getElementById('fechaVisita') as HTMLInputElement;
    const catalogosInput = document.getElementById('catalogos') as HTMLTextAreaElement;

    const ruc = rucInput ? rucInput.value : '';
    const fechaVisita = fechaVisitaInput ? fechaVisitaInput.value : '';
    const catalogos = catalogosInput ? catalogosInput.value : '';

    if (!datosUsuario.nombre || !grupoSeleccionado || !ruc || !fechaVisita || cantidadPacks <= 0 || productosSeleccionados.length === 0) {
      setMensaje({
        tipo: 'error',
        texto: 'Complete todos los campos obligatorios (RUC, Fecha de Visita, Cantidad de Packs) y seleccione al menos un producto.'
      });
      return;
    }

    const payload = {
      solicitante: datosUsuario.nombre, // Usar el nombre del usuario logueado
      grupo: grupoSeleccionado,
      ruc: ruc,
      fechaVisita: fechaVisita, // El input type=\"date\" devuelve YYYY-MM-DD
      cantidad_packs: cantidadPacks,
      productos: productosSeleccionados, // Array de IDs de productos, ej: ["merch_lapicero_esco", "merch_cuaderno_a4"]
      catalogos: catalogos
    };

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/marketing/solicitud`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Aquí podrías añadir el token de autenticación si tu endpoint lo requiere
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Error ${response.status} al enviar la solicitud.`);
      }

      setMensaje({
        tipo: 'success',
        texto: `¡Éxito! Solicitud enviada correctamente. ID: ${responseData.id_solicitud || responseData.id}`
      });
      
      // Resetear formulario
      setProductosSeleccionados([]);
      setCantidadPacks(0);
      if (rucInput) rucInput.value = '';
      if (fechaVisitaInput) fechaVisitaInput.value = '';
      if (catalogosInput) catalogosInput.value = '';

    } catch (error: any) {
      console.error("Error al enviar formulario:", error);
      setMensaje({
        tipo: 'error',
        texto: error.message || 'No se pudo enviar la solicitud.'
      });
      // setMostrandoLoader(false); // Ocultar en caso de error, manejado por useEffect de mensaje
    } finally {
      // setCargandoStock(false); // Ya no se usa cargandoStock para esto
      // El loader se oculta basado en el mensaje final
    }
  };

  // useEffect para controlar el loader basado en `cargandoStock` y `mensaje`
  useEffect(() => {
    if (cargandoStock) { // Loader para carga inicial de stock
      setMostrandoLoader(true);
    } else if (mensaje) { // Cuando hay un mensaje (éxito o error de envío)
      if (mensaje.tipo === 'success') {
        // Mantener el loader un poco más si es éxito, luego ocultar
        // O quitar esto si se quiere ocultar inmediatamente después del mensaje de éxito
        // setTimeout(() => setMostrandoLoader(false), 1500); 
        setMostrandoLoader(false); // Ocultar inmediatamente
      } else {
        setMostrandoLoader(false); // Ocultar en caso de error
      }
    } else if (!cargandoStock && !mensaje) {
        // Si no está cargando stock y no hay mensajes (estado inicial después de carga de stock)
        setMostrandoLoader(false);
    }
  }, [cargandoStock, mensaje]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Contenedor principal de la sección con posicionamiento relativo */}
      <div className="relative">
        {mostrandoLoader && <Loader mensaje={cargandoStock ? "Cargando datos iniciales..." : "Procesando solicitud..."} />}
        {/* Contenido principal al que se le aplicará opacidad si el loader está activo */}
        <div className={`bg-white p-6 rounded-lg shadow-md ${mostrandoLoader ? 'opacity-50' : ''}`}> 
          <h1 className="text-2xl font-bold text-[#2e3954] mb-6 text-center">Solicitud de Merchandising</h1>
        
          <div className="max-w-3xl mx-auto">
            <form onSubmit={enviarFormulario} className="space-y-6">
              {/* Fila: Solicitante y Grupo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="solicitante" className="block text-sm font-medium text-gray-700">
                    Solicitante (automático)
                  </label>
                  <input
                    type="text"
                    id="solicitante"
                    value={datosUsuario.nombre}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="grupo" className="block text-sm font-medium text-gray-700">
                    Grupo (automático)
                  </label>
                  <select
                    id="grupo"
                    value={grupoSeleccionado}
                    onChange={(e) => setGrupoSeleccionado(e.target.value)}
                    disabled
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  >
                    <option value="" disabled>Seleccione un grupo</option>
                    <option value="kossodo">Kossodo</option>
                    <option value="kossomet">Kossomet</option>
                  </select>
                </div>
              </div>
              
              {/* Fila: RUC y Fecha de visita */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="ruc" className="block text-sm font-medium text-gray-700">
                    RUC del cliente
                  </label>
                  <input
                    type="text"
                    id="ruc"
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="fechaVisita" className="block text-sm font-medium text-gray-700">
                    Fecha de visita
                  </label>
                  <input
                    type="date"
                    id="fechaVisita"
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                    required
                  />
                </div>
              </div>
              
              {/* Cantidad de packs */}
              <div className="space-y-2">
                <label htmlFor="cantidadPacks" className="block text-sm font-medium text-gray-700">
                  Cantidad de packs
                </label>
                <input
                  type="number"
                  id="cantidadPacks"
                  min="1"
                  value={cantidadPacks || ''}
                  onChange={(e) => setCantidadPacks(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                  required
                />
              </div>
              
              {/* Productos disponibles */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Productos disponibles:
                </label>
                
                {cargandoStock && <p className="text-gray-500 italic py-2 text-center">Cargando stock...</p>} {/* Este mensaje se podría quitar si el loader siempre aparece */}
                {!cargandoStock && !rawStockData && mensaje && mensaje.tipo === 'error' && (
                   <p className="text-red-600 font-medium py-2 text-center">{mensaje.texto}</p>
                )}

                {/* Sección de productos normales */}
                {!cargandoStock && rawStockData && (
                  <div className="border border-gray-200 rounded-md p-4">
                    <h4 className="text-base font-semibold text-[#2e3954] pb-2 mb-3 border-b border-gray-200">
                      Cliente Normal
                    </h4>
                    
                    {productosTransformados.filter(p => p.tipo === 'normal' && (cantidadPacks > 0 ? p.stock >= cantidadPacks : p.stock > 0)).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {productosTransformados
                          .filter((producto: ProductoTransformado) => producto.tipo === 'normal' && (cantidadPacks > 0 ? producto.stock >= cantidadPacks : producto.stock > 0))
                          .map((producto: ProductoTransformado) => (
                            <div 
                              key={producto.id}
                              className={`flex items-center p-2 rounded-md hover:bg-gray-50 transition-colors ${cantidadPacks > 0 && producto.stock < cantidadPacks ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <input
                                type="checkbox"
                                id={producto.id}
                                checked={productosSeleccionados.includes(producto.id)}
                                onChange={(e) => manejarCambioCheckbox(producto.id, e.target.checked)}
                                disabled={cantidadPacks > 0 && producto.stock < cantidadPacks}
                                className="mr-2 h-4 w-4 text-[#d48b45] focus:ring-[#d48b45]"
                              />
                              <label htmlFor={producto.id} className="text-sm text-gray-700">
                                {producto.nombre}
                              </label>
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      <p className="text-gray-500 italic py-2">
                        {cantidadPacks > 0 
                          ? 'No hay productos normales disponibles para esta cantidad.'
                          : (productosTransformados.filter(p => p.tipo === 'normal').length === 0 
                              ? 'No hay productos normales disponibles con stock.' 
                              : 'Ingrese la cantidad de packs.')}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Sección de productos ejecutivos */}
                {!cargandoStock && rawStockData && (
                  <div className="border border-gray-200 rounded-md p-4">
                    <h4 className="text-base font-semibold text-[#2e3954] pb-2 mb-3 border-b border-gray-200">
                      Cliente Ejecutivo
                    </h4>
                    
                    {productosTransformados.filter(p => p.tipo === 'ejecutivo' && (cantidadPacks > 0 ? p.stock >= cantidadPacks : p.stock > 0)).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {productosTransformados
                          .filter((producto: ProductoTransformado) => producto.tipo === 'ejecutivo' && (cantidadPacks > 0 ? producto.stock >= cantidadPacks : producto.stock > 0))
                          .map((producto: ProductoTransformado) => (
                            <div 
                              key={producto.id}
                              className={`flex items-center p-2 rounded-md hover:bg-gray-50 transition-colors ${cantidadPacks > 0 && producto.stock < cantidadPacks ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <input
                                type="checkbox"
                                id={producto.id}
                                checked={productosSeleccionados.includes(producto.id)}
                                onChange={(e) => manejarCambioCheckbox(producto.id, e.target.checked)}
                                disabled={cantidadPacks > 0 && producto.stock < cantidadPacks}
                                className="mr-2 h-4 w-4 text-[#d48b45] focus:ring-[#d48b45]"
                              />
                              <label htmlFor={producto.id} className="text-sm text-gray-700">
                                {producto.nombre}
                              </label>
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      <p className="text-gray-500 italic py-2">
                        {cantidadPacks > 0 
                          ? 'No hay productos ejecutivos disponibles para esta cantidad.'
                          : (productosTransformados.filter(p => p.tipo === 'ejecutivo').length === 0 
                              ? 'No hay productos ejecutivos disponibles con stock.'
                              : 'Ingrese la cantidad de packs.')}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Mensaje cuando no hay productos disponibles para la cantidad ingresada después de la carga */}
                {!cargandoStock && rawStockData && cantidadPacks > 0 && 
                  productosTransformados.filter(p => p.stock >= cantidadPacks).length === 0 && (
                  <div className="text-red-600 font-medium text-center italic py-2">
                    {productosTransformados.length > 0 
                      ? "No hay productos disponibles para la cantidad de packs ingresada."
                      : "No hay productos con stock disponibles."}
                  </div>
                )}
              </div>
              
              {/* Catálogos */}
              <div className="space-y-2">
                <label htmlFor="catalogos" className="block text-sm font-medium text-gray-700">
                  Catálogos (opcional)
                </label>
                <textarea
                  id="catalogos"
                  rows={2}
                  placeholder="Por Ejemplo: Binder, Esco, Atago"
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                ></textarea>
              </div>
              
              {/* Botón Enviar */}
              <div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#2e3954] text-white font-semibold rounded-md hover:bg-[#8dbba3] transition-colors duration-300"
                >
                  Enviar Solicitud
                </button>
              </div>
            </form>
            
            {/* Mensajes de error o éxito */}
            {mensaje && (
              <div className={`mt-4 p-3 rounded-md ${
                mensaje.tipo === 'success' 
                  ? 'bg-green-50 border-l-4 border-green-500 text-green-700' 
                  : 'bg-red-50 border-l-4 border-red-500 text-red-700'
              }`}>
                {mensaje.texto}
              </div>
            )}
          </div> {/* Cierre de max-w-3xl mx-auto */}
        </div> {/* Cierre de bg-white p-6 rounded-lg shadow-md */}
      </div> {/* Cierre del div con position: relative */}
    </div>
  );
} 