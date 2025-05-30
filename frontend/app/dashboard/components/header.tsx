// Header component for dashboard
'use client'

import * as React from 'react';
import { useState, useEffect, ChangeEvent, FocusEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePermissions } from '@/lib/permissions/PermissionsContext';
import { WithPermission } from '@/lib/permissions/PermissionsContext';
import { navItemsConfig } from './sidebar';
import { logout } from '@/lib/auth-utils';

// Definir un tipo para los items de navegación (simplificado)
interface NavItem {
  name: string;
  href?: string;
  icon?: React.ReactElement;
  submenus?: NavItem[];
  children?: NavItem[]; // Para los agrupadores (isGrouper)
  isGrouper?: boolean;
}

// Tipo para los resultados de búsqueda
interface SearchResult extends NavItem {
  // Podríamos añadir más campos si es necesario, como la ruta completa para mostrarla.
}

export default function Header() {
  const { userRole } = usePermissions();
  const [user, setUser] = useState<{ nombre?: string; username: string; rango?: string; cargo?: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState(3); // Ejemplo de contador de notificaciones
  const router = useRouter();

  // Estados para la búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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
    // Usar la nueva función de logout que limpia todo
    logout();
    
    // Redirigir al login
    router.push('/login');
  };

  // Función para aplanar y filtrar navItemsConfig
  const filterNavItems = (items: NavItem[], term: string): SearchResult[] => {
    const results: SearchResult[] = [];
    const lowerCaseTerm = term.toLowerCase();

    const recurseFilter = (navItems: NavItem[], currentPathPrefix: string = '') => {
      for (const item of navItems) {
        const itemNameLower = item.name.toLowerCase();
        // Construir una ruta tentativa para mostrar, aunque la búsqueda sea solo por nombre
        const itemPathForDisplay = item.href || (currentPathPrefix ? `${currentPathPrefix} > ${item.name}` : item.name);

        if (itemNameLower.includes(lowerCaseTerm)) {
          // Añadir el item si tiene un href o es un agrupador sin href directo pero coincide
          if (item.href || !item.submenus?.length) { // Considerar items directos o groupers que coincidan
             results.push({ ...item, name: itemPathForDisplay }); // Usar itemPathForDisplay para el nombre en resultados
          }
        }

        const nextPathPrefix = currentPathPrefix ? `${currentPathPrefix} > ${item.name}` : item.name;

        if (item.submenus) {
          recurseFilter(item.submenus, nextPathPrefix);
        }
        if (item.children) { // Para la estructura de 'isGrouper'
          recurseFilter(item.children, nextPathPrefix);
        }
      }
    };

    recurseFilter(items);
    // Eliminar duplicados basados en href o nombre si no hay href (para evitar listar un agrupador y sus hijos si todos coinciden)
    // Esta es una simplificación, una lógica más robusta podría ser necesaria.
    const uniqueResults = results.filter((value, index, self) =>
        self.findIndex(r => (r.href && r.href === value.href) || (!r.href && r.name === value.name)) === index
    );
    return uniqueResults;
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    setSearchTerm(term);
    if (term.trim() === '') {
      setSearchResults([]);
    } else {
      // Aquí asumimos que navItemsConfig está disponible
      const filtered = filterNavItems(navItemsConfig as NavItem[], term); // Type assertion
      setSearchResults(filtered);
    }
  };
  
  const handleSearchFocus = () => {
    setIsSearchFocused(true);
  };

  // Cerrar resultados si se hace clic fuera
  const handleSearchBlur = (event: FocusEvent<HTMLDivElement>) => {
    // Si el nuevo foco está dentro del div de resultados, no cerrar
    if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    // Retraso para permitir clic en el resultado
    setTimeout(() => {
        setIsSearchFocused(false);
    }, 100);
  };

  const handleResultClick = () => {
    setSearchTerm('');
    setSearchResults([]);
    setIsSearchFocused(false);
  };

  return (
    // Header principal: fondo blanco, redondeado, con sombra y margen inferior
    <header className="bg-white shadow-lg rounded-xl mx-4 sm:mx-6 lg:mx-8 my-4 z-20">
      <div className="flex justify-between items-center py-3 px-4 sm:px-6 lg:px-8">
        {/* Lado Izquierdo del Header: Barra de Búsqueda */}
        <div className="flex-1 max-w-md relative" onBlur={handleSearchBlur}>
          <div className="relative text-gray-400 focus-within:text-[#d48b45]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input 
              type="search" 
              name="search" 
              placeholder="Buscador de secciones" 
              className="block w-full py-2.5 pl-10 pr-3 text-sm text-gray-700 placeholder-gray-400 bg-white border border-transparent rounded-lg focus:outline-none focus:bg-white transition-colors duration-200"
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
            />
          </div>
          {isSearchFocused && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30">
              <ul>
                {searchResults.map((result, index) => (
                  <li key={result.href || index} className="text-sm text-gray-700 hover:bg-gray-100">
                    {result.href ? (
                      <Link href={result.href} onClick={handleResultClick} className="block px-4 py-2">
                          {result.icon && <span className="mr-2 align-middle">{result.icon}</span>}
                          {result.name}
                      </Link>
                    ) : (
                      // Para items sin href (categorías principales que solo agrupan)
                      <span className="block px-4 py-2 text-gray-500">
                        {result.icon && <span className="mr-2 align-middle">{result.icon}</span>}
                        {result.name} (Categoría)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {isSearchFocused && searchTerm.length > 0 && searchResults.length === 0 && (
             <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-2 px-4 z-30">
                <p className="text-sm text-gray-500">No se encontraron resultados para "{searchTerm}".</p>
             </div>
          )}
        </div>

        {/* Lado Derecho del Header: Notificaciones y Usuario */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Notifications button */}
          <WithPermission permissionId="ver-notificaciones" type="button">
            <button className="relative p-2 text-gray-500 hover:text-[#d48b45] rounded-full hover:bg-gray-100 transition-colors duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifications > 0 && (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-[#d48b45] rounded-full">
                  {notifications}
                </span>
              )}
            </button>
          </WithPermission>

          {/* User dropdown */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center pl-1 pr-2 py-1 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-transparent transition-colors duration-200"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className="flex items-center">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d48b45] to-[#be7b3d] flex items-center justify-center text-white text-sm font-semibold shadow-sm border-2 border-white">
                  {user?.nombre?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="ml-2 flex flex-col items-start"> {/* Cambiado a items-start para alineación natural con avatar */}
                  <span className="text-sm font-medium text-gray-800">
                    {user?.nombre || user?.username || 'Usuario'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {user?.cargo || user?.rango || 'Sin cargo'}
                  </span>
                </div>
              </div>
              
              {/* Dropdown arrow */}
              <svg
                className={`w-5 h-5 ml-1 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'transform rotate-180' : ''}`}
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
              <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl bg-white ring-1 ring-white ring-opacity-5 py-1 z-50">
                <a
                  href="#perfil"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                  role="menuitem"
                >
                  Mi Perfil
                </a>
                
                                <Link                  href="/configuracion"                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"                  role="menuitem"                  onClick={() => setDropdownOpen(false)}                >                  Configuración                </Link>
                
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
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
