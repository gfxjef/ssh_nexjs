'use client';

import { useState, useEffect, ReactNode } from 'react';

// Datos de ejemplo para las confirmaciones
const confirmacionesEjemplo = [
  { 
    solicitud_id: 101, 
    confirmador: 'Admin Usuario',
    grupo: 'kossodo',
    observaciones: 'Entrega prioritaria. Cliente de alto valor.',
    productos: {
      'merch_lapiceros_normales': 5,
      'merch_blocks': 3,
      'merch_tacos': 5
    }
  },
  { 
    solicitud_id: 102, 
    confirmador: 'Supervisor Ventas',
    grupo: 'kossomet',
    observaciones: 'Incluir catálogos actualizados.',
    productos: {
      'merch_gel_botella': 3,
      'merch_padmouse': 3,
      'merch_lapicero_ejecutivos': 3
    }
  },
  { 
    solicitud_id: 103, 
    confirmador: 'Admin Usuario',
    grupo: 'kossodo',
    observaciones: '',
    productos: {
      'merch_bolas_antiestres': 2,
      'merch_bolsa': 2
    }
  },
];

// Datos de ejemplo para las solicitudes originales
const solicitudesOriginalesEjemplo = [
  {
    id: 101,
    solicitante: 'Juan Pérez',
    ruc: '20602487495',
    fecha_visita: '2025-05-15',
    grupo: 'kossodo'
  },
  {
    id: 102,
    solicitante: 'María García',
    ruc: '20603598741',
    fecha_visita: '2025-05-20',
    grupo: 'kossomet'
  },
  {
    id: 103,
    solicitante: 'Carlos López',
    ruc: '20605874123',
    fecha_visita: '2025-05-25',
    grupo: 'kossodo'
  }
];

