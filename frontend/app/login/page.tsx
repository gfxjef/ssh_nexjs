// Login page component
'use client'

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import GradientCanvas from '../components/GradientCanvas'; // Importar el componente del canvas
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faEnvelope } from '@fortawesome/free-solid-svg-icons';

export default function Login() {
  const [credentials, setCredentials] = useState({
    usuario: '',
    pass: ''
  });
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const router = useRouter();
  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setError('');
    setSuccessMessage('');
  }, [isForgotPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('🔑 [LOGIN] Intentando login con:', credentials.usuario);
      
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [LOGIN] Login exitoso:', data);
        
        // Guardar token y datos del usuario en localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.usuario));
        
        // Redirigir al dashboard
        router.push('/dashboard');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al iniciar sesión');
        console.error('❌ [LOGIN] Error:', errorData);
      }
    } catch (error) {
      console.error('❌ [LOGIN] Error de red:', error);
      setError('Error de conexión. Verifica que el servidor esté funcionando.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {    e.preventDefault();    if (!recoveryEmail) {      setError('Correo electrónico es requerido');      setSuccessMessage('');      return;    }    setIsLoading(true);    setError('');    setSuccessMessage('');        try {      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/auth/recuperar-password`;            console.log('Solicitud de recuperación para:', recoveryEmail);            const response = await fetch(apiUrl, {        method: 'POST',        headers: { 'Content-Type': 'application/json' },        body: JSON.stringify({ email: recoveryEmail }),      });            const data = await response.json();            if (!response.ok) {        throw new Error(data.message || 'Error al enviar el correo de recuperación');      }            setSuccessMessage(data.message || `Se ha enviado un enlace de recuperación a ${recoveryEmail}.`);          } catch (err: any) {      console.error('Error en recuperación de contraseña:', err);      setError(err.message || 'Error al procesar la solicitud');    } finally {      setIsLoading(false);    }  };

  return (
    <div 
      className={`flex items-center justify-center min-h-screen overflow-hidden transition-opacity duration-500 ease-in-out ${pageLoaded ? 'opacity-100' : 'opacity-0'}`}
    >
      <GradientCanvas />
      <div className="login-wrapper flex w-[840px] max-w-[95%] min-h-[535px] bg-transparent rounded-xl shadow-2xl overflow-hidden z-10 my-8">
        {/* Info Panel */}
        <div className="info-panel relative flex-1 p-10 text-white hidden md:flex flex-col justify-center items-start rounded-l-xl"
             style={{ backgroundImage: "url('/people.webp')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div className="absolute inset-0 bg-black opacity-40 rounded-l-xl z-0"></div>
          <div className="relative z-10">
            <div className="logo mb-[120px]">
              <Image 
                src="/grupokossodo_blanco.png" 
                alt="Logo Grupo Kossodo"
                width={180}
                height={50}
                priority
              />
            </div>
            <h1 className="text-5xl font-bold mb-4 leading-tight">Hola,<br />Bienvenido!</h1>
            <p className="text-base leading-relaxed">Accede a la plataforma de intranet del Grupo Kossodo.</p>
          </div>
        </div>

        {/* Form Panel */}
        <div className="form-panel flex-1 p-8 sm:p-12 flex flex-col justify-center bg-white/70 backdrop-blur-md rounded-r-xl md:rounded-l-none rounded-l-xl">
          {!isForgotPassword ? (
            // Login View
            <div id="loginView" className="w-full">
              <h2 className="text-3xl font-semibold text-[#3C4262] mb-7 text-left">Iniciar sesión</h2>
              {error && <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>}
              {successMessage && <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded-md">{successMessage}</div>}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="input-group relative">
                  <label htmlFor="usuario" className="block text-sm font-medium text-gray-600 mb-2">Usuario o Correo</label>
                  <FontAwesomeIcon icon={faUser} className="absolute left-3 top-1/2 transform -translate-y-1/2 mt-3 text-[#6CBA9D] text-sm" />
                  <input
                    type="text"
                    id="usuario"
                    name="usuario"
                    placeholder="Ingresa tu usuario o correo"
                    required
                    value={credentials.usuario}
                    onChange={(e) => setCredentials(prev => ({ ...prev, usuario: e.target.value }))}
                    className="w-full py-3 px-4 pl-10 border border-gray-300 rounded-lg box-border text-sm text-gray-800 bg-white/80 focus:ring-2 focus:ring-[#6CBA9D] focus:border-transparent outline-none"
                  />
                </div>
                <div className="input-group relative">
                  <label htmlFor="pass" className="block text-sm font-medium text-gray-600 mb-2">Contraseña</label>
                  <FontAwesomeIcon icon={faLock} className="absolute left-3 top-1/2 transform -translate-y-1/2 mt-3 text-[#6CBA9D] text-sm" />
                  <input
                    type="password"
                    id="pass"
                    name="pass"
                    placeholder="Ingresa tu contraseña"
                    required
                    value={credentials.pass}
                    onChange={(e) => setCredentials(prev => ({ ...prev, pass: e.target.value }))}
                    className="w-full py-3 px-4 pl-10 border border-gray-300 rounded-lg box-border text-sm text-gray-800 bg-white/80 focus:ring-2 focus:ring-[#6CBA9D] focus:border-transparent outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#6CBA9D] text-white py-3.5 px-5 border-none rounded-lg cursor-pointer text-base font-semibold transition-colors duration-300 ease-in-out hover:bg-[#5aa085] disabled:opacity-50 disabled:cursor-not-allowed mt-2.5"
                >
                  {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </button>
              </form>
              <div className="forgot-password text-right mt-4">
                <a href="#" onClick={(e) => { e.preventDefault(); setIsForgotPassword(true); }} className="text-gray-600 text-xs hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>
          ) : (
            // Forgot Password View
            <div id="forgotPasswordView" className="w-full">
              <h2 className="text-3xl font-semibold text-[#3C4262] mb-7 text-left">Recuperar contraseña</h2>
              {error && <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>}
              {successMessage && <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded-md">{successMessage}</div>}
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
                <div className="input-group relative">
                  <label htmlFor="recoveryEmail" className="block text-sm font-medium text-gray-600 mb-2">Correo electrónico</label>
                  <FontAwesomeIcon icon={faEnvelope} className="absolute left-3 top-1/2 transform -translate-y-1/2 mt-3 text-[#6CBA9D] text-sm" />
                  <input
                    type="email"
                    id="recoveryEmail"
                    name="recoveryEmail"
                    placeholder="tu.correo@grupo.com"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="w-full py-3 px-4 pl-10 border border-gray-300 rounded-lg box-border text-sm text-gray-800 bg-white/80 focus:ring-2 focus:ring-[#6CBA9D] focus:border-transparent outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#6CBA9D] text-white py-3.5 px-5 border-none rounded-lg cursor-pointer text-base font-semibold transition-colors duration-300 ease-in-out hover:bg-[#5aa085] disabled:opacity-50 disabled:cursor-not-allowed mt-2.5"
                >
                  {isLoading ? 'Enviando enlace...' : 'Recuperar contraseña'}
                </button>
              </form>
              <div className="back-to-login text-center mt-5">
                <a href="#" onClick={(e) => { e.preventDefault(); setIsForgotPassword(false); }} className="text-gray-600 text-sm hover:underline">
                  Volver al inicio de sesión
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
