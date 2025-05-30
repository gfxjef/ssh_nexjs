'use client';

import React from 'react';
import Link from 'next/link';

export default function TestLoginPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🧪 Test de Redirección Login (MEJORADO)
          </h1>
          
          <div className="space-y-4 mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-green-900 mb-3">✅ Mejoras Implementadas:</h2>
              <div className="text-left space-y-1 text-sm text-green-800">
                <p>• Cambió router.push() por window.location.href</p>
                <p>• Mejoró el establecimiento de cookies (SameSite=Lax)</p>
                <p>• Agregó verificación de cookies antes de redirigir</p>
                <p>• Mejoró logs del middleware para mejor debugging</p>
                <p>• Aumentó timeout de redirección a 200ms</p>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-900 mb-3">🔍 Casos de Prueba:</h2>
              <div className="text-left space-y-2 text-sm">
                <p><strong>1. Login directo:</strong> No debe mostrar mensaje de redirección</p>
                <p><strong>2. Login con returnUrl:</strong> Debe mostrar mensaje y redirigir correctamente</p>
                <p><strong>3. Acceso directo a rutas protegidas:</strong> Debe redirigir al login con returnUrl</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Login directo */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">1. Login Directo</h3>
              <p className="text-sm text-gray-600 mb-4">
                Debe ir al dashboard sin mensaje especial
              </p>
              <Link 
                href="/login"
                className="block w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Ir a Login Directo
              </Link>
            </div>
            
            {/* Login con returnUrl */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">2. Login con ReturnUrl</h3>
              <p className="text-sm text-gray-600 mb-4">
                Debe mostrar mensaje y redirigir a posts
              </p>
              <Link 
                href="/login?returnUrl=%2Fdashboard%2Fbienestar%2Fposts%2F32"
                className="block w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Login con ReturnUrl
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Link 
              href="/dashboard/bienestar/posts/32"
              className="block bg-purple-500 text-white py-3 px-4 rounded-lg hover:bg-purple-600 transition-colors font-medium"
            >
              Test: Posts/32 (sin login)
            </Link>
            
            <Link 
              href="/dashboard/bienestar/documentos"
              className="block bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Test: Documentos (sin login)
            </Link>
            
            <Link 
              href="/dashboard"
              className="block bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Test: Dashboard (sin login)
            </Link>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-amber-900 mb-3">📋 Instrucciones de Prueba:</h3>
            <div className="text-xs text-amber-800 space-y-1 text-left">
              <p><strong>1.</strong> Abre las DevTools del navegador (F12) y ve a la pestaña "Console"</p>
              <p><strong>2.</strong> Limpia las cookies/localStorage (Application → Storage → Clear)</p>
              <p><strong>3.</strong> Haz clic en cualquiera de los botones de prueba arriba</p>
              <p><strong>4.</strong> Observa los logs en la consola para ver el flujo completo</p>
              <p><strong>5.</strong> Verifica que la redirección funcione correctamente</p>
            </div>
          </div>
          
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">🔑 Credenciales de Prueba:</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Usuario:</strong> admin</p>
              <p><strong>Contraseña:</strong> admin!1</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 