export default function HistorialConfirmaciones() {
  // Estados
  const [confirmaciones, setConfirmaciones] = useState<any[]>([]);
  const [solicitudesMap, setSolicitudesMap] = useState<Map<number, any>>(new Map());
  const [modalVisible, setModalVisible] = useState(false);
  const [detalleActual, setDetalleActual] = useState<{
    solicitudId: number,
    observaciones: string,
    productos: any
  } | null>(null);
  const [mensaje, setMensaje] = useState<{tipo: 'success' | 'error', texto: string} | null>(null);
  
  // Efecto para cargar datos al montar el componente
  useEffect(() => {
    cargarConfirmaciones();
  }, []);
  
  // Función para cargar confirmaciones y solicitudes
  const cargarConfirmaciones = async () => {
    try {
      // En una aplicación real, esto sería una llamada fetch a la API
      // Simulamos la obtención de datos
      
      // Crear un mapa de solicitudes por ID para acceso rápido
      const solicitudesMapTemp = new Map(
        solicitudesOriginalesEjemplo.map(sol => [sol.id, sol])
      );
      
      setSolicitudesMap(solicitudesMapTemp);
      setConfirmaciones(confirmacionesEjemplo);
    } catch (err: any) {
      console.error('Error:', err);
      setMensaje({
        tipo: 'error',
        texto: `Error cargando confirmaciones: ${err.message}`
      });
    }
  };
  
  // Función para formatear fecha
  const formatearFecha = (fecha: string | undefined) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };
  
  // Función para mostrar el modal con detalles
  const mostrarDetalles = (solicitudId: number, observaciones: string, productos: any) => {
    setDetalleActual({
      solicitudId,
      observaciones,
      productos
    });
    setModalVisible(true);
  };
  
  // Función para formatear los productos JSON
  const formatProductos = (productos: any): ReactNode => {
    try {
      if (!productos || typeof productos !== 'object') {
        return <div className="italic text-gray-500 py-3">No hay productos registrados</div>;
      }
      
      const productItems = Object.entries(productos).map(([producto, cantidad]) => {
        const nombreProd = producto.replace(/^merch_/, '').replace(/_/g, ' ');
        return (
          <div key={producto} className="bg-gray-50 p-3 rounded-md mb-2">
            <strong>{nombreProd.charAt(0).toUpperCase() + nombreProd.slice(1)}:</strong> {String(cantidad)} unidades
          </div>
        );
      });
      
      return productItems.length > 0 ? 
        <>{productItems}</> : 
        <div className="italic text-gray-500 py-3">No hay productos registrados</div>;
    } catch (e) {
      console.error('Error procesando productos:', e);
      return <div className="italic text-gray-500 py-3">No hay productos registrados o formato incorrecto</div>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-[#2e3954] mb-6 text-center">Historial de Confirmaciones</h1>
        
        {/* Tabla de confirmaciones */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Solicitud ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Confirmador</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Grupo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">ID Solicitud Original</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Solicitante</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">RUC</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Fecha Visita</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {confirmaciones.length > 0 ? (
                confirmaciones.map(conf => {
                  const solicitudOriginal = solicitudesMap.get(conf.solicitud_id);
                  return (
                    <tr key={conf.solicitud_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border border-gray-200 text-gray-800">{conf.solicitud_id || '-'}</td>
                      <td className="px-4 py-2 border border-gray-200 text-gray-800">{conf.confirmador || '-'}</td>
                      <td className="px-4 py-2 border border-gray-200 text-gray-800">{conf.grupo || '-'}</td>
                      <td className="px-4 py-2 border border-gray-200 text-gray-800">{solicitudOriginal?.id || '-'}</td>
                      <td className="px-4 py-2 border border-gray-200 text-gray-800">{solicitudOriginal?.solicitante || '-'}</td>
                      <td className="px-4 py-2 border border-gray-200 text-gray-800">{solicitudOriginal?.ruc || '-'}</td>
                      <td className="px-4 py-2 border border-gray-200 text-gray-800">{formatearFecha(solicitudOriginal?.fecha_visita)}</td>
                      <td className="px-4 py-2 border border-gray-200">
                        <button 
                          onClick={() => mostrarDetalles(conf.solicitud_id, conf.observaciones, conf.productos)}
                          className="px-3 py-1 bg-[#2e3954] text-white text-sm rounded hover:bg-[#8dbba3] transition-colors duration-200"
                        >
                          Más detalles
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center text-gray-500 italic">
                    No hay confirmaciones registradas.
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
        
        {/* Modal de Detalles */}
        {modalVisible && detalleActual && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-3xl max-h-[90vh] overflow-auto">
              {/* Cabecera del modal */}
              <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center rounded-t-lg">
                <h3 className="text-lg font-medium text-gray-900">
                  Detalles de Confirmación #{detalleActual.solicitudId}
                </h3>
                <button 
                  onClick={() => setModalVisible(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-bold"
                >
                  &times;
                </button>
              </div>
              
              {/* Cuerpo del modal */}
              <div className="p-6 space-y-6">
                {/* Observaciones */}
                <div className="bg-white border border-gray-200 rounded-md">
                  <div className="bg-gray-50 px-4 py-2 border-b font-medium">
                    <strong>Observaciones</strong>
                  </div>
                  <div className="p-4">
                    {detalleActual.observaciones ? 
                      detalleActual.observaciones :
                      <div className="italic text-gray-500">Sin observaciones</div>
                    }
                  </div>
                </div>
                
                {/* Productos */}
                <div className="bg-white border border-gray-200 rounded-md">
                  <div className="bg-gray-50 px-4 py-2 border-b font-medium">
                    <strong>Productos Confirmados</strong>
                  </div>
                  <div className="p-4">
                    {formatProductos(detalleActual.productos)}
                  </div>
                </div>
              </div>
              
              {/* Pie del modal */}
              <div className="bg-gray-50 px-6 py-4 border-t flex justify-end rounded-b-lg">
                <button
                  onClick={() => setModalVisible(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 