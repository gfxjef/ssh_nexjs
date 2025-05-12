'use client';

import { useState, useEffect } from 'react';

// Datos de ejemplo para las solicitudes
const solicitudesEjemplo = [
  { 
    id: 1, 
    solicitante: 'Juan Pérez', 
    grupo: 'kossodo', 
    fecha_visita: '2025-05-15', 
    cantidad_packs: 5, 
    status: 'pending',
    catalogos: 'Binder, Esco', 
    productos: ['merch_lapiceros_normales', 'merch_blocks', 'merch_tacos'] 
  },
  { 
    id: 2, 
    solicitante: 'María García', 
    grupo: 'kossomet', 
    fecha_visita: '2025-05-20', 
    cantidad_packs: 3, 
    status: 'pending',
    catalogos: 'Esco, Atago', 
    productos: ['merch_gel_botella', 'merch_padmouse', 'merch_lapicero_ejecutivos'] 
  },
  { 
    id: 3, 
    solicitante: 'Carlos López', 
    grupo: 'kossodo', 
    fecha_visita: '2025-05-25', 
    cantidad_packs: 2, 
    status: 'pending',
    catalogos: '', 
    productos: ['merch_bolas_antiestres', 'merch_bolsa'] 
  },
];

// Datos de ejemplo para el stock disponible por grupos
const stockEjemplo = {
  kossodo: {
    'merch_lapiceros_normales': { nombre: 'Lapiceros normales', cantidad: 45 },
    'merch_blocks': { nombre: 'Blocks', cantidad: 30 },
    'merch_tacos': { nombre: 'Tacos', cantidad: 25 },
    'merch_gel_botella': { nombre: 'Gel botella', cantidad: 15 },
    'merch_bolas_antiestres': { nombre: 'Bolas antiestres', cantidad: 20 },
    'merch_padmouse': { nombre: 'Padmouse', cantidad: 12 },
    'merch_bolsa': { nombre: 'Bolsa', cantidad: 40 },
    'merch_lapiceros_esco': { nombre: 'Lapiceros Esco', cantidad: 35 }
  },
  kossomet: {
    'merch_lapiceros_normales': { nombre: 'Lapiceros normales', cantidad: 35 },
    'merch_lapicero_ejecutivos': { nombre: 'Lapicero ejecutivos', cantidad: 25 },
    'merch_blocks': { nombre: 'Blocks', cantidad: 20 },
    'merch_gel_botella': { nombre: 'Gel botella', cantidad: 10 },
    'merch_padmouse': { nombre: 'Padmouse', cantidad: 8 },
    'merch_bolsa': { nombre: 'Bolsa', cantidad: 30 }
  }
};

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
  const [solicitudActual, setSolicitudActual] = useState<any>(null);
  const [productosConfirmacion, setProductosConfirmacion] = useState<{[key: string]: number}>({});
  const [productosDisponibles, setProductosDisponibles] = useState<{[key: string]: {nombre: string, cantidad: number}}>({});
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>('');
  const [cantidadProducto, setCantidadProducto] = useState<number>(1);
  const [confirmador, setConfirmador] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [mensaje, setMensaje] = useState<{tipo: 'success' | 'error', texto: string} | null>(null);
  
  // Cargar datos al montar el componente
  useEffect(() => {
    cargarSolicitudesPendientes();
    
    // Simular datos del usuario autenticado
    setConfirmador('Admin Usuario');
  }, []);
  
  // Función para cargar solicitudes pendientes
  const cargarSolicitudesPendientes = () => {
    // En una aplicación real, esto sería una llamada fetch a la API
    // Por ahora, usamos datos de ejemplo
    setSolicitudes(solicitudesEjemplo);
  };
  
  // Función para cargar datos de stock para un grupo específico
  const cargarStockGrupo = (grupo: string) => {
    // En una aplicación real, esto sería una llamada fetch a la API
    // Por ahora, usamos datos de ejemplo
    setProductosDisponibles(stockEjemplo[grupo as keyof typeof stockEjemplo] || {});
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
  const confirmarSolicitud = () => {
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
    
    // En una aplicación real, esto sería una llamada fetch a la API
    // Por ahora, simulamos una confirmación exitosa
    
    // Actualizar la lista de solicitudes (eliminando la confirmada)
    setSolicitudes(solicitudes.filter(s => s.id !== solicitudActual.id));
    
    // Mostrar mensaje de éxito
    setMensaje({
      tipo: 'success',
      texto: `¡Éxito! Solicitud #${solicitudActual.id} confirmada correctamente.`
    });
    
    // Cerrar el modal
    setModalConfirmacionVisible(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
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
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        {solicitud.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 border border-gray-200">
                      <button 
                        onClick={() => abrirModalConfirmacion(solicitud.id)}
                        className="px-3 py-1 bg-[#2e3954] text-white text-sm rounded hover:bg-[#8dbba3] transition-colors duration-200"
                      >
                        Confirmar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-center text-gray-500 italic">
                    No hay solicitudes pendientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Mensajes de error o éxito */}
        {mensaje && (
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
                  onClick={() => setModalConfirmacionVisible(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-bold"
                >
                  &times;
                </button>
              </div>
              
              {/* Cuerpo del modal */}
              <div className="p-6 space-y-6">
                {/* Datos de la confirmación */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Confirmador (automático)
                    </label>
                    <input
                      type="text"
                      value={confirmador}
                      onChange={(e) => setConfirmador(e.target.value)}
                      readOnly
                      className="w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Catálogos
                    </label>
                    <textarea
                      readOnly
                      value={solicitudActual.catalogos || ''}
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
                    />
                  </div>
                </div>
                
                <hr className="border-gray-200" />
                
                {/* Sección Productos */}
                <div>
                  <h3 className="text-base font-medium text-gray-900 mb-4">Productos Solicitados:</h3>
                  
                  <div className="space-y-3">
                    {Object.keys(productosConfirmacion).length > 0 ? (
                      Object.entries(productosConfirmacion).map(([producto, cantidad]) => {
                        const nombreProd = producto.replace(/^merch_/, '').replace(/_/g, ' ');
                        return (
                          <div 
                            key={producto} 
                            className="flex items-center gap-3 bg-gray-50 p-3 rounded-md"
                          >
                            <label className="flex-1 text-sm font-medium text-gray-700">
                              {nombreProd.charAt(0).toUpperCase() + nombreProd.slice(1)}:
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={cantidad}
                              onChange={(e) => actualizarCantidadProducto(producto, parseInt(e.target.value) || 0)}
                              className="w-20 p-2 border border-gray-300 rounded-md text-gray-700 focus:ring-2 focus:ring-[#d48b45] focus:outline-none"
                            />
                            <button
                              onClick={() => eliminarProducto(producto)}
                              className="bg-red-500 text-white p-1 rounded hover:bg-red-600 transition-colors"
                            >
                              X
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 italic">No hay productos en esta solicitud.</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Pie del modal */}
              <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center rounded-b-lg">
                <button
                  onClick={abrirModalAgregarProducto}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                >
                  Agregar Producto
                </button>
                <div className="space-x-2">
                  <button
                    onClick={() => setModalConfirmacionVisible(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={confirmarSolicitud}
                    className="px-4 py-2 bg-[#2e3954] text-white rounded hover:bg-[#8dbba3] transition-colors"
                  >
                    Confirmar
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
                  Productos a agregar en {solicitudActual.grupo}
                </h3>
                <button 
                  onClick={() => setModalAgregarProductoVisible(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-bold"
                >
                  &times;
                </button>
              </div>
              
              {/* Cuerpo del modal */}
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Producto (stock disponible)
                    </label>
                    <select
                      value={productoSeleccionado}
                      onChange={(e) => setProductoSeleccionado(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-2 focus:ring-[#d48b45] focus:outline-none"
                    >
                      <option value="">Seleccione un producto</option>
                      {Object.entries(productosDisponibles).map(([key, { nombre, cantidad }]) => (
                        <option key={key} value={key}>
                          {nombre.charAt(0).toUpperCase() + nombre.slice(1)} (Stock: {cantidad})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={cantidadProducto}
                      onChange={(e) => setCantidadProducto(parseInt(e.target.value) || 1)}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-2 focus:ring-[#d48b45] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              
              {/* Pie del modal */}
              <div className="bg-gray-50 px-6 py-4 border-t flex justify-end items-center space-x-2 rounded-b-lg">
                <button
                  onClick={() => setModalAgregarProductoVisible(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={agregarProducto}
                  className="px-4 py-2 bg-[#2e3954] text-white rounded hover:bg-[#8dbba3] transition-colors"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 