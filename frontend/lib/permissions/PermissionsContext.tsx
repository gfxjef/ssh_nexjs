'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { menuAccessManager } from './MenuAccessManager';

// Interfaz para el contexto
interface PermissionsContextType {
  userRole: string | null;
  hasMenuAccess: (menuPath: string) => boolean;
  hasButtonAccess: (buttonId: string) => boolean;
}

// Crear contexto con valores por defecto
const PermissionsContext = createContext<PermissionsContextType>({
  userRole: null,
  hasMenuAccess: () => false,
  hasButtonAccess: () => false,
});

// Hook personalizado para usar el contexto
export const usePermissions = () => useContext(PermissionsContext);

// Proveedor del contexto
interface PermissionsProviderProps {
  children: ReactNode;
}

export const PermissionsProvider: React.FC<PermissionsProviderProps> = ({ children }) => {
  const [userRole, setUserRole] = useState<string | null>(null);

  // Cargar el rol del usuario desde localStorage al montar el componente
  useEffect(() => {
    const loadUserRole = () => {
      try {
        const userJson = localStorage.getItem('user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          const role = userData.rango || 'invitado';
          
          // Actualizar el rol en el gestor de permisos
          menuAccessManager.setUserRole(role);
          setUserRole(role);
          console.log('Role loaded from localStorage:', role);
        }
      } catch (error) {
        console.error('Error loading user role:', error);
      }
    };

    // Cargar inmediatamente
    loadUserRole();

    // También configurar un listener para cambios en localStorage (cuando el usuario inicia sesión)
    const handleStorageChange = () => {
      loadUserRole();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Limpiar listener
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Verificar acceso a menús
  const hasMenuAccess = (menuPath: string): boolean => {
    return menuAccessManager.hasAccess(menuPath);
  };

  // Verificar acceso a botones
  const hasButtonAccess = (buttonId: string): boolean => {
    return menuAccessManager.hasButtonAccess(buttonId);
  };

  // Valores que provee el contexto
  const contextValue: PermissionsContextType = {
    userRole,
    hasMenuAccess,
    hasButtonAccess,
  };

  return (
    <PermissionsContext.Provider value={contextValue}>
      {children}
    </PermissionsContext.Provider>
  );
};

// Componente HOC para proteger botones y elementos de UI
interface WithPermissionProps {
  permissionId: string;
  children: ReactNode;
  fallback?: ReactNode;
  type: 'button' | 'menu';
}

export const WithPermission: React.FC<WithPermissionProps> = ({ 
  permissionId, 
  children, 
  fallback = null,
  type = 'button'
}) => {
  const { hasMenuAccess, hasButtonAccess } = usePermissions();
  
  const hasAccess = type === 'menu' 
    ? hasMenuAccess(permissionId)
    : hasButtonAccess(permissionId);
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}; 