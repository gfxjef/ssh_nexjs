'use client'

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import GradientCanvas from '../components/GradientCanvas';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faEye, faEyeSlash, faUser, faEnvelope, faBriefcase } from '@fortawesome/free-solid-svg-icons';

interface UserData {
  id: number;
  nombre: string;
  usuario: string;
  correo: string;
  cargo: string;
  grupo: string;
  rango: string;
}

export default function Configuracion() {
  const [user, setUser] = useState<UserData | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoaded(true);
    }, 100);

    // Verificar autenticación y obtener datos del usuario
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch (error) {
      console.error('Error al parsear datos de usuario:', error);
      router.push('/login');
    }

    return () => clearTimeout(timer);
  }, [router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Todos los campos son requeridos');
      setSuccessMessage('');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      setSuccessMessage('');
      return;
    }

    if (newPassword.length < 4) {
      setError('La nueva contraseña debe tener al menos 4 caracteres');
      setSuccessMessage('');
      return;
    }

    if (currentPassword === newPassword) {
      setError('La nueva contraseña debe ser diferente a la actual');
      setSuccessMessage('');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/auth/cambiar-password`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          currentPassword, 
          newPassword 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al cambiar la contraseña');
      }

      setSuccessMessage('Contraseña cambiada exitosamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

    } catch (err: any) {
      console.error('Error al cambiar contraseña:', err);
      setError(err.message || 'Error al procesar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center justify-center min-h-screen overflow-hidden transition-opacity duration-500 ease-in-out ${pageLoaded ? 'opacity-100' : 'opacity-0'}`}
    >
      <GradientCanvas />
      <div className="config-wrapper flex w-[1000px] max-w-[95%] min-h-[600px] bg-transparent rounded-xl shadow-2xl overflow-hidden z-10 my-8">
        {/* Info Panel */}
        <div className="info-panel relative flex-1 p-10 text-white hidden md:flex flex-col justify-center items-start rounded-l-xl"
             style={{ backgroundImage: "url('/people.webp')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div className="absolute inset-0 bg-black opacity-40 rounded-l-xl z-0"></div>
          <div className="relative z-10">
            <div className="logo mb-[80px]">
              <Image 
                src="/grupokossodo_blanco.png" 
                alt="Logo Grupo Kossodo"
                width={180}
                height={50}
                priority
              />
            </div>
            
            {/* Información del Usuario */}
            <div className="user-info mb-8">
              <h1 className="text-4xl font-bold mb-4 leading-tight">Configuración</h1>
              <div className="space-y-3">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faUser} className="mr-3 w-4 h-4" />
                  <span className="text-sm">{user.nombre}</span>
                </div>
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faEnvelope} className="mr-3 w-4 h-4" />
                  <span className="text-sm">{user.correo}</span>
                </div>
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faBriefcase} className="mr-3 w-4 h-4" />
                  <span className="text-sm">{user.cargo}</span>
                </div>
              </div>
            </div>
            <p className="text-base leading-relaxed">Personaliza tu configuración de seguridad.</p>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="config-panel flex-1 p-8 sm:p-12 flex flex-col justify-center bg-white/70 backdrop-blur-md rounded-r-xl md:rounded-l-none rounded-l-xl">
          <div className="w-full">
            <h2 className="text-3xl font-semibold text-[#3C4262] mb-7 text-left">Cambiar Contraseña</h2>
            
            {error && <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>}
            {successMessage && <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded-md">{successMessage}</div>}
            
            <form onSubmit={handlePasswordChange} className="space-y-5">
              {/* Contraseña Actual */}
              <div className="input-group relative">
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-600 mb-2">
                  Contraseña Actual
                </label>
                <FontAwesomeIcon icon={faLock} className="absolute left-3 top-1/2 transform -translate-y-1/2 mt-3 text-[#6CBA9D] text-sm" />
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  id="currentPassword"
                  name="currentPassword"
                  placeholder="••••••••••"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full py-3 px-4 pl-10 pr-12 border border-gray-300 rounded-lg box-border text-sm text-gray-800 bg-white/80 focus:ring-2 focus:ring-[#6CBA9D] focus:border-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-3 text-gray-400 hover:text-[#6CBA9D]"
                >
                  <FontAwesomeIcon icon={showCurrentPassword ? faEyeSlash : faEye} className="text-sm" />
                </button>
              </div>

              {/* Nueva Contraseña */}
              <div className="input-group relative">
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-600 mb-2">
                  Nueva Contraseña
                </label>
                <FontAwesomeIcon icon={faLock} className="absolute left-3 top-1/2 transform -translate-y-1/2 mt-3 text-[#6CBA9D] text-sm" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  name="newPassword"
                  placeholder="••••••••••"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full py-3 px-4 pl-10 pr-12 border border-gray-300 rounded-lg box-border text-sm text-gray-800 bg-white/80 focus:ring-2 focus:ring-[#6CBA9D] focus:border-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-3 text-gray-400 hover:text-[#6CBA9D]"
                >
                  <FontAwesomeIcon icon={showNewPassword ? faEyeSlash : faEye} className="text-sm" />
                </button>
              </div>

              {/* Confirmar Nueva Contraseña */}
              <div className="input-group relative">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-600 mb-2">
                  Confirmar Nueva Contraseña
                </label>
                <FontAwesomeIcon icon={faLock} className="absolute left-3 top-1/2 transform -translate-y-1/2 mt-3 text-[#6CBA9D] text-sm" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="••••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full py-3 px-4 pl-10 pr-12 border border-gray-300 rounded-lg box-border text-sm text-gray-800 bg-white/80 focus:ring-2 focus:ring-[#6CBA9D] focus:border-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-3 text-gray-400 hover:text-[#6CBA9D]"
                >
                  <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} className="text-sm" />
                </button>
              </div>

              {/* Información de seguridad */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Recomendaciones de seguridad:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Usa al menos 8 caracteres</li>
                  <li>• Incluye letras mayúsculas y minúsculas</li>
                  <li>• Agrega números y símbolos</li>
                  <li>• No uses información personal</li>
                </ul>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#6CBA9D] text-white py-3.5 px-5 border-none rounded-lg cursor-pointer text-base font-semibold transition-colors duration-300 ease-in-out hover:bg-[#5aa085] disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isLoading ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
              </button>
            </form>
            
            <div className="back-to-dashboard text-center mt-6">
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); handleBackToDashboard(); }} 
                className="text-gray-600 text-sm hover:underline"
              >
                Volver al dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 