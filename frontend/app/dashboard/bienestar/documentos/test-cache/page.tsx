'use client';

import React, { useState } from 'react';
import { useDocumentCache } from '../hooks/useDocumentCache';
import { Document } from '../types';

export default function TestCachePage() {
  const { 
    getFileUrl, 
    getCachedFileUrl, 
    getViewerType, 
    shouldShowPreview, 
    clearCache, 
    cacheSize,
    isLoading
  } = useDocumentCache();

  // Documentos de prueba
  const testDocuments: Document[] = [
    {
      id: 1,
      titulo: 'Documento PDF de Prueba',
      ruta_archivo: 'https://ejemplo-bucket.s3.amazonaws.com/doc_test.pdf',
      tipo_mime: 'application/pdf',
      tamaño_archivo: 1024000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      descargas: 0,
      categoria_id: 1,
      etiquetas: [],
      autor: 'Test',
      grupo: 'grupo_kossodo',
      nombre_archivo: 'doc_test.pdf',
      descripcion: 'Documento PDF para probar el sistema de cache',
      subido_por: 1,
      es_publico: true,
      estado: 'activo'
    } as Document,
    {
      id: 2,
      titulo: 'Imagen de Prueba',
      ruta_archivo: 'https://ejemplo-bucket.s3.amazonaws.com/image_test.jpg',
      tipo_mime: 'image/jpeg',
      tamaño_archivo: 512000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      descargas: 0,
      categoria_id: 1,
      etiquetas: [],
      autor: 'Test',
      grupo: 'grupo_kossodo',
      nombre_archivo: 'image_test.jpg',
      descripcion: 'Imagen para probar el sistema de cache',
      subido_por: 1,
      es_publico: true,
      estado: 'activo'
    } as Document,
    {
      id: 3,
      titulo: 'Documento Word de Prueba',
      ruta_archivo: 'https://ejemplo-bucket.s3.amazonaws.com/doc_test.docx',
      tipo_mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      tamaño_archivo: 2048000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      descargas: 0,
      categoria_id: 1,
      etiquetas: [],
      autor: 'Test',
      grupo: 'grupo_kossodo',
      nombre_archivo: 'doc_test.docx',
      descripcion: 'Documento Word para probar el sistema de cache (no previsualizable)',
      subido_por: 1,
      es_publico: true,
      estado: 'activo'
    } as Document
  ];

  const [testResults, setTestResults] = useState<any[]>([]);

  const runCacheTest = async () => {
    setTestResults([]);
    const results: any[] = [];

    for (const doc of testDocuments) {
      const startTime = Date.now();
      
      // Probar funciones del hook
      const directUrl = getFileUrl(doc);
      const cachedUrl = await getCachedFileUrl(doc);
      const viewerType = getViewerType(doc);
      const canPreview = shouldShowPreview(doc);
      const loading = isLoading(doc.id);
      
      const endTime = Date.now();
      
      results.push({
        document: doc.titulo,
        directUrl,
        cachedUrl,
        viewerType,
        canPreview,
        loading,
        processingTime: endTime - startTime
      });
    }

    setTestResults(results);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🧪 Prueba del Sistema de Cache de Documentos
          </h1>

          {/* Información del cache */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">Estado del Cache</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-blue-700 font-medium">Entradas en cache:</span>
                <span className="ml-2 text-blue-900">{cacheSize}</span>
              </div>
              <div>
                <button
                  onClick={clearCache}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Limpiar Cache
                </button>
              </div>
            </div>
          </div>

          {/* Controles de prueba */}
          <div className="mb-6">
            <button
              onClick={runCacheTest}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Ejecutar Prueba de Cache</span>
            </button>
          </div>

          {/* Documentos de prueba */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Documentos de Prueba</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testDocuments.map((doc) => {
                const viewerType = getViewerType(doc);
                const canPreview = shouldShowPreview(doc);
                
                return (
                  <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{doc.titulo}</h3>
                      <span className={`px-2 py-1 text-xs rounded ${
                        canPreview ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {viewerType.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{doc.descripcion}</p>
                    <div className="text-xs text-gray-500">
                      <div>Tipo MIME: {doc.tipo_mime}</div>
                      <div>Previsualizable: {canPreview ? '✅ Sí' : '❌ No'}</div>
                      <div>Cargando: {isLoading(doc.id) ? '⏳ Sí' : '✅ No'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resultados de la prueba */}
          {testResults.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resultados de la Prueba</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Documento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo de Visor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Previsualizable
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        URL Directa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        URL Cacheada
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tiempo (ms)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {testResults.map((result, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {result.document}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 text-xs rounded ${
                            result.canPreview ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {result.viewerType.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.canPreview ? '✅ Sí' : '❌ No'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                          {result.directUrl}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                          {result.cachedUrl}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.processingTime}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Información técnica */}
          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">ℹ️ Información Técnica</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>PDFs e Imágenes:</strong> Se pueden previsualizar directamente en el navegador</li>
              <li>• <strong>Otros archivos:</strong> Se descargan automáticamente al hacer clic en "Ver"</li>
              <li>• <strong>URLs de S3:</strong> Se usan directamente sin validación adicional</li>
              <li>• <strong>URLs locales:</strong> Se validan antes de usar y se cachean por 5 minutos</li>
              <li>• <strong>Cache:</strong> Se almacena en localStorage y expira automáticamente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 