"""
Middleware de permisos para el sistema de documentos.
Gestiona la autorización basada en roles de usuario.
"""

import logging
from functools import wraps
from flask import request, jsonify, g
from ...login import verificar_token, obtener_usuario_por_id

# Configurar logger
logger = logging.getLogger(__name__)

# Definición de permisos por rol
ROLE_PERMISSIONS = {
    'admin': {
        'documents.view': True,
        'documents.upload': True,
        'documents.edit': True,
        'documents.delete': True,
        'documents.admin': True,
        'documents.download': True,
        'documents.create-category': True,
        'documents.edit-category': True,
        'documents.delete-category': True,
        'documents.create-tag': True,
        'documents.edit-tag': True,
        'documents.delete-tag': True,
    },
    'gerente': {
        'documents.view': True,
        'documents.upload': False,
        'documents.edit': False,
        'documents.delete': False,
        'documents.admin': False,
        'documents.download': True,
        'documents.create-category': False,
        'documents.edit-category': False,
        'documents.delete-category': False,
        'documents.create-tag': False,
        'documents.edit-tag': False,
        'documents.delete-tag': False,
    },
    'rrhh': {
        'documents.view': True,
        'documents.upload': True,
        'documents.edit': True,
        'documents.delete': False,
        'documents.admin': True,
        'documents.download': True,
        'documents.create-category': True,
        'documents.edit-category': True,
        'documents.delete-category': False,
        'documents.create-tag': True,
        'documents.edit-tag': True,
        'documents.delete-tag': False,
    },
    'atencion': {
        'documents.view': True,
        'documents.upload': True,
        'documents.edit': False,
        'documents.delete': False,
        'documents.admin': False,
        'documents.download': True,
        'documents.create-category': False,
        'documents.edit-category': False,
        'documents.delete-category': False,
        'documents.create-tag': False,
        'documents.edit-tag': False,
        'documents.delete-tag': False,
    }
}

def get_user_from_token():
    """
    Extrae y valida el usuario desde el token JWT en la request.
    
    Returns:
        dict/None: Información del usuario si el token es válido, None si no
    """
    try:
        # Obtener token del header Authorization
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        
        # Verificar token
        payload = verificar_token(token)
        if not payload:
            return None
        
        # Obtener información completa del usuario
        user_id = payload.get('sub')
        if not user_id:
            return None
        
        user_info = obtener_usuario_por_id(user_id)
        if not user_info:
            return None
        
        return user_info
        
    except Exception as e:
        logger.error(f"Error al obtener usuario desde token: {str(e)}")
        return None

def check_permission(user_role, permission):
    """
    Verifica si un rol tiene un permiso específico.
    
    Args:
        user_role (str): Rol del usuario
        permission (str): Permiso a verificar
        
    Returns:
        bool: True si tiene el permiso, False si no
    """
    if not user_role:
        return False
    
    # Admin siempre tiene todos los permisos
    if user_role.lower() == 'admin':
        return True
    
    # Verificar permisos específicos del rol
    role_perms = ROLE_PERMISSIONS.get(user_role.lower(), {})
    return role_perms.get(permission, False)

def require_permission(permission):
    """
    Decorador para endpoints que requieren permisos específicos.
    
    Args:
        permission (str): Permiso requerido
        
    Returns:
        function: Decorador
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Obtener usuario desde token
            user = get_user_from_token()
            
            if not user:
                return jsonify({
                    'success': False, 
                    'error': 'Token de autorización requerido',
                    'code': 'UNAUTHORIZED'
                }), 401
            
            # Verificar permiso
            user_role = user.get('rango')
            if not check_permission(user_role, permission):
                logger.warning(f"Usuario {user.get('usuario', 'N/A')} (rol: {user_role}) intentó acceder sin permiso: {permission}")
                return jsonify({
                    'success': False, 
                    'error': 'No tienes permisos para realizar esta acción',
                    'code': 'FORBIDDEN',
                    'required_permission': permission,
                    'user_role': user_role
                }), 403
            
            # Almacenar información del usuario en g para uso en el endpoint
            g.current_user = user
            g.user_role = user_role
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_auth():
    """
    Decorador para endpoints que requieren autenticación pero no permisos específicos.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Obtener usuario desde token
            user = get_user_from_token()
            
            if not user:
                return jsonify({
                    'success': False, 
                    'error': 'Token de autorización requerido',
                    'code': 'UNAUTHORIZED'
                }), 401
            
            # Almacenar información del usuario en g
            g.current_user = user
            g.user_role = user.get('rango')
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def get_current_user():
    """
    Obtiene el usuario actual desde g (debe usarse dentro de un endpoint decorado).
    
    Returns:
        dict/None: Información del usuario actual
    """
    return getattr(g, 'current_user', None)

def get_current_user_role():
    """
    Obtiene el rol del usuario actual desde g.
    
    Returns:
        str/None: Rol del usuario actual
    """
    return getattr(g, 'user_role', None)

def has_permission(permission, user_role=None):
    """
    Verifica si el usuario actual (o uno específico) tiene un permiso.
    
    Args:
        permission (str): Permiso a verificar
        user_role (str, optional): Rol específico a verificar. Si no se proporciona, usa el usuario actual.
        
    Returns:
        bool: True si tiene el permiso, False si no
    """
    if user_role is None:
        user_role = get_current_user_role()
    
    return check_permission(user_role, permission) 