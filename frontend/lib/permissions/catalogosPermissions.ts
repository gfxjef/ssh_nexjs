import { usePermissions } from './PermissionsContext';

/**
 * Hook personalizado para gestionar permisos específicos de catálogos
 */
export const useCatalogosPermissions = () => {
  const { hasButtonAccess, hasMenuAccess, userRole } = usePermissions();

  return {
    // Permisos básicos de visualización
    canViewCatalogos: () => hasButtonAccess('catalogos.view'),
    canAccessCatalogosMenu: () => hasMenuAccess('Marketing/Catalogos'),
    
    // Permisos de gestión de catálogos
    canDownloadCatalogos: () => hasButtonAccess('catalogos.download'),
    canShareCatalogos: () => hasButtonAccess('catalogos.share'),
    canReportCatalogos: () => hasButtonAccess('catalogos.report'),
    
    // Permisos de administración (solo admin)
    canAddCatalogos: () => hasButtonAccess('catalogos.add'),
    canUpdateCatalogos: () => hasButtonAccess('catalogos.update'),
    canDeleteCatalogos: () => hasButtonAccess('catalogos.delete'),
    
    // Helper para verificar si es admin completo
    isAdmin: () => userRole === 'admin',
    
    // Helper para verificar si puede gestionar catálogos
    canManageCatalogos: () => hasButtonAccess('catalogos.update') || hasButtonAccess('catalogos.delete') || hasButtonAccess('catalogos.add'),
    
    // Obtener el rol actual
    getCurrentRole: () => userRole
  };
};

/**
 * Definición de permisos por rol para catálogos
 */
export const CATALOGOS_PERMISSIONS = {
  admin: {
    view: true,
    add: true,
    update: true,
    delete: true,
    download: true,
    share: true,
    report: true
  },
  gerente: {
    view: true,
    add: false,
    update: false,
    delete: false,
    download: true,
    share: true,
    report: true
  },
  marketing: {
    view: true,
    add: false,
    update: false,
    delete: false,
    download: true,
    share: true,
    report: true
  },
  vendedor: {
    view: true,
    add: false,
    update: false,
    delete: false,
    download: true,
    share: true,
    report: true
  },
  asesor: {
    view: true,
    add: false,
    update: false,
    delete: false,
    download: true,
    share: true,
    report: true
  },
  rrhh: {
    view: true,
    add: false,
    update: false,
    delete: false,
    download: true,
    share: true,
    report: true
  }
} as const;

/**
 * Función helper para verificar permisos basados en rol
 */
export const checkCatalogoPermission = (userRole: string | null, permission: string): boolean => {
  if (!userRole) return false;
  
  const rolePermissions = CATALOGOS_PERMISSIONS[userRole.toLowerCase() as keyof typeof CATALOGOS_PERMISSIONS];
  if (!rolePermissions) return false;
  
  return rolePermissions[permission as keyof typeof rolePermissions] || false;
}; 