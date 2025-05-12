'use client';

import { useState } from 'react';

// Datos de ejemplo para el stock
const stockProductos = [
  { producto: 'Lapicero Esco', cantidad: 25 },
  { producto: 'Cuaderno A4', cantidad: 15 },
  { producto: 'Block de notas', cantidad: 30 },
  { producto: 'Resaltador', cantidad: 12 },
  { producto: 'Calculadora', cantidad: 5 },
];

// Datos de ejemplo para el carrito
const carritoInicial = [
  { producto: 'Lapicero Esco', cantidad: 5 },
  { producto: 'Cuaderno A4', cantidad: 2 },
];

export default function SistemaInventario() {
  // Estado para manejar las pestañas
  const [pestañaActiva, setPestañaActiva] = useState<'inventario' | 'producto'>('inventario');
  const [carrito, setCarrito] = useState<{ producto: string; cantidad: number }[]>(carritoInicial);
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false);
  const [previewColumna, setPreviewColumna] = useState('merch_...');
  
  // Función para eliminar un producto del carrito
  const eliminarDelCarrito = (index: number) => {
    const nuevoCarrito = [...carrito];
    nuevoCarrito.splice(index, 1);
    setCarrito(nuevoCarrito);
  };
  
  // Función para actualizar vista previa de columna
  const actualizarPreviewColumna = (nombre: string, tipo: string) => {
    if (!nombre) {
      setPreviewColumna('merch_...');
      return;
    }
    
    // Normalizar nombre (solo representativo, no funcional)
    const normalizado = nombre.toLowerCase().replace(/\s+/g, '_');
    let columna = `merch_${normalizado}`;
    
    if (tipo === 'ejecutivo') {
      columna += '_eje';
    }
    
    setPreviewColumna(columna);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-[#2e3954] mb-6">Sistema de Inventario</h1>
        
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
          
          <form className="space-y-6">
            {/* Selección de sede */}
            <div className="space-y-2">
              <label htmlFor="sedeInventario" className="block text-sm font-medium text-gray-700">Sede</label>
              <select 
                id="sedeInventario" 
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
              >
                <option value="" disabled selected>Seleccione una sede</option>
                <option value="kossodo">Kossodo</option>
                <option value="kossomet">Kossomet</option>
              </select>
            </div>
            
            {/* Responsable */}
            <div className="space-y-2">
              <label htmlFor="responsableInventario" className="block text-sm font-medium text-gray-700">Responsable</label>
              <input 
                type="text" 
                id="responsableInventario" 
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
              />
            </div>
            
            {/* Sección para agregar productos */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-700">Agregar Productos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="productoSelect" className="block text-sm font-medium text-gray-700">Producto</label>
                  <select 
                    id="productoSelect" 
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                  >
                    <option value="" disabled selected>Seleccione un producto</option>
                    <option value="lapicero_esco">Lapicero Esco</option>
                    <option value="cuaderno_a4">Cuaderno A4</option>
                    <option value="block_notas">Block de notas</option>
                    <option value="resaltador">Resaltador</option>
                    <option value="calculadora">Calculadora</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="productoCantidad" className="block text-sm font-medium text-gray-700">Cantidad</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      id="productoCantidad" 
                      min="1" 
                      defaultValue="1"
                      className="flex-1 p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                    />
                    <button 
                      type="button" 
                      className="px-4 py-2 bg-[#d48b45] text-white rounded-md hover:bg-[#be7b3d] transition-colors duration-200"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Tabla de productos agregados */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse mt-4">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Producto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Cantidad</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {carrito.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border border-gray-200 text-gray-800">{item.producto}</td>
                        <td className="px-4 py-2 border border-gray-200 text-gray-800">{item.cantidad}</td>
                        <td className="px-4 py-2 border border-gray-200">
                          <button 
                            onClick={() => eliminarDelCarrito(index)}
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
              
              <button 
                type="submit" 
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
              >
                Enviar Inventario
              </button>
            </div>
          </form>
          
          {/* Mensaje de respuesta (inicialmente vacío) */}
          <div className="mt-4"></div>
        </div>
        
        {/* Sección: Stock de Productos */}
        <div className={pestañaActiva === 'inventario' ? 'block mt-8' : 'hidden'}>
          <h2 className="text-xl font-semibold text-gray-700 pb-2 mb-4 border-b border-gray-200">Stock de Productos</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Producto</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Cantidad</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockProductos.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border border-gray-200 text-gray-800">{item.producto}</td>
                    <td className="px-4 py-2 border border-gray-200 text-gray-800">{item.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Sección: Agregar Producto */}
        <div className={pestañaActiva === 'producto' ? 'block' : 'hidden'}>
          <h2 className="text-xl font-semibold text-gray-700 pb-2 mb-4 border-b border-gray-200">Agregar Nuevo Producto</h2>
          
          <form className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="nuevaSede" className="block text-sm font-medium text-gray-700">Seleccione Sede</label>
              <select 
                id="nuevaSede" 
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
              >
                <option value="" disabled selected>Seleccione una sede</option>
                <option value="kossodo">Kossodo</option>
                <option value="kossomet">Kossomet</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="nombreProducto" className="block text-sm font-medium text-gray-700">Nombre de Producto</label>
              <input 
                type="text" 
                id="nombreProducto" 
                placeholder="Ejemplo: Lapicero Esco"
                onChange={(e) => actualizarPreviewColumna(e.target.value, (document.getElementById('tipoProducto') as HTMLSelectElement)?.value || '')}
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="tipoProducto" className="block text-sm font-medium text-gray-700">Tipo</label>
              <select 
                id="tipoProducto" 
                onChange={(e) => actualizarPreviewColumna((document.getElementById('nombreProducto') as HTMLInputElement)?.value || '', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
              >
                <option value="" disabled selected>Seleccione el tipo</option>
                <option value="normal">Normal</option>
                <option value="ejecutivo">Ejecutivo</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="cantidadInicial" className="block text-sm font-medium text-gray-700">Cantidad Inicial</label>
              <input 
                type="number" 
                id="cantidadInicial" 
                min="0"
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Nombre de Columna</label>
              <div className="p-2 bg-gray-100 border border-gray-300 rounded-md font-mono text-gray-800">
                {previewColumna}
              </div>
            </div>
            
            <button 
              type="submit" 
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
            >
              Agregar Nuevo Producto
            </button>
          </form>
          
          {/* Mensaje de respuesta (inicialmente vacío) */}
          <div className="mt-4"></div>
        </div>
      </div>
    </div>
  );
} 