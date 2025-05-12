'use client';

import { useState } from 'react';

// Datos de ejemplo para la tabla
const datosCalificaciones = [
  { id: 1, asesor: 'Juan Pérez', nombres: 'Importadora XYZ S.A.C.', calificacion: 'Bueno', tipo: 'Venta (OT)' },
  { id: 2, asesor: 'María García', nombres: 'Distribuidora ABC E.I.R.L.', calificacion: 'Regular', tipo: 'Conformidad' },
  { id: 3, asesor: 'Carlos López', nombres: 'Comercial 123 S.A.', calificacion: 'Malo', tipo: 'Venta (OT)' },
  { id: 4, asesor: 'Ana Martínez', nombres: 'Inversiones DEF S.R.L.', calificacion: 'Bueno', tipo: 'Conformidad' },
  { id: 5, asesor: 'Pedro Sánchez', nombres: 'Corporación GHI S.A.C.', calificacion: 'Bueno', tipo: 'Venta (OT)' },
];

export default function RegistroCalificaciones() {
  // Estados para modales
  const [mostrarModalDetalles, setMostrarModalDetalles] = useState(false);
  const [mostrarModalConformidad, setMostrarModalConformidad] = useState(false);
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false);
  const [detalleSeleccionado, setDetalleSeleccionado] = useState<any>(null);

  // Función para abrir modal de detalles
  const abrirModalDetalles = (id: number) => {
    // En una implementación real, buscaríamos los datos del registro con el ID
    const detalle = datosCalificaciones.find(item => item.id === id);
    setDetalleSeleccionado(detalle);
    setMostrarModalDetalles(true);
  };

  // Función para abrir modal de conformidad
  const abrirModalConformidad = () => {
    setMostrarModalConformidad(true);
    setMostrarModalDetalles(false);
  };

  // Manejar cambio de filtro de fechas
  const manejarCambioFiltroFechas = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'personalizado') {
      setMostrarPersonalizado(true);
    } else {
      setMostrarPersonalizado(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#2e3954] mb-6">Registro de Calificaciones</h1>
      
      <div>
        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-8">
          <select 
            className="flex-1 min-w-[150px] p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
          >
            <option value="">Todos los asesores</option>
            <option value="1">Juan Pérez</option>
            <option value="2">María García</option>
            <option value="3">Carlos López</option>
          </select>
          
          <select 
            className="flex-1 min-w-[150px] p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
          >
            <option value="">Todos los grupos</option>
            <option value="1">Grupo A</option>
            <option value="2">Grupo B</option>
            <option value="3">Grupo C</option>
          </select>
          
          <select 
            className="flex-1 min-w-[150px] p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
          >
            <option value="">Todas las calificaciones</option>
            <option value="bueno">Bueno</option>
            <option value="regular">Regular</option>
            <option value="malo">Malo</option>
          </select>
          
          <div className="flex-1 min-w-[150px] flex flex-col">
            <select 
              className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
              onChange={manejarCambioFiltroFechas}
            >
              <option value="">Todos los periodos</option>
              <option value="hoy">Hoy</option>
              <option value="ayer">Ayer</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
              <option value="mes-1">Último mes</option>
              <option value="mes-3">Últimos 3 meses</option>
              <option value="mes-6">Últimos 6 meses</option>
              <option value="año">Este año</option>
              <option value="personalizado">Rango personalizado</option>
            </select>
            
            {mostrarPersonalizado && (
              <div className="mt-2 flex flex-wrap gap-2 items-end">
                <div className="flex flex-col flex-1 min-w-[140px]">
                  <label htmlFor="fechaInicio" className="text-xs mb-1 text-gray-600">Fecha inicial:</label>
                  <input 
                    type="date" 
                    id="fechaInicio" 
                    className="p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                  />
                </div>
                <div className="flex flex-col flex-1 min-w-[140px]">
                  <label htmlFor="fechaFin" className="text-xs mb-1 text-gray-600">Fecha final:</label>
                  <input 
                    type="date" 
                    id="fechaFin" 
                    className="p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                  />
                </div>
                <button className="px-4 py-2 bg-[#d48b45] text-white rounded-md hover:bg-[#be7b3d] transition-colors duration-200">
                  Aplicar
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Gráfico de líneas (tendencia) */}
          <div className="bg-white rounded-xl shadow-md p-6 lg:col-span-3">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 mb-3 border-b border-gray-200">Tendencia de Calificaciones</h3>
            <div className="h-[250px] w-full bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Gráfico de tendencia</p>
            </div>
          </div>
          
          {/* Gráfico de ventas */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 mb-3 border-b border-gray-200">Percepción - Ventas (OT)</h3>
            <div className="h-[250px] w-full bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Gráfico de ventas</p>
            </div>
          </div>
          
          {/* Gráfico de conformidad */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 mb-3 border-b border-gray-200">Percepción - Conformidad</h3>
            <div className="h-[250px] w-full bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Gráfico de conformidad</p>
            </div>
          </div>
          
          {/* Tabla de asesores */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 mb-3 border-b border-gray-200">Calificaciones por Asesor</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-2 text-left">Asesor</th>
                    <th className="px-2 py-2 text-center">Calif.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-gray-800">Juan Pérez</td>
                    <td className="px-2 py-2 text-center text-green-600">4.8</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-gray-800">María García</td>
                    <td className="px-2 py-2 text-center text-green-600">4.5</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-gray-800">Carlos López</td>
                    <td className="px-2 py-2 text-center text-yellow-600">3.2</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Ranking de asesores */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 mb-3 border-b border-gray-200">Ranking de Satisfacción</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-2 text-left">Asesor</th>
                    <th className="px-2 py-2 text-center">Posición</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50 bg-green-50">
                    <td className="px-2 py-2 text-gray-800">Juan Pérez</td>
                    <td className="px-2 py-2 text-center text-gray-800">1°</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-gray-800">María García</td>
                    <td className="px-2 py-2 text-center text-gray-800">2°</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-gray-800">Carlos López</td>
                    <td className="px-2 py-2 text-center text-gray-800">3°</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Distribución por regiones */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 mb-3 border-b border-gray-200">Distribución por Regiones</h3>
            <div className="h-[250px] w-full bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Gráfico de regiones</p>
            </div>
          </div>
        </div>
        
        {/* Tabla de calificaciones */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[5%]">ID</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[16%]">Asesor</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[27%]">Nombres</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[11%]">Calificación</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">Tipo</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[7%]">+</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {datosCalificaciones.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-800">{item.id}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-800">{item.asesor}</td>
                    <td className="px-3 py-2 text-gray-800">{item.nombres}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-2 text-xs rounded-full ${
                        item.calificacion === 'Bueno'
                          ? 'bg-green-100 text-green-800'
                          : item.calificacion === 'Regular'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.calificacion}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-800">{item.tipo}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <button
                        onClick={() => abrirModalDetalles(item.id)}
                        className="inline-flex items-center justify-center p-1 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Modal de detalles */}
      {mostrarModalDetalles && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-11/12 max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="text-lg font-medium text-gray-900">
                Detalles de Calificación #{detalleSeleccionado?.id}
              </h3>
              <button onClick={() => setMostrarModalDetalles(false)} className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {/* Información básica */}
              <div className="bg-white rounded-lg border border-gray-200 mb-4">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-lg">
                  <h3 className="text-sm font-medium text-gray-700">Información</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex border-b border-gray-100 pb-2">
                    <div className="w-1/4 font-medium text-gray-600">RUC:</div>
                    <div className="w-3/4 text-gray-800">20123456789</div>
                  </div>
                  <div className="flex border-b border-gray-100 pb-2">
                    <div className="w-1/4 font-medium text-gray-600">Documento:</div>
                    <div className="w-3/4 text-gray-800">OT-2023-0012345</div>
                  </div>
                  <div className="flex">
                    <div className="w-1/4 font-medium text-gray-600">Fecha:</div>
                    <div className="w-3/4 text-gray-800">15/05/2023 10:30 AM</div>
                  </div>
                </div>
              </div>
              
              {/* Observaciones */}
              <div className="bg-white rounded-lg border border-gray-200 mb-4">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-lg">
                  <h3 className="text-sm font-medium text-gray-700">Observaciones</h3>
                </div>
                <div className="p-4">
                  <p className="text-gray-700">
                    El cliente está satisfecho con la atención recibida. Mencionó que el proceso fue rápido y eficiente.
                  </p>
                </div>
              </div>
              
              {/* Promociones */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-lg">
                  <h3 className="text-sm font-medium text-gray-700">Promociones</h3>
                </div>
                <div className="p-4">
                  <div className="bg-gray-50 rounded-md p-3 mb-2">
                    <h4 className="text-sm font-medium text-gray-700 pb-1 border-b border-gray-200 mb-2">Descuento especial</h4>
                    <p className="text-sm text-gray-600 mb-2">10% de descuento en la próxima compra</p>
                    <p className="text-xs text-gray-500">Válido hasta: 31/12/2023</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-2">
              <button 
                onClick={abrirModalConformidad}
                className="px-4 py-2 bg-[#d48b45] text-white rounded-md hover:bg-[#be7b3d] transition-colors duration-200"
              >
                Conformidad
              </button>
              <button 
                onClick={() => setMostrarModalDetalles(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de conformidad */}
      {mostrarModalConformidad && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-11/12 max-w-lg">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="text-lg font-medium text-gray-900">
                Conformidad de resolución del cliente
              </h3>
              <button onClick={() => setMostrarModalConformidad(false)} className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <form>
                <div className="mb-4">
                  <label htmlFor="tipoConformidad" className="block text-sm font-medium text-gray-700 mb-1">
                    Estado de conformidad:
                  </label>
                  <select
                    id="tipoConformidad"
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                    required
                  >
                    <option value="">Seleccione una opción</option>
                    <option value="Sustentable">Sustentable</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="observacionConformidad" className="block text-sm font-medium text-gray-700 mb-1">
                    Observación:
                  </label>
                  <textarea
                    id="observacionConformidad"
                    rows={4}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d48b45]"
                  ></textarea>
                </div>
              </form>
            </div>
            
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-2">
              <button 
                className="px-4 py-2 bg-[#4CAF50] text-white rounded-md hover:bg-[#388E3C] transition-colors duration-200"
              >
                Enviar
              </button>
              <button 
                onClick={() => setMostrarModalConformidad(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 