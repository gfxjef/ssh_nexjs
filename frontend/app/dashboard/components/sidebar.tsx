// Sidebar component for dashboard
'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Navigation items with submenus
const navItems = [
  {
    name: 'Marketing',
    icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z',
    submenus: [
      { name: 'Inventario', href: '/dashboard/marketing/inventario', isGrouper: true, children: [
        { name: 'Agregar/Consultar', href: '/dashboard/marketing/inventario/agregar-consultar' }
      ]},
      { name: 'Merchandising', href: '/dashboard/marketing/merchandising', isGrouper: true, children: [
        { name: 'Solicitud', href: '/dashboard/marketing/merchandising/solicitud' },
        { name: 'Confirmación', href: '/dashboard/marketing/merchandising/confirmacion' },
        { name: 'Historial', href: '/dashboard/marketing/merchandising/historial' }
      ]},
      { name: 'Catálogos', href: '/dashboard/marketing/catalogos' }
    ],
  },
  {
    name: 'Ventas',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    submenus: [
      { name: 'Encuestas', href: '/dashboard/ventas/encuestas', isGrouper: true, children: [
        { name: 'Registro Calificaciones', href: '/dashboard/ventas/encuestas/calificaciones' }
      ]}
    ],
  },
  {
    name: 'Bienestar y Talento',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    submenus: [
      { name: 'Posts', href: '/dashboard/bienestar/posts' },
      { name: 'Administrar Posts', href: '/dashboard/bienestar/admin-posts' }
    ],
  },
  {
    name: 'Configuración',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    submenus: [],
  }
];

