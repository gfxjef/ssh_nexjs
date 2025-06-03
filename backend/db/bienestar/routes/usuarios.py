"""
Rutas para la administración de usuarios en el módulo de bienestar.
Proporciona endpoints para listar, obtener y actualizar usuarios.
"""
from flask import Blueprint, request, jsonify
from ...mysql_connection import MySQLConnection
from ..queries import (
    GET_ALL_USERS, 
    GET_USER_BY_ID, 
    UPDATE_USER, 
    CHECK_USER_EXISTS,
    SEARCH_USERS
)
from ..models import user_schema, validate_user_update

# Crear blueprint para usuarios
usuarios_bp = Blueprint('usuarios', __name__)

@usuarios_bp.route('/users', methods=['GET'])
def get_users():
    """
    Obtiene todos los usuarios o busca por término.
    
    Query parameters:
        - search: Término de búsqueda (nombre, correo, cargo)
        
    Returns:
        JSON con lista de usuarios
    """
    try:
        db_ops = MySQLConnection()
        search_term = request.args.get('search', '').strip()
        
        if search_term:
            # Buscar usuarios por término
            search_pattern = f"%{search_term}%"
            users = db_ops.execute_query(
                SEARCH_USERS, 
                (search_pattern, search_pattern, search_pattern)
            )
        else:
            # Obtener todos los usuarios
            users = db_ops.execute_query(GET_ALL_USERS)
        
        if users is None:
            return jsonify({
                'success': False,
                'error': 'Error al obtener usuarios de la base de datos'
            }), 500
        
        # Formatear usuarios usando el schema
        formatted_users = [user_schema(user) for user in users]
        
        return jsonify({
            'success': True,
            'data': formatted_users,
            'total': len(formatted_users)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error interno del servidor: {str(e)}'
        }), 500

@usuarios_bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """
    Obtiene información específica de un usuario.
    
    Args:
        user_id (int): ID del usuario
        
    Returns:
        JSON con información del usuario
    """
    try:
        db_ops = MySQLConnection()
        users = db_ops.execute_query(GET_USER_BY_ID, (user_id,))
        
        if not users or len(users) == 0:
            return jsonify({
                'success': False,
                'error': 'Usuario no encontrado'
            }), 404
        
        user = user_schema(users[0])
        
        return jsonify({
            'success': True,
            'data': user
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error interno del servidor: {str(e)}'
        }), 500

@usuarios_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """
    Actualiza los campos editables de un usuario.
    Campos editables: correo, nombre, cargo, grupo
    Campos no editables (solo lectura): id, usuario, rango
    
    Args:
        user_id (int): ID del usuario a actualizar
        
    Body:
        JSON con los campos a actualizar
        
    Returns:
        JSON con el usuario actualizado
    """
    try:
        # Validar que exista el usuario
        db_ops = MySQLConnection()
        user_exists = db_ops.execute_query(CHECK_USER_EXISTS, (user_id,))
        
        if not user_exists or user_exists[0]['count'] == 0:
            return jsonify({
                'success': False,
                'error': 'Usuario no encontrado'
            }), 404
        
        # Obtener datos del cuerpo de la petición
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No se proporcionaron datos para actualizar'
            }), 400
        
        # Validar datos
        is_valid, error_msg = validate_user_update(data)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': error_msg
            }), 400
        
        # Actualizar usuario (solo campos editables)
        update_result = db_ops.execute_query(
            UPDATE_USER, 
            (
                data['correo'],
                data['nombre'], 
                data.get('cargo', ''),
                data.get('grupo', ''),
                user_id
            ), 
            fetch=False
        )
        
        if update_result is None:
            return jsonify({
                'success': False,
                'error': 'Error al actualizar el usuario'
            }), 500
        
        # Obtener usuario actualizado
        updated_users = db_ops.execute_query(GET_USER_BY_ID, (user_id,))
        updated_user = user_schema(updated_users[0])
        
        return jsonify({
            'success': True,
            'message': 'Usuario actualizado correctamente',
            'data': updated_user
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error interno del servidor: {str(e)}'
        }), 500 