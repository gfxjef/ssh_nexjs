// Header component for dashboard
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [user, setUser] = useState<{ nombre?: string; username: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState(3); // Ejemplo de contador de notificaciones
  const router = useRouter();

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }
  }, []);

  const handleLogout = () => {
    // Clear token and user from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to login page
    router.push('/login');
  };

  return (
    <header className="bg-[#2e3954] shadow-lg border-b border-[#8dbba3] border-opacity-20 z-10">
      <div className="px-4 py-3 sm:px-6 lg:px-8 flex justify-between items-center">
        <h1 className="text-lg font-semibold text-white">Dashboard</h1>
        
        <div className="flex items-center space-x-4">
          {/* Notifications button */}
          <button className="relative p-2 text-[#8dbba3] hover:text-white rounded-full hover:bg-[#3a4665] transition-colors duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifications > 0 && (
              <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-[#d48b45] rounded-full">
                {notifications}
              </span>
            )}
          </button>

          {/* Help button */}
          <button className="p-2 text-[#8dbba3] hover:text-white rounded-full hover:bg-[#3a4665] transition-colors duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          {/* User dropdown */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center px-3 py-2 text-sm font-medium text-white rounded-md hover:bg-[#3a4665] focus:outline-none focus:ring-2 focus:ring-[#d48b45] transition-colors duration-200"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className="flex items-center">
                {/* Avatar placeholder */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d48b45] to-[#be7b3d] flex items-center justify-center text-white shadow-md">
                  {user?.nombre?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="ml-2">{user?.nombre || user?.username || 'Usuario'}</span>
              </div>
              
              {/* Dropdown arrow */}
              <svg
                className={`w-5 h-5 ml-2 text-[#8dbba3] transition-transform duration-200 ${dropdownOpen ? 'transform rotate-180' : ''}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl bg-[#2e3954] border border-[#8dbba3] border-opacity-20 ring-1 ring-black ring-opacity-5 py-1 z-50">
                <a
                  href="#perfil"
                  className="block px-4 py-2 text-sm text-white hover:bg-[#3a4665] transition-colors duration-150"
                  role="menuitem"
                >
                  Mi Perfil
                </a>
                <a
                  href="#configuracion"
                  className="block px-4 py-2 text-sm text-white hover:bg-[#3a4665] transition-colors duration-150"
                  role="menuitem"
                >
                  Configuración
                </a>
                <div className="border-t border-[#8dbba3] border-opacity-20 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[#3a4665] transition-colors duration-150"
                  role="menuitem"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