// Componente de mini calendario
const MiniCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<number[]>([]);
  const [monthYear, setMonthYear] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [events, setEvents] = useState<{[key: number]: number}>({
    8: 2,
    15: 1,
    22: 3
  });
  
  // Generar los días del calendario
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Establecer el primer día del mes actual
    const firstDay = new Date(year, month, 1);
    const firstDayIndex = firstDay.getDay(); // 0 = Domingo, 1 = Lunes, ...
    
    // Obtener el último día del mes actual
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Preparar el array de días
    const days = [];
    
    // Añadir los espacios en blanco para los días anteriores al primer día del mes
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(0); // 0 representa un espacio en blanco
    }
    
    // Añadir los días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    // Actualizar el estado
    setCalendarDays(days);
    setMonthYear(`${currentDate.toLocaleString('es-ES', { month: 'long' })} ${year}`);
    
    // Seleccionar el día actual si estamos en el mes actual
    const today = new Date();
    if (today.getMonth() === month && today.getFullYear() === year) {
      setSelectedDay(today.getDate());
    } else {
      setSelectedDay(null);
    }
  }, [currentDate]);
  
  // Cambiar al mes anterior
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  // Cambiar al mes siguiente
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  // Seleccionar un día
  const selectDay = (day: number) => {
    if (day > 0) {
      setSelectedDay(day);
    }
  };
  
  return (
    <div className="px-4 py-4 mt-auto">
      <div className="bg-[#3a4665] rounded-lg p-3 shadow-inner">
        {/* Header del calendario */}
        <div className="flex justify-between items-center mb-2">
          <button 
            onClick={prevMonth}
            className="p-1 rounded-full hover:bg-[#2e3954] text-[#8dbba3] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-xs font-medium text-white capitalize">{monthYear}</h3>
          <button 
            onClick={nextMonth}
            className="p-1 rounded-full hover:bg-[#2e3954] text-[#8dbba3] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, index) => (
            <div key={index} className="text-[10px] text-center text-[#8dbba3] font-medium">
              {day}
            </div>
          ))}
        </div>
        
        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            // Día actual
            const isToday = day === selectedDay;
            // Verificar si el día tiene eventos
            const hasEvents = events[day] > 0;
            
            return (
              <div 
                key={index} 
                className={`text-[11px] h-6 flex items-center justify-center relative ${
                  day === 0 ? 'text-transparent' : 'cursor-pointer'
                } ${
                  isToday 
                    ? 'bg-[#d48b45] text-white rounded-full' 
                    : 'text-white hover:bg-[#2e3954] rounded-full'
                }`}
                onClick={() => selectDay(day)}
              >
                {day > 0 ? day : ''}
                {hasEvents && !isToday && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#d48b45]"></span>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Próximos eventos */}
        {selectedDay && (
          <div className="mt-2 pt-2 border-t border-[#8dbba3] border-opacity-20">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] text-[#8dbba3] font-medium">Eventos {selectedDay} de {currentDate.toLocaleString('es-ES', { month: 'long' })}</h4>
              <span className="text-[10px] text-[#8dbba3]">{events[selectedDay] || 0} eventos</span>
            </div>
            {events[selectedDay] ? (
              <div className="mt-1">
                <div className="text-[11px] text-white py-1 px-2 rounded bg-[#2e3954] mb-1">
                  Reunión de equipo <span className="text-[#d48b45] ml-1">10:00 AM</span>
                </div>
                {events[selectedDay] > 1 && (
                  <div className="text-[11px] text-white py-1 px-2 rounded bg-[#2e3954]">
                    Entrega proyecto <span className="text-[#d48b45] ml-1">2:30 PM</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-[#8dbba3] opacity-75 mt-1">No hay eventos programados</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Handle search expand/collapse
  const toggleSearch = () => {
    setIsSearchExpanded(!isSearchExpanded);
    setTimeout(() => {
      if (!isSearchExpanded && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  // Close search when sidebar is collapsed
  useEffect(() => {
    if (collapsed && isSearchExpanded) {
      setIsSearchExpanded(false);
      setSearchQuery('');
    }
  }, [collapsed]);

  // Handle search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: any[] = [];

    // Search in main menu items
    navItems.forEach(item => {
      if (item.name.toLowerCase().includes(query)) {
        results.push({
          ...item,
          type: 'main',
          path: `/dashboard/${item.name.toLowerCase().replace(/\s+/g, '-')}`
        });
      }

      // Search in submenus
      item.submenus.forEach(submenu => {
        // Solo incluir submenús clicables (que no sean agrupadores)
        if (submenu.name.toLowerCase().includes(query) && !submenu.isGrouper) {
          results.push({
            name: submenu.name,
            parentName: item.name,
            type: 'submenu',
            path: submenu.href
          });
        }

        // Search in submenu children
        if (submenu.children) {
          submenu.children.forEach(child => {
            if (child.name.toLowerCase().includes(query)) {
              results.push({
                name: child.name,
                parentName: `${item.name} > ${submenu.name}`,
                type: 'child',
                path: child.href
              });
            }
          });
        }
      });
    });

    setFilteredItems(results);
  }, [searchQuery]);

  const toggleSubmenu = (menuName: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <div 
      className={`bg-[#2e3954] text-white h-screen transition-all duration-300 ease-in-out overflow-y-auto flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo and collapse button */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-opacity-20 border-[#8dbba3] sticky top-0 bg-[#2e3954] z-10">
        {!collapsed && (
          <span className="text-xl font-semibold text-white">PlataformaERP</span>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-[#3a4665] transition-colors"
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-6 h-6 text-[#8dbba3]" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Search Bar - Enhanced Design */}
      <div className="px-4 py-3 border-b border-opacity-20 border-[#8dbba3]">
        <div className="relative">
          <div 
            className={`flex items-center rounded-lg overflow-hidden ${
              collapsed ? 'justify-center' : (
                isSearchExpanded 
                  ? 'bg-gradient-to-r from-[#2e3954] to-[#3a4665] shadow-lg ring-1 ring-[#d48b45] ring-opacity-40' 
                  : ''
              )
            }`}
          >
            {/* Search Icon/Button */}
            <button 
              onClick={toggleSearch}
              className={`p-2 ${
                collapsed ? 'mx-auto' : 'rounded-lg'
              } ${
                isSearchExpanded && !collapsed 
                  ? 'text-[#d48b45]' 
                  : 'text-[#8dbba3] hover:text-[#d48b45] hover:bg-[#3a4665] rounded-lg'
              } transition-all duration-200 ease-in-out`}
              aria-label="Buscar en el menú"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-5 w-5 ${isSearchExpanded ? 'drop-shadow-lg' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                />
              </svg>
            </button>

            {/* Search Input - Only visible when expanded and not collapsed */}
            {!collapsed && (
              <div className={`flex-1 overflow-hidden transition-all duration-300 ease-in-out ${
                isSearchExpanded ? 'w-full opacity-100 ml-1' : 'w-0 opacity-0'
              }`}>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar menú..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className="w-full bg-transparent border-0 focus:ring-0 outline-none text-white placeholder-[#8dbba3] text-sm py-2 px-1"
                />
              </div>
            )}

            {/* Clear Button - Only visible when expanded with content */}
            {!collapsed && isSearchExpanded && searchQuery && (
              <button
                onClick={clearSearch}
                className="p-1.5 mr-1 text-[#8dbba3] hover:text-[#d48b45] rounded-full transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Search Results - Enhanced Design */}
          {!collapsed && isSearchExpanded && filteredItems.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-gradient-to-b from-[#2e3954] to-[#343f5e] rounded-lg shadow-xl py-2 z-20 max-h-60 overflow-y-auto border border-[#8dbba3] border-opacity-20">
              {filteredItems.map((item, index) => (
                <Link
                  key={`${item.type}-${item.name}-${index}`}
                  href={item.path}
                  className="block px-4 py-2.5 hover:bg-gradient-to-r from-[#d48b45] to-[#d48b45] hover:bg-opacity-20 transition-all duration-150"
                  onClick={clearSearch}
                >
                  <div className="text-white text-sm font-medium">{item.name}</div>
                  {item.type !== 'main' && (
                    <div className="text-[#8dbba3] text-xs flex items-center mt-0.5">
                      <svg className="w-3 h-3 mr-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {item.parentName}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation - Updated with new color scheme */}
      <nav className="mt-3 px-2 flex-1 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isMenuActive = pathname.startsWith(`/dashboard/${item.name.toLowerCase().replace(/\s+/g, '-')}`);
            const isExpanded = expandedMenus[item.name] || false;
            
            return (
              <div key={item.name} className="mb-2">
                {/* Main menu item */}
                <button
                  onClick={() => toggleSubmenu(item.name)}
                  className={`w-full group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    isMenuActive
                      ? 'bg-gradient-to-r from-[#d48b45] to-[#be7b3d] text-white shadow-md'
                      : 'text-white hover:bg-[#3a4665]'
                  }`}
                >
                  <div className="flex items-center">
                    <svg
                      className={`${
                        collapsed ? 'mr-0' : 'mr-3'
                      } h-6 w-6 ${
                        isMenuActive ? 'text-white' : 'text-[#8dbba3] group-hover:text-white'
                      } transition-colors duration-200`}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={item.icon}
                      />
                    </svg>
                    {!collapsed && <span>{item.name}</span>}
                  </div>
                  {!collapsed && item.submenus.length > 0 && (
                    <svg
                      className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`}
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
                  )}
                </button>

                {/* Submenus */}
                {!collapsed && isExpanded && item.submenus.length > 0 && (
                  <div className="mt-1 ml-8 space-y-1">
                    {item.submenus.map((submenu) => {
                      const isSubmenuActive = pathname.startsWith(submenu.href);
                      const hasActiveChild = submenu.children && submenu.children.some(child => pathname.startsWith(child.href));
                      const shouldHighlight = isSubmenuActive || (submenu.isGrouper && hasActiveChild);
                      
                      return (
                        <div key={submenu.name}>
                          {submenu.isGrouper ? (
                            // Para submenús que son agrupadores (no clicables)
                            <div
                              className={`group flex items-center pl-3 pr-2 py-2 text-sm font-medium rounded-md ${
                                shouldHighlight
                                  ? 'text-white bg-[#3a4665]'
                                  : 'text-[#8dbba3]'
                              }`}
                            >
                              <span className="flex items-center">
                                {submenu.name}
                                {/* Ícono para indicar que es un grupo */}
                                <svg 
                                  className={`h-4 w-4 ml-1.5 ${shouldHighlight ? 'text-white' : 'text-[#8dbba3]'}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24" 
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </span>
                            </div>
                          ) : (
                            // Para submenús normales (clicables)
                            <Link
                              href={submenu.href}
                              className={`group flex items-center pl-3 pr-2 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                                isSubmenuActive
                                  ? 'bg-gradient-to-r from-[#8dbba3] to-[#7daa93] text-white shadow-sm'
                                  : 'text-[#8dbba3] hover:bg-[#3a4665] hover:text-white'
                              }`}
                            >
                              {submenu.name}
                            </Link>
                          )}
                          
                          {/* Sub-submenus (children) */}
                          {submenu.children && submenu.children.length > 0 && (
                            <div className="ml-4 mt-1 space-y-1">
                              {submenu.children.map((child) => {
                                const isChildActive = pathname === child.href;
                                
                                return (
                                  <Link
                                    key={child.name}
                                    href={child.href}
                                    className={`group flex items-center pl-3 pr-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                                      isChildActive
                                        ? 'bg-[#8dbba3] bg-opacity-20 text-white'
                                        : 'text-[#8dbba3] hover:bg-[#3a4665] hover:text-white'
                                    }`}
                                  >
                                    {child.name}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Mini Calendar - Solo visible cuando el sidebar está expandido */}
      {!collapsed && <MiniCalendar />}
    </div>
  );
}
