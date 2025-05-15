'use client';

import { useState, useEffect } from 'react';

// Datos de ejemplo para los productos disponibles
const productosEjemplo = [
  { id: 'merch_lapicero_esco', nombre: 'Lapicero Esco', tipo: 'normal', stock: 30 },
  { id: 'merch_cuaderno_a4', nombre: 'Cuaderno A4', tipo: 'normal', stock: 25 },
  { id: 'merch_block_notas', nombre: 'Block de notas', tipo: 'normal', stock: 15 },
  { id: 'merch_resaltador', nombre: 'Resaltador', tipo: 'normal', stock: 20 },
  { id: 'merch_lapicero_esco_eje', nombre: 'Lapicero Esco', tipo: 'ejecutivo', stock: 10 },
  { id: 'merch_libreta_ejecutiva_eje', nombre: 'Libreta ejecutiva', tipo: 'ejecutivo', stock: 8 },
  { id: 'merch_set_oficina_eje', nombre: 'Set de oficina', tipo: 'ejecutivo', stock: 5 },
];

export default function SolicitudMerchandising() {
  // Estados
  const [cantidadPacks, setCantidadPacks] = useState<number>(0);
  const [productosDisponibles, setProductosDisponibles] = useState<any[]>([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState<string[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('');
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error', texto: string } | null>(null);
  const [datosUsuario, setDatosUsuario] = useState<{ nombre: string; grupo: string; username?: string }>({ nombre: '', grupo: '' });

  // Simular la carga de datos del usuario al montar el componente
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        // Priorizar nombre, luego username. Asumir un grupo por defecto si no está.
        setDatosUsuario({
          nombre: userData.nombre || userData.usuario || 'Usuario Desconocido',
          grupo: userData.grupo || 'kossodo', // O un valor por defecto o lógica para determinarlo
          username: userData.usuario
        });
        setGrupoSeleccionado(userData.grupo || 'kossodo');
        cargarProductos(userData.grupo || 'kossodo');
      } catch (error) {
        console.error("Error al parsear datos del usuario del localStorage:", error);
        // Fallback si hay error
        setDatosUsuario({ nombre: 'Usuario Desconocido', grupo: 'kossodo' });
        setGrupoSeleccionado('kossodo');
        cargarProductos('kossodo');
      }
    } else {
        // Fallback si no hay usuario en localStorage
        setDatosUsuario({ nombre: 'Usuario Desconocido', grupo: 'kossodo' });
        setGrupoSeleccionado('kossodo');
        cargarProductos('kossodo');
    }
    
    // Cargar productos iniciales ya no se llama aquí directamente, se llama dentro del if/else de storedUser
  }, []);

  // Función para filtrar productos según la cantidad de packs
  const cargarProductos = (grupo: string) => {
    // En una implementación real, esto sería una llamada fetch a la API
    // Por ahora, simplemente filtramos los datos de ejemplo
    setProductosDisponibles(productosEjemplo);
  };

  // Actualizar productos disponibles cuando cambia la cantidad de packs
  useEffect(() => {
    actualizarProductosDisponibles();
  }, [cantidadPacks]);

  const actualizarProductosDisponibles = () => {
    // Filtrar productos que tienen suficiente stock para la cantidad de packs
    if (cantidadPacks > 0) {
      const productosFiltrados = productosEjemplo.filter(
        producto => producto.stock >= cantidadPacks
      );
      setProductosDisponibles(productosFiltrados);
    } else {
      setProductosDisponibles(productosEjemplo);
    }
  };

  // Manejar cambio en los checkboxes
  const manejarCambioCheckbox = (productoId: string, isChecked: boolean) => {
    if (isChecked) {
      setProductosSeleccionados([...productosSeleccionados, productoId]);
    } else {
      setProductosSeleccionados(productosSeleccionados.filter(id => id !== productoId));
    }
  };

  // Manejar envío del formulario
  const enviarFormulario = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    if (!datosUsuario.nombre || !grupoSeleccionado || cantidadPacks <= 0 || productosSeleccionados.length === 0) {
      setMensaje({
        tipo: 'error',
        texto: 'Complete todos los campos obligatorios y seleccione al menos un producto.'
      });
      return;
    }
    
    // Simular envío exitoso
    setMensaje({
      tipo: 'success',
      texto: '¡Éxito! Solicitud enviada correctamente. ID: SOL-123456'
    });
    
    // Resetear selecciones (en una app real, resetearíamos el formulario)
    setProductosSeleccionados([]);
    setCantidadPacks(0);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
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
              
              {/* Sección de productos normales */}
              <div className="border border-gray-200 rounded-md p-4">
                <h4 className="text-base font-semibold text-[#2e3954] pb-2 mb-3 border-b border-gray-200">
                  Cliente Normal
                </h4>
                
                {productosDisponibles.filter(p => p.tipo === 'normal' && p.stock >= cantidadPacks).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {productosDisponibles
                      .filter(producto => producto.tipo === 'normal' && producto.stock >= cantidadPacks)
                      .map(producto => (
                        <div 
                          key={producto.id}
                          className="flex items-center p-2 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            id={producto.id}
                            checked={productosSeleccionados.includes(producto.id)}
                            onChange={(e) => manejarCambioCheckbox(producto.id, e.target.checked)}
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
                      : 'Ingrese la cantidad de packs.'}
                  </p>
                )}
              </div>
              
              {/* Sección de productos ejecutivos */}
              <div className="border border-gray-200 rounded-md p-4">
                <h4 className="text-base font-semibold text-[#2e3954] pb-2 mb-3 border-b border-gray-200">
                  Cliente Ejecutivo
                </h4>
                
                {productosDisponibles.filter(p => p.tipo === 'ejecutivo' && p.stock >= cantidadPacks).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {productosDisponibles
                      .filter(producto => producto.tipo === 'ejecutivo' && producto.stock >= cantidadPacks)
                      .map(producto => (
                        <div 
                          key={producto.id}
                          className="flex items-center p-2 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            id={producto.id}
                            checked={productosSeleccionados.includes(producto.id)}
                            onChange={(e) => manejarCambioCheckbox(producto.id, e.target.checked)}
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
                      : 'Ingrese la cantidad de packs.'}
                  </p>
                )}
              </div>
              
              {/* Mensaje cuando no hay productos disponibles */}
              {cantidadPacks > 0 && productosDisponibles.filter(p => p.stock >= cantidadPacks).length === 0 && (
                <div className="text-red-600 font-medium text-center italic">
                  No hay productos disponibles para la cantidad ingresada.
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
        </div>
      </div>
    </div>
  );
} 