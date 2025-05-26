// Sistema de gestión de acceso a menús y botones basado en roles
// Adaptado de tu implementación anterior a TypeScript para Next.js

// Tipos para tipar adecuadamente las estructuras
type UserRole = 'admin' | 'gerente' | 'vendedor' | 'almacen' | 'asesor' | 'marketing' | 'rrhh' | 'atencion' | string;
type PermissionMap = Record<string, UserRole[]>;

export class MenuAccessManager {
  private permissions: PermissionMap = {};
  private buttonPermissions: PermissionMap = {};
  private userRole: UserRole | null = null;

  constructor() {
    this.initialize();
  }

  initialize(): void {
    try {
      // Permisos jerárquicos usando notación de ruta (menús)
      this.permissions = {
        // Menús principales
        'Marketing': ['admin', 'gerente', 'vendedor', 'almacen', 'asesor', 'marketing', 'rrhh'],
        'Ventas': ['admin', 'gerente', 'marketing'],
        'Bienestar y Talento': ['admin', 'gerente', 'rrhh', 'atencion', 'invitado', 'asesor'],
        'Configuración': ['admin'],
        
        // Submenús de Marketing
        'Marketing/Inventario': ['admin', 'gerente', 'almacen', 'marketing'],
        'Marketing/Merchandising': ['admin', 'gerente', 'vendedor', 'almacen', 'asesor', 'marketing'],
        'Marketing/Catalogos': ['admin', 'gerente', 'vendedor', 'asesor', 'marketing', 'rrhh'],
        
        // Submenús específicos de Marketing/Merchandising
        'Marketing/Merchandising/Solicitud': ['admin', 'gerente', 'vendedor', 'asesor', 'marketing'],
        'Marketing/Merchandising/Confirmación': ['admin', 'gerente', 'almacen', 'marketing'],
        'Marketing/Merchandising/Historial': ['admin', 'gerente', 'marketing'],
        
        // Submenús de Ventas
        'Ventas/Encuestas': ['admin', 'gerente', 'atencion'],
        'Ventas/Encuestas/Registro Calificaciones': ['admin', 'gerente', 'atencion', 'marketing'],
        
        // Submenús de Bienestar
        'Bienestar y Talento/Posts': ['admin', 'gerente', 'rrhh', 'invitado', 'asesor'],
        'Bienestar y Talento/Administrar Posts': ['admin', 'rrhh'],
        'Bienestar y Talento/Documentos': ['admin', 'gerente', 'rrhh', 'atencion'],
        'Bienestar y Talento/Documentos/Administrador': ['admin', 'rrhh']
      };
      
      // Permisos para botones específicos
      this.buttonPermissions = {
        'delete-pdf': ['admin'],
        'update-pdf': ['admin'],
        'add-post': ['admin', 'rrhh'],
        'edit-post': ['admin', 'rrhh'],
        'delete-post': ['admin'],
        
        // Permisos para documentos
        'documents.view': ['admin', 'gerente', 'rrhh', 'atencion'],
        'documents.upload': ['admin', 'rrhh', 'atencion'],
        'documents.edit': ['admin', 'rrhh'],
        'documents.delete': ['admin'],
        'documents.admin': ['admin', 'rrhh'],
        'documents.download': ['admin', 'gerente', 'rrhh', 'atencion'],
        'documents.create-category': ['admin', 'rrhh'],
        'documents.edit-category': ['admin', 'rrhh'],
        'documents.delete-category': ['admin'],
        'documents.create-tag': ['admin', 'rrhh'],
        'documents.edit-tag': ['admin', 'rrhh'],
        'documents.delete-tag': ['admin']
      };
      
      console.log('Permisos inicializados correctamente');
    } catch (error) {
      console.error('Error al inicializar permisos:', error);
    }
  }

  setUserRole(role: UserRole): void {
    this.userRole = role;
    console.log('Rol de usuario establecido:', role);
  }

  // Verificar si un usuario tiene acceso a un menú/submenú específico
  hasAccess(menuPath: string): boolean {
    if (!this.userRole) return false;
    
    // Admin siempre tiene acceso completo
    if (this.userRole.toLowerCase() === 'admin') return true;
    
    // Verificar permisos para esta ruta específica
    const allowedRoles = this.permissions[menuPath] || [];
    if (allowedRoles.includes(this.userRole.toLowerCase())) {
      return true;
    }
    
    // Si no hay permisos específicos, comprobar si hay permisos heredados 
    // (comprobar cada nivel superior de la jerarquía)
    const pathParts = menuPath.split('/');
    
    // Eliminar el último componente y comprobar el nivel superior
    while (pathParts.length > 1) {
      pathParts.pop();
      const parentPath = pathParts.join('/');
      const parentRoles = this.permissions[parentPath] || [];
      
      // Si el rol tiene acceso explícito al nivel superior
      if (parentRoles.includes(this.userRole.toLowerCase())) {
        // Y NO tiene denegación explícita al nivel actual
        if (!this.permissions[menuPath] || 
            this.permissions[menuPath].length === 0) {
          return true;
        }
      }
    }
    
    // Sin acceso
    return false;
  }
  
  // Método para verificar acceso a un botón específico
  hasButtonAccess(buttonId: string): boolean {
    if (!this.userRole) return false;
    
    // Admin siempre tiene acceso completo
    if (this.userRole.toLowerCase() === 'admin') return true;
    
    // Verificar permisos para este botón específico
    const allowedRoles = this.buttonPermissions[buttonId] || [];
    return allowedRoles.includes(this.userRole.toLowerCase());
  }
}

// Exportar una instancia única para usar en toda la aplicación
export const menuAccessManager = new MenuAccessManager(); 