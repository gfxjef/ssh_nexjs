import { usePermissions } from './PermissionsContext';

/**
 * Hook personalizado para gestionar permisos específicos de documentos
 */
export const useDocumentsPermissions = () => {
  const { hasButtonAccess, hasMenuAccess, userRole } = usePermissions();

  return {
    // Permisos básicos de visualización
    canViewDocuments: () => hasButtonAccess('documents.view'),
    canAccessDocumentsMenu: () => hasMenuAccess('Bienestar y Talento/Documentos'),
    
    // Permisos de gestión de archivos
    canUploadDocuments: () => hasButtonAccess('documents.upload'),
    canDownloadDocuments: () => hasButtonAccess('documents.download'),
    canEditDocuments: () => hasButtonAccess('documents.edit'),
    canDeleteDocuments: () => hasButtonAccess('documents.delete'),
    
    // Permisos de administración
    canAccessAdmin: () => hasButtonAccess('documents.admin'),
    canAccessAdminMenu: () => hasMenuAccess('Bienestar y Talento/Documentos/Administrador'),
    
    // Permisos de categorías
    canCreateCategories: () => hasButtonAccess('documents.create-category'),
    canEditCategories: () => hasButtonAccess('documents.edit-category'),
    canDeleteCategories: () => hasButtonAccess('documents.delete-category'),
    
    // Permisos de etiquetas
    canCreateTags: () => hasButtonAccess('documents.create-tag'),
    canEditTags: () => hasButtonAccess('documents.edit-tag'),
    canDeleteTags: () => hasButtonAccess('documents.delete-tag'),
    
    // Helper para verificar si es admin completo
    isAdmin: () => userRole === 'admin',
    
    // Helper para verificar si puede gestionar contenido
    canManageContent: () => hasButtonAccess('documents.edit') || hasButtonAccess('documents.admin'),
    
    // Obtener el rol actual
    getCurrentRole: () => userRole
  };
};

/**
 * Definición de permisos por rol para documentos
 */
export const DOCUMENTS_PERMISSIONS = {
  admin: {
    view: true,
    upload: true,
    edit: true,
    delete: true,
    admin: true,
    download: true,
    manageCategories: true,
    manageTags: true
  },
  gerente: {
    view: true,
    upload: false,
    edit: false,
    delete: false,
    admin: false,
    download: true,
    manageCategories: false,
    manageTags: false
  },
  rrhh: {
    view: true,
    upload: true,
    edit: true,
    delete: false,
    admin: true,
    download: true,
    manageCategories: true,
    manageTags: true
  },
  atencion: {
    view: true,
    upload: true,
    edit: false,
    delete: false,
    admin: false,
    download: true,
    manageCategories: false,
    manageTags: false
  }
} as const;

/**
 * Función helper para verificar permisos basados en rol
 */
export const checkDocumentPermission = (userRole: string | null, permission: string): boolean => {
  if (!userRole) return false;
  
  const rolePermissions = DOCUMENTS_PERMISSIONS[userRole.toLowerCase() as keyof typeof DOCUMENTS_PERMISSIONS];
  if (!rolePermissions) return false;
  
  return rolePermissions[permission as keyof typeof rolePermissions] || false;
}; 