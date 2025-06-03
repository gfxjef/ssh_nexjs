"""
Módulo que define los modelos y esquemas de datos para la sección de bienestar.
"""
from datetime import datetime
from enum import Enum

# Definición de enumeraciones para estados de posts
class PostStatus(str, Enum):
    PUBLISHED = 'publicado'
    DRAFT = 'borrador'
    ARCHIVED = 'archivado'

# Esquemas para validación y transformación de datos

def post_schema(post):
    """
    Convierte un registro de la base de datos a un diccionario formateado para la API.
    
    Args:
        post (dict): Registro de base de datos
        
    Returns:
        dict: Post formateado para API
    """
    if not post:
        return None
        
    return {
        'id': post['id'],
        'titulo': post['titulo'],
        'extracto': post['extracto'],
        'contenido': post['contenido'],
        'autor': post['autor'],
        'fecha': post['fecha'].isoformat() if isinstance(post['fecha'], datetime) else post['fecha'],
        'estado': post['estado'],
        'destacado': bool(post['destacado']),
        'vistas': post['vistas'],
        'categoriaId': post['categoria_id'],
        'categoria': post.get('categoria_nombre', ''),  # Si se ha incluido en el JOIN
        'imagenUrl': post.get('imagen_url', ''),
        'createdAt': post.get('created_at', ''),
        'updatedAt': post.get('updated_at', '')
    }

def category_schema(category):
    """
    Convierte un registro de la base de datos a un diccionario formateado para la API.
    
    Args:
        category (dict): Registro de base de datos
        
    Returns:
        dict: Categoría formateada para API
    """
    if not category:
        return None
        
    return {
        'id': category['id'],
        'nombre': category['nombre'],
        'color': category['color'],
        'createdAt': category.get('created_at', ''),
        'updatedAt': category.get('updated_at', '')
    }

# Funciones de validación

def validate_post(post_data):
    """
    Valida los datos de un post antes de guardarlos.
    
    Args:
        post_data (dict): Datos del post a validar
        
    Returns:
        tuple: (boolean, string) - (es_válido, mensaje_error)
    """
    required_fields = ['titulo', 'extracto', 'contenido', 'autor', 'categoriaId']
    errors = []
    
    # Verificar campos requeridos
    for field in required_fields:
        if field not in post_data or not post_data[field]:
            errors.append(f"El campo '{field}' es obligatorio")
    
    # Validar el estado
    if 'estado' in post_data and post_data['estado'] not in [e.value for e in PostStatus]:
        errors.append(f"Estado no válido. Debe ser uno de: {', '.join([e.value for e in PostStatus])}")
    
    # Validar que categoriaId sea un número
    if 'categoriaId' in post_data and not isinstance(post_data['categoriaId'], int):
        try:
            int(post_data['categoriaId'])
        except (ValueError, TypeError):
            errors.append("categoriaId debe ser un número entero")
    
    if errors:
        return (False, ", ".join(errors))
    
    return (True, "")

def validate_category(category_data):
    """
    Valida los datos de una categoría antes de guardarlos.
    
    Args:
        category_data (dict): Datos de la categoría a validar
        
    Returns:
        tuple: (boolean, string) - (es_válido, mensaje_error)
    """
    errors = []
    
    # Verificar nombre
    if 'nombre' not in category_data or not category_data['nombre']:
        errors.append("El campo 'nombre' es obligatorio")
    
    # Validar color (formato hexadecimal)
    if 'color' in category_data and category_data['color']:
        color = category_data['color']
        if not (color.startswith('#') and len(color) == 7):
            errors.append("El color debe tener formato hexadecimal (#RRGGBB)")
    
    if errors:
        return (False, ", ".join(errors))
    
    return (True, "")

def postulante_schema(postulante_data):
    """
    Convierte un registro de la base de datos de un postulante a un diccionario formateado.
    
    Args:
        postulante_data (dict): Registro de base de datos del postulante
        
    Returns:
        dict: Postulante formateado para API
    """
    if not postulante_data:
        return None
    
    return {
        'usuarioId': postulante_data.get('usuario_id'),
        'nombre': postulante_data.get('nombre', 'No disponible'),
        'correo': postulante_data.get('correo', 'No disponible'),
        'fechaPostulacion': postulante_data['fecha_postulacion'].isoformat() if isinstance(postulante_data.get('fecha_postulacion'), datetime) else postulante_data.get('fecha_postulacion')
    }

def user_schema(user_data):
    """
    Convierte un registro de la base de datos de un usuario a un diccionario formateado para la API.
    
    Args:
        user_data (dict): Registro de base de datos del usuario
        
    Returns:
        dict: Usuario formateado para API
    """
    if not user_data:
        return None
        
    return {
        'id': user_data['id'],
        'correo': user_data['correo'],
        'nombre': user_data['nombre'],
        'usuario': user_data['usuario'],
        'cargo': user_data['cargo'],
        'grupo': user_data['grupo'],
        'rango': user_data['rango']
    }

def validate_user_update(user_data):
    """
    Valida los datos de actualización de un usuario.
    Solo valida los campos editables: correo, nombre, cargo, grupo.
    
    Args:
        user_data (dict): Datos del usuario a validar
        
    Returns:
        tuple: (boolean, string) - (es_válido, mensaje_error)
    """
    errors = []
    
    # Validar correo (requerido y formato básico)
    if 'correo' not in user_data or not user_data['correo']:
        errors.append("El campo 'correo' es obligatorio")
    elif '@' not in user_data['correo'] or '.' not in user_data['correo']:
        errors.append("El correo electrónico no tiene un formato válido")
    
    # Validar nombre (requerido)
    if 'nombre' not in user_data or not user_data['nombre'].strip():
        errors.append("El campo 'nombre' es obligatorio")
    elif len(user_data['nombre'].strip()) < 2:
        errors.append("El nombre debe tener al menos 2 caracteres")
    
    # Validar cargo (opcional pero si se proporciona debe tener contenido)
    if 'cargo' in user_data and user_data['cargo'] is not None:
        if len(user_data['cargo'].strip()) < 2:
            errors.append("El cargo debe tener al menos 2 caracteres si se especifica")
    
    # Validar grupo (opcional pero si se proporciona debe tener contenido)
    if 'grupo' in user_data and user_data['grupo'] is not None:
        if len(user_data['grupo'].strip()) < 2:
            errors.append("El grupo debe tener al menos 2 caracteres si se especifica")
    
    # Validar longitudes máximas
    if 'correo' in user_data and len(user_data['correo']) > 255:
        errors.append("El correo no puede exceder 255 caracteres")
    
    if 'nombre' in user_data and len(user_data['nombre']) > 100:
        errors.append("El nombre no puede exceder 100 caracteres")
    
    if 'cargo' in user_data and user_data['cargo'] and len(user_data['cargo']) > 100:
        errors.append("El cargo no puede exceder 100 caracteres")
    
    if 'grupo' in user_data and user_data['grupo'] and len(user_data['grupo']) > 255:
        errors.append("El grupo no puede exceder 255 caracteres")
    
    if errors:
        return (False, ", ".join(errors))
    
    return (True, "") 