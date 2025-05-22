'use client';

import { useState, useEffect } from 'react';
import Loader from '@/components/Loader'; // Asumiendo que tienes un componente Loader

// Interfaz para un producto en el carrito o disponible
interface Producto { 
  id: string; // Será el nombre de la columna, ej: merch_lapicero_esco
  nombre: string; // Nombre legible, ej: Lapicero Esco
}

// Interfaz para el stock
interface StockSede {
  [key: string]: number; // ej: { merch_lapicero_esco: 25, ... }
}

export default function SistemaInventario() {
  // Estados generales
  const [pestañaActiva, setPestañaActiva] = useState<'inventario' | 'producto'>('inventario');
  const [mensajeGlobal, setMensajeGlobal] = useState<{ tipo: 'success' | 'error', texto: string } | null>(null);
  const [cargando, setCargando] = useState<boolean>(false);
  const [datosUsuario, setDatosUsuario] = useState<{ nombre: string; grupo?: string }>({ nombre: 'Usuario Desconocido' });

  // Estados para "Agregar Inventario"
  const [sedeSeleccionadaInventario, setSedeSeleccionadaInventario] = useState<string>('');
  const [responsableInventario, setResponsableInventario] = useState<string>('');
  const [productosDisponibles, setProductosDisponibles] = useState<Producto[]>([]);
  const [productoSeleccionadoCarrito, setProductoSeleccionadoCarrito] = useState<string>(''); // ID del producto
  const [cantidadProductoCarrito, setCantidadProductoCarrito] = useState<number>(1);
  const [carrito, setCarrito] = useState<{ productoId: string; nombreProducto: string; cantidad: number }[]>([]);
  const [observacionesInventario, setObservacionesInventario] = useState<string>('');

  // Estados para "Stock de Productos" (se usa stockActualSede)
  const [stockActualSede, setStockActualSede] = useState<StockSede | null>(null);

  // Estados para "Agregar Nuevo Producto"
  const [sedeSeleccionadaNuevoProd, setSedeSeleccionadaNuevoProd] = useState<string>('');
  const [nombreNuevoProducto, setNombreNuevoProducto] = useState<string>('');
  const [tipoNuevoProducto, setTipoNuevoProducto] = useState<string>(''); // 'normal' o 'ejecutivo'
  const [cantidadInicialNuevoProd, setCantidadInicialNuevoProd] = useState<number>(0);
  const [previewColumna, setPreviewColumna] = useState('merch_...');

  // Cargar datos del usuario al montar
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        const nombreUsuario = userData.nombre || userData.usuario || 'Usuario Desconocido';
        setDatosUsuario({ nombre: nombreUsuario, grupo: userData.grupo });
        setResponsableInventario(nombreUsuario); // Pre-rellenar responsable
      } catch (error) {
        console.error("Error al parsear datos del usuario:", error);
        setResponsableInventario('Usuario Desconocido');
      }
    }
  }, []);

  // Función para formatear ID de backend a nombre legible
  const formatearNombreProducto = (idBackend: string): string => {
    if (!idBackend) return 'ID Desconocido';
    let nombre = idBackend.replace(/^merch_/, '');
    if (nombre.endsWith('_eje')) {
      nombre = nombre.replace(/_eje$/, '');
    }
    nombre = nombre.replace(/_/g, ' ');
    return nombre.charAt(0).toUpperCase() + nombre.slice(1).replace(/\b\w/g, char => char.toUpperCase());
  };

  // Efecto para cargar productos y stock cuando cambia la sede en "Agregar Inventario"
  useEffect(() => {
    if (sedeSeleccionadaInventario) {
      const fetchDatosSede = async () => {
        setCargando(true);
        setMensajeGlobal(null);
        setStockActualSede(null); // Limpiar stock previo
        setProductosDisponibles([]); // Limpiar productos disponibles previos
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
          const response = await fetch(`${apiBaseUrl}/api/marketing/stock?grupo=${sedeSeleccionadaInventario}`);
          if (!response.ok) {
            const errData = await response.json().catch(() => ({ error: `Error ${response.status}` }));
            throw new Error(errData.error || `Error al cargar datos de la sede ${sedeSeleccionadaInventario}.`);
          }
          const data: StockSede = await response.json();
          setStockActualSede(data);

          const productos = Object.keys(data).map(idColumna => ({
            id: idColumna,
            nombre: formatearNombreProducto(idColumna)
          }));
          setProductosDisponibles(productos);

        } catch (error: any) {
          console.error("Error fetching stock/products:", error);
          setMensajeGlobal({ tipo: 'error', texto: error.message });
        } finally {
          setCargando(false);
        }
      };
      fetchDatosSede();
    } else {
        setStockActualSede(null);
        setProductosDisponibles([]);
    }
  }, [sedeSeleccionadaInventario]);

  // Manejar agregar producto al carrito
  const handleAgregarAlCarrito = () => {
    if (!productoSeleccionadoCarrito || cantidadProductoCarrito <= 0) {
      setMensajeGlobal({ tipo: 'error', texto: 'Seleccione un producto y cantidad válida.' });
      return;
    }
    const productoExistente = carrito.find(item => item.productoId === productoSeleccionadoCarrito);
    if (productoExistente) {
      // Actualizar cantidad si ya existe
      setCarrito(carrito.map(item => 
        item.productoId === productoSeleccionadoCarrito 
          ? { ...item, cantidad: item.cantidad + cantidadProductoCarrito } 
          : item
      ));
    } else {
      // Agregar nuevo producto al carrito
      const productoInfo = productosDisponibles.find(p => p.id === productoSeleccionadoCarrito);
      setCarrito([...carrito, {
        productoId: productoSeleccionadoCarrito,
        nombreProducto: productoInfo ? productoInfo.nombre : formatearNombreProducto(productoSeleccionadoCarrito),
        cantidad: cantidadProductoCarrito
      }]);
    }
    setProductoSeleccionadoCarrito('');
    setCantidadProductoCarrito(1);
  };

  const eliminarDelCarrito = (productoId: string) => {
    setCarrito(carrito.filter(item => item.productoId !== productoId));
  };

  // Manejar envío de inventario
  const handleEnviarInventario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sedeSeleccionadaInventario || !responsableInventario || carrito.length === 0) {
      setMensajeGlobal({ tipo: 'error', texto: 'Sede, responsable y al menos un producto en el carrito son requeridos.' });
      return;
    }
    setCargando(true);
    setMensajeGlobal(null);

    const payload: any = { responsable: responsableInventario };
    if (observacionesInventario) payload.observaciones = observacionesInventario;
    carrito.forEach(item => {
      payload[item.productoId] = item.cantidad;
    });

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/marketing/inventory?tabla=${sedeSeleccionadaInventario}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || `Error ${response.status} al enviar inventario.`);
      }
      setMensajeGlobal({ tipo: 'success', texto: `Inventario enviado exitosamente. ID: ${responseData.id}` });
      setCarrito([]);
      setObservacionesInventario('');
      // Opcional: Recargar stock si la vista de stock está en la misma pestaña
      if (sedeSeleccionadaInventario) fetchStockSede(sedeSeleccionadaInventario); 
    } catch (error: any) {
      console.error("Error enviando inventario:", error);
      setMensajeGlobal({ tipo: 'error', texto: error.message });
    } finally {
      setCargando(false);
    }
  };
  
  const fetchStockSede = async (sede: string) => { // Función auxiliar para recargar stock
    setCargando(true);
    try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const response = await fetch(`${apiBaseUrl}/api/marketing/stock?grupo=${sede}`);
        if (!response.ok) throw new Error('Error al recargar stock.');
        const data: StockSede = await response.json();
        setStockActualSede(data);
        const productos = Object.keys(data).map(idColumna => ({
            id: idColumna,
            nombre: formatearNombreProducto(idColumna)
        }));
        setProductosDisponibles(productos); // Actualizar también los productos disponibles para el dropdown
    } catch (error: any) {
        setMensajeGlobal({ tipo: 'error', texto: `Error recargando stock: ${error.message}` });
    }
    setCargando(false);
  };

  // Actualizar vista previa de columna para nuevo producto
  const actualizarPreviewColumna = () => {
    if (!nombreNuevoProducto) {
      setPreviewColumna('merch_...');
      return;
    }
    const normalizado = nombreNuevoProducto.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '');
    let columna = `merch_${normalizado}`;
    if (tipoNuevoProducto === 'ejecutivo') {
      columna += '_eje';
    }
    setPreviewColumna(columna);
  };

  useEffect(actualizarPreviewColumna, [nombreNuevoProducto, tipoNuevoProducto]);

  // Manejar agregar nuevo producto
  const handleAgregarNuevoProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sedeSeleccionadaNuevoProd || !nombreNuevoProducto || !tipoNuevoProducto || !previewColumna.startsWith('merch_') || previewColumna === 'merch_...') {
      setMensajeGlobal({ tipo: 'error', texto: 'Sede, nombre de producto, tipo y un nombre de columna válido son requeridos.' });
      return;
    }
    setCargando(true);
    setMensajeGlobal(null);

    const payload = {
      grupo: sedeSeleccionadaNuevoProd,
      columna: previewColumna,
      cantidad: cantidadInicialNuevoProd, // Puede ser 0
      responsable: datosUsuario.nombre // Opcional, enviar el usuario actual como responsable del registro inicial
    };

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/marketing/nuevo_producto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || `Error ${response.status} al agregar producto.`);
      }
      setMensajeGlobal({ tipo: 'success', texto: responseData.message || 'Nuevo producto agregado exitosamente.' });
      setNombreNuevoProducto('');
      setTipoNuevoProducto('');
      setCantidadInicialNuevoProd(0);
      setPreviewColumna('merch_...');
      // Opcional: Si la sede seleccionada para agregar producto es la misma que para ver inventario, recargar.
      if (sedeSeleccionadaNuevoProd === sedeSeleccionadaInventario) {
        fetchStockSede(sedeSeleccionadaNuevoProd);
      }
    } catch (error: any) {
      console.error("Error agregando nuevo producto:", error);
      setMensajeGlobal({ tipo: 'error', texto: error.message });
    } finally {
      setCargando(false);
    }
  };

  // Renderizado del componente
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="relative"> {/* Para el Loader */}
        {cargando && <Loader />}
        <div className={`bg-white p-6 rounded-lg shadow-md ${cargando ? 'opacity-50' : ''}`}>
          <h1 className="text-2xl font-bold text-[#2e3954] mb-6 text-center">Sistema de Inventario</h1>
          
          {mensajeGlobal && (
            <div className={`mb-4 p-3 rounded-md text-center ${mensajeGlobal.tipo === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {mensajeGlobal.texto}
            </div>
          )}

          {/* Botones de navegación */}
          <div className="flex gap-4 mb-6">
            <button 
              onClick={() => setPestañaActiva('inventario')}
              className={`px-4 py-2 rounded-md transition duration-200 ${
                pestañaActiva === 'inventario' 
                  ? 'bg-[#2e3954] text-white font-semibold' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Agregar Inventario
            </button>
            <button 
              onClick={() => setPestañaActiva('producto')}
              className={`px-4 py-2 rounded-md transition duration-200 ${
                pestañaActiva === 'producto' 
                  ? 'bg-[#2e3954] text-white font-semibold' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Agregar Producto
            </button>
          </div>
          
          {/* Sección: Agregar Inventario */}
          <div className={pestañaActiva === 'inventario' ? 'block' : 'hidden'}>
            <h2 className="text-xl font-semibold text-gray-700 pb-2 mb-4 border-b border-gray-200">Agregar Inventario</h2>
            <form onSubmit={handleEnviarInventario} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="sedeInventario" className="block text-sm font-medium text-gray-700">Sede</label>
                  <select 
                    id="sedeInventario" 
                    value={sedeSeleccionadaInventario}
                    onChange={(e) => setSedeSeleccionadaInventario(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                    required
                  >
                    <option value="" disabled>Seleccione una sede</option>
                    <option value="kossodo">Kossodo</option>
                    <option value="kossomet">Kossomet</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="responsableInventario" className="block text-sm font-medium text-gray-700">Responsable</label>
                  <input 
                    type="text" 
                    id="responsableInventario" 
                    value={responsableInventario}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                  <label htmlFor="observacionesInventario" className="block text-sm font-medium text-gray-700">Observaciones (Opcional)</label>
                  <textarea 
                    id="observacionesInventario" 
                    value={observacionesInventario}
                    onChange={(e) => setObservacionesInventario(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                    rows={2}
                  />
              </div>

              {sedeSeleccionadaInventario && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-700">Agregar Productos al Carrito</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="productoSelectCarrito" className="block text-sm font-medium text-gray-700">Producto</label>
                      <select 
                        id="productoSelectCarrito" 
                        value={productoSeleccionadoCarrito}
                        onChange={(e) => setProductoSeleccionadoCarrito(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                      >
                        <option value="" disabled>Seleccione un producto</option>
                        {productosDisponibles.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="cantidadProductoCarrito" className="block text-sm font-medium text-gray-700">Cantidad</label>
                      <input 
                        type="number" 
                        id="cantidadProductoCarrito" 
                        min="1" 
                        value={cantidadProductoCarrito}
                        onChange={(e) => setCantidadProductoCarrito(parseInt(e.target.value) || 1)}
                        className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={handleAgregarAlCarrito}
                      className="px-4 py-2 bg-[#d48b45] text-white rounded-md hover:bg-[#be7b3d] transition-colors duration-200 h-fit"
                      disabled={!productoSeleccionadoCarrito || cantidadProductoCarrito <=0}
                    >
                      Agregar al Carrito
                    </button>
                  </div>

                  {carrito.length > 0 && (
                    <div className="overflow-x-auto mt-4">
                      <h4 className="text-md font-semibold text-gray-600 mb-2">Productos en Carrito:</h4>
                      <table className="w-full border-collapse">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Producto</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Cantidad</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                          {carrito.map((item) => (
                            <tr key={item.productoId} className="hover:bg-gray-50">
                              <td className="px-4 py-2 border border-gray-200 text-gray-800">{item.nombreProducto}</td>
                              <td className="px-4 py-2 border border-gray-200 text-gray-800">{item.cantidad}</td>
                              <td className="px-4 py-2 border border-gray-200">
                                <button 
                                  type="button"
                                  onClick={() => eliminarDelCarrito(item.productoId)}
                                  className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors duration-200"
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              
              <button 
                type="submit" 
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
                disabled={carrito.length === 0 || !sedeSeleccionadaInventario || cargando}
              >
                Enviar Inventario
              </button>
            </form>
          </div>
          
          {/* Sección: Stock de Productos (visible con pestaña inventario) */}
          <div className={pestañaActiva === 'inventario' && sedeSeleccionadaInventario ? 'block mt-8' : 'hidden'}>
            <h2 className="text-xl font-semibold text-gray-700 pb-2 mb-4 border-b border-gray-200">Stock Actual en {formatearNombreProducto(sedeSeleccionadaInventario)}</h2>
            {stockActualSede && Object.keys(stockActualSede).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Producto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Cantidad en Stock</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(stockActualSede)
                      .filter(([, cantidad]) => cantidad > 0) // Mostrar solo con stock > 0
                      .map(([idProducto, cantidad]) => (
                      <tr key={idProducto} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border border-gray-200 text-gray-800">{formatearNombreProducto(idProducto)}</td>
                        <td className="px-4 py-2 border border-gray-200 text-gray-800">{cantidad}</td>
                      </tr>
                    ))}
                    {Object.values(stockActualSede).every(qty => qty <= 0) && (
                        <tr><td colSpan={2} className="text-center italic py-3">No hay productos con stock disponible para esta sede.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="italic text-gray-500">Seleccione una sede para ver el stock o no hay stock disponible.</p>
            )}
          </div>
        
          {/* Sección: Agregar Nuevo Producto */}
          <div className={pestañaActiva === 'producto' ? 'block' : 'hidden'}>
            <h2 className="text-xl font-semibold text-gray-700 pb-2 mb-4 border-b border-gray-200">Agregar Nuevo Producto al Inventario Global</h2>
            <form onSubmit={handleAgregarNuevoProducto} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="sedeNuevoProducto" className="block text-sm font-medium text-gray-700">Sede donde se reflejará inicialmente</label>
                <select 
                  id="sedeNuevoProducto" 
                  value={sedeSeleccionadaNuevoProd}
                  onChange={(e) => setSedeSeleccionadaNuevoProd(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                  required
                >
                  <option value="" disabled>Seleccione una sede</option>
                  <option value="kossodo">Kossodo</option>
                  <option value="kossomet">Kossomet</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="nombreNuevoProducto" className="block text-sm font-medium text-gray-700">Nombre de Producto (Legible)</label>
                <input 
                  type="text" 
                  id="nombreNuevoProducto" 
                  placeholder="Ej: Lapicero Ejecutivo Azul"
                  value={nombreNuevoProducto}
                  onChange={(e) => setNombreNuevoProducto(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="tipoNuevoProducto" className="block text-sm font-medium text-gray-700">Tipo</label>
                <select 
                  id="tipoNuevoProducto" 
                  value={tipoNuevoProducto}
                  onChange={(e) => setTipoNuevoProducto(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                  required
                >
                  <option value="" disabled>Seleccione el tipo</option>
                  <option value="normal">Normal</option>
                  <option value="ejecutivo">Ejecutivo</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Nombre de Columna (Automático)</label>
                <div className="p-3 bg-gray-100 border border-gray-300 rounded-md font-mono text-sm text-gray-800 break-all">
                  {previewColumna}
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="cantidadInicialNuevoProd" className="block text-sm font-medium text-gray-700">Cantidad Inicial (Opcional, por defecto 0)</label>
                <input 
                  type="number" 
                  id="cantidadInicialNuevoProd" 
                  min="0"
                  value={cantidadInicialNuevoProd}
                  onChange={(e) => setCantidadInicialNuevoProd(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                />
              </div>
              <button 
                type="submit" 
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
                disabled={!previewColumna.startsWith('merch_') || previewColumna === 'merch_...' || cargando || !sedeSeleccionadaNuevoProd}
              >
                Agregar Nuevo Producto al Sistema
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 