/**
 * Archivo índice para componentes del administrador de documentos
 * Facilita las importaciones centralizadas
 */

export { default as FileUploader } from './FileUploader';
export { default as CategoryManager } from './CategoryManager';
export { default as TagManager } from './TagManager';
export { default as DocumentManager } from './DocumentManager';

// Componentes de permisos
export { 
  DocumentPermissionGate, 
  useMultipleDocumentPermissions 
} from '../../components/PermissionGate'; 