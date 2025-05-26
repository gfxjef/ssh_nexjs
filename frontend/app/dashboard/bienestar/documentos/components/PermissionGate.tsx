'use client';

import React from 'react';
import { useDocumentsPermissions } from '@/lib/permissions';

interface PermissionGateProps {
  permission: 'view' | 'upload' | 'edit' | 'delete' | 'admin' | 'download' | 'createCategories' | 'editCategories' | 'deleteCategories' | 'createTags' | 'editTags' | 'deleteTags';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAll?: boolean; // Si se pasan múltiples permisos, requiere todos
}

/**
 * Componente que controla la visibilidad de elementos basado en permisos de documentos
 */
export const DocumentPermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  children,
  fallback = null,
  requireAll = false
}) => {
  const permissions = useDocumentsPermissions();

  const checkPermission = (perm: string): boolean => {
    switch (perm) {
      case 'view':
        return permissions.canViewDocuments();
      case 'upload':
        return permissions.canUploadDocuments();
      case 'edit':
        return permissions.canEditDocuments();
      case 'delete':
        return permissions.canDeleteDocuments();
      case 'admin':
        return permissions.canAccessAdmin();
      case 'download':
        return permissions.canDownloadDocuments();
      case 'createCategories':
        return permissions.canCreateCategories();
      case 'editCategories':
        return permissions.canEditCategories();
      case 'deleteCategories':
        return permissions.canDeleteCategories();
      case 'createTags':
        return permissions.canCreateTags();
      case 'editTags':
        return permissions.canEditTags();
      case 'deleteTags':
        return permissions.canDeleteTags();
      default:
        return false;
    }
  };

  const hasPermission = checkPermission(permission);

  if (hasPermission) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * Hook para verificar múltiples permisos de documentos
 */
export const useMultipleDocumentPermissions = (permissions: string[], requireAll = false) => {
  const documentPermissions = useDocumentsPermissions();

  const checkMultiplePermissions = (): boolean => {
    const results = permissions.map(permission => {
      switch (permission) {
        case 'view':
          return documentPermissions.canViewDocuments();
        case 'upload':
          return documentPermissions.canUploadDocuments();
        case 'edit':
          return documentPermissions.canEditDocuments();
        case 'delete':
          return documentPermissions.canDeleteDocuments();
        case 'admin':
          return documentPermissions.canAccessAdmin();
        case 'download':
          return documentPermissions.canDownloadDocuments();
        case 'createCategories':
          return documentPermissions.canCreateCategories();
        case 'editCategories':
          return documentPermissions.canEditCategories();
        case 'deleteCategories':
          return documentPermissions.canDeleteCategories();
        case 'createTags':
          return documentPermissions.canCreateTags();
        case 'editTags':
          return documentPermissions.canEditTags();
        case 'deleteTags':
          return documentPermissions.canDeleteTags();
        default:
          return false;
      }
    });

    return requireAll ? results.every(result => result) : results.some(result => result);
  };

  return {
    hasPermission: checkMultiplePermissions(),
    permissions: documentPermissions
  };
};

export default DocumentPermissionGate; 