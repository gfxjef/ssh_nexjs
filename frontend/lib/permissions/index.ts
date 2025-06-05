// Exportamos todo lo necesario para el sistema de permisos

// Gestor principal
export { menuAccessManager } from './MenuAccessManager';

// Contexto y hooks
export { 
  PermissionsProvider, 
  usePermissions, 
  WithPermission 
} from './PermissionsContext';

// Componentes
export { PermissionButton } from './PermissionButton';

// Utilidades
export { 
  updatePermission, 
  removePermission 
} from './updatePermissions';

// Permisos específicos de documentos
export { 
  useDocumentsPermissions,
  DOCUMENTS_PERMISSIONS,
  checkDocumentPermission
} from './documentsPermissions';

// Permisos específicos de catálogos
export { 
  useCatalogosPermissions,
  CATALOGOS_PERMISSIONS,
  checkCatalogoPermission
} from './catalogosPermissions'; 