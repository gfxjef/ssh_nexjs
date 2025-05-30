'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function TestRedirectPage() {
  const searchParams = useSearchParams();
  const fromUrl = searchParams?.get('from') || 'Acceso directo';

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Redirección Exitosa!
            </h1>
            <p className="text-gray-600 mb-4">
              Has sido redirigido correctamente después del login.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Origen:</strong> {fromUrl}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                URL actual: {typeof window !== 'undefined' ? window.location.href : '/test-redirect'}
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Link 
              href="/dashboard"
              className="block w-full bg-[#2e3954] text-white py-3 px-4 rounded-lg hover:bg-[#1e2633] transition-colors font-medium"
            >
              Ir al Dashboard
            </Link>
            
            <Link 
              href="/dashboard/bienestar/posts"
              className="block w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Ir a Posts de Bienestar
            </Link>
            
            <Link 
              href="/dashboard/bienestar/documentos"
              className="block w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              Ir a Documentos
            </Link>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Probar URLs protegidas sin login:</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• <code>/dashboard/bienestar/posts/32</code></p>
              <p>• <code>/dashboard/bienestar/documentos</code></p>
              <p>• <code>/dashboard/ventas</code></p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Estas URLs te redirigirán al login si no estás autenticado y luego de vuelta aquí.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 