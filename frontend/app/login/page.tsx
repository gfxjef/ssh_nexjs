// Login page component
'use client'

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!usuario || !pass) {
      setError('Usuario y contraseña son requeridos');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Construir la URL completa usando la variable de entorno
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/auth/login`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usuario, pass }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error de autenticación');
      }
      
      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.usuario));
      console.log('Login exitoso:', data);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error de login:', err);
      setError(err.message || 'Credenciales inválidas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Iniciar Sesión
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Ingrese sus credenciales para acceder al dashboard
          </p>
        </div>
        
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="usuario" className="block text-sm font-medium text-gray-700">
                Usuario
              </label>
              <input
                id="usuario"
                name="usuario"
                type="text"
                autoComplete="username"
                required
                className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm text-gray-800 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="admin"
              />
            </div>
            
            <div>
              <label htmlFor="pass" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                id="pass"
                name="pass"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm text-gray-800 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="admin!1"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Iniciando sesión...' : 'Ingresar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
