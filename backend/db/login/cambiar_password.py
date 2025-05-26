"""
Módulo para cambio de contraseñas de usuarios autenticados.
Permite a los usuarios cambiar su contraseña actual por una nueva.
"""
import logging
from ..mysql_connection import MySQLConnection
from .auth_usuarios import verificar_token

# Configurar logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def validar_password_actual(usuario_id, password_actual):
    """
    Valida que la contraseña actual proporcionada coincida con la almacenada en BD.
    
    Args:
        usuario_id (int): ID del usuario
        password_actual (str): Contraseña actual proporcionada por el usuario
        
    Returns:
        bool: True si la contraseña es correcta, False si no
    """
    query = """
    SELECT pass FROM usuarios WHERE id = %s
    """
    
    db_ops = MySQLConnection()
    result = db_ops.execute_query(query, (usuario_id,))
    
    if not result or len(result) == 0:
        logger.warning(f"Usuario con ID {usuario_id} no encontrado")
        return False
    
    stored_password = result[0]['pass']
    
    # Comparar contraseñas directamente (sin hash ya que el sistema actual no usa hash)
    is_valid = stored_password == password_actual
    
    if is_valid:
        logger.info(f"Contraseña actual validada correctamente para usuario ID {usuario_id}")
    else:
        logger.warning(f"Contraseña actual incorrecta para usuario ID {usuario_id}")
    
    return is_valid

def actualizar_password(usuario_id, nueva_password):
    """
    Actualiza la contraseña del usuario en la base de datos.
    
    Args:
        usuario_id (int): ID del usuario
        nueva_password (str): Nueva contraseña
        
    Returns:
        bool: True si la actualización fue exitosa, False si no
    """
    try:
        query = """
        UPDATE usuarios 
        SET pass = %s 
        WHERE id = %s
        """
        
        db_ops = MySQLConnection()
        # IMPORTANTE: fetch=False para hacer commit en operaciones UPDATE
        result = db_ops.execute_query(query, (nueva_password, usuario_id), fetch=False)
        
        if result is not None and isinstance(result, dict):
            affected_rows = result.get('affected_rows', 0)
            if affected_rows > 0:
                logger.info(f"Contraseña actualizada exitosamente para usuario ID {usuario_id}. Filas afectadas: {affected_rows}")
                return True
            else:
                logger.warning(f"No se actualizó ninguna fila para usuario ID {usuario_id}")
                return False
        else:
            logger.error(f"Error al actualizar contraseña para usuario ID {usuario_id}")
            return False
            
    except Exception as e:
        logger.error(f"Excepción al actualizar contraseña para usuario ID {usuario_id}: {e}")
        return False

def obtener_info_usuario(usuario_id):
    """
    Obtiene información básica del usuario para logging.
    
    Args:
        usuario_id (int): ID del usuario
        
    Returns:
        dict/None: Información básica del usuario o None si no existe
    """
    query = """
    SELECT usuario, correo, nombre FROM usuarios WHERE id = %s
    """
    
    db_ops = MySQLConnection()
    result = db_ops.execute_query(query, (usuario_id,))
    
    if not result or len(result) == 0:
        return None
    
    return result[0]

def procesar_cambio_password(token, password_actual, nueva_password):
    """
    Proceso completo para cambiar la contraseña de un usuario autenticado.
    
    Args:
        token (str): Token JWT del usuario autenticado
        password_actual (str): Contraseña actual del usuario
        nueva_password (str): Nueva contraseña deseada
        
    Returns:
        dict: Resultado del proceso (success: bool, message: str)
    """
    try:
        # 1. Verificar y decodificar el token
        payload = verificar_token(token)
        if not payload:
            return {
                "success": False,
                "message": "Token inválido o expirado"
            }
        
        usuario_id = payload['sub']
        usuario_info = obtener_info_usuario(usuario_id)
        
        if not usuario_info:
            return {
                "success": False,
                "message": "Usuario no encontrado"
            }
        
        logger.info(f"Solicitud de cambio de contraseña para usuario: {usuario_info['usuario']} (ID: {usuario_id})")
        
        # 2. Validaciones básicas
        if not password_actual or not nueva_password:
            return {
                "success": False,
                "message": "Contraseña actual y nueva contraseña son requeridas"
            }
        
        if len(nueva_password) < 4:
            return {
                "success": False,
                "message": "La nueva contraseña debe tener al menos 4 caracteres"
            }
        
        if password_actual == nueva_password:
            return {
                "success": False,
                "message": "La nueva contraseña debe ser diferente a la actual"
            }
        
        # 3. Validar contraseña actual
        if not validar_password_actual(usuario_id, password_actual):
            return {
                "success": False,
                "message": "La contraseña actual es incorrecta"
            }
        
        # 4. Actualizar contraseña
        if actualizar_password(usuario_id, nueva_password):
            logger.info(f"Contraseña cambiada exitosamente para usuario: {usuario_info['usuario']}")
            return {
                "success": True,
                "message": "Contraseña cambiada exitosamente"
            }
        else:
            logger.error(f"Error al cambiar contraseña para usuario: {usuario_info['usuario']}")
            return {
                "success": False,
                "message": "Error interno al cambiar la contraseña"
            }
            
    except Exception as e:
        logger.error(f"Error en proceso de cambio de contraseña: {e}", exc_info=True)
        return {
            "success": False,
            "message": "Error interno del servidor"
        }

def validar_politica_password(password):
    """
    Valida que la contraseña cumpla con las políticas de seguridad.
    
    Args:
        password (str): Contraseña a validar
        
    Returns:
        dict: Resultado de la validación (valid: bool, message: str, suggestions: list)
    """
    suggestions = []
    is_valid = True
    
    if len(password) < 8:
        suggestions.append("Usa al menos 8 caracteres")
        
    if not any(c.isupper() for c in password):
        suggestions.append("Incluye al menos una letra mayúscula")
        
    if not any(c.islower() for c in password):
        suggestions.append("Incluye al menos una letra minúscula")
        
    if not any(c.isdigit() for c in password):
        suggestions.append("Incluye al menos un número")
        
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        suggestions.append("Incluye al menos un símbolo especial")
    
    # Para este sistema, solo requerimos mínimo 4 caracteres
    if len(password) < 4:
        is_valid = False
        message = "La contraseña debe tener al menos 4 caracteres"
    else:
        is_valid = True
        message = "Contraseña válida" if not suggestions else "Contraseña válida, pero podría ser más segura"
    
    return {
        "valid": is_valid,
        "message": message,
        "suggestions": suggestions
    } 