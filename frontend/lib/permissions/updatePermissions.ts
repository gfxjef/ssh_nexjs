import { menuAccessManager } from './MenuAccessManager';

/**
 * Actualiza los permisos para un menú o botón específico.
 * Si el permiso ya existe, lo sobrescribe. Si no existe, lo crea.
 * 
 * @param permissionId - ID del permiso (ruta del menú o ID del botón)
 * @param roles - Array de roles que tienen acceso
 * @param type - Tipo de permiso: 'menu' o 'button'
 */
export function updatePermission(
  permissionId: string, 
  roles: string[], 
  type: 'menu' | 'button' = 'menu'
): boolean {
  try {
    // Convertir a minúsculas para consistencia
    const normalizedRoles = roles.map(role => role.toLowerCase());
    
    // @ts-ignore - Estamos accediendo a propiedades privadas pero es nuestra propia clase
    if (type === 'menu') {
      // @ts-ignore
      menuAccessManager.permissions[permissionId] = normalizedRoles;
    } else {
      // @ts-ignore
      menuAccessManager.buttonPermissions[permissionId] = normalizedRoles;
    }
    
    console.log(`Permiso actualizado: ${permissionId} para roles ${normalizedRoles.join(', ')}`);
    return true;
  } catch (error) {
    console.error(`Error al actualizar permiso ${permissionId}:`, error);
    return false;
  }
}

/**
 * Elimina un permiso específico.
 * 
 * @param permissionId - ID del permiso a eliminar
 * @param type - Tipo de permiso: 'menu' o 'button'
 */
export function removePermission(
  permissionId: string,
  type: 'menu' | 'button' = 'menu'
): boolean {
  try {
    // @ts-ignore - Estamos accediendo a propiedades privadas pero es nuestra propia clase
    if (type === 'menu') {
      // @ts-ignore
      delete menuAccessManager.permissions[permissionId];
    } else {
      // @ts-ignore
      delete menuAccessManager.buttonPermissions[permissionId];
    }
    
    console.log(`Permiso eliminado: ${permissionId}`);
    return true;
  } catch (error) {
    console.error(`Error al eliminar permiso ${permissionId}:`, error);
    return false;
  }
} 