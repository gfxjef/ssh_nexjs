"""
Rutas para la gestión de categorías del blog de bienestar.
"""
from flask import request, jsonify
from ..models import category_schema, validate_category
from ..queries import (
    GET_ALL_CATEGORIES, GET_CATEGORY_BY_ID, GET_CATEGORY_BY_NAME,
    INSERT_CATEGORY, UPDATE_CATEGORY, DELETE_CATEGORY
)
from ... import mysql_connection
from ...bienestar import bienestar_bp

@bienestar_bp.route('/categories', methods=['GET'])
def get_categories():
    """
    Obtiene todas las categorías.
    
    Returns:
        json: Lista de categorías
    """
    try:
        categories = mysql_connection.execute_query(GET_ALL_CATEGORIES)
        
        if categories is None:
            return jsonify({
                'success': False,
                'error': 'Error al obtener categorías'
            }), 500
        
        return jsonify({
            'success': True,
            'data': [category_schema(category) for category in categories]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al obtener categorías: {str(e)}'
        }), 500

@bienestar_bp.route('/categories/<int:category_id>', methods=['GET'])
def get_category(category_id):
    """
    Obtiene una categoría por su ID.
    
    Args:
        category_id (int): ID de la categoría
        
    Returns:
        json: Categoría encontrada o error
    """
    try:
        category = mysql_connection.execute_query(GET_CATEGORY_BY_ID, (category_id,))
        
        if not category:
            return jsonify({
                'success': False,
                'error': 'Categoría no encontrada'
            }), 404
        
        return jsonify({
            'success': True,
            'data': category_schema(category[0])
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al obtener categoría: {str(e)}'
        }), 500

@bienestar_bp.route('/categories', methods=['POST'])
def create_category():
    """
    Crea una nueva categoría.
    
    Returns:
        json: Categoría creada o error
    """
    try:
        data = request.json
        
        # Validar datos
        is_valid, error_msg = validate_category(data)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': error_msg
            }), 400
        
        # Verificar si ya existe una categoría con el mismo nombre
        existing = mysql_connection.execute_query(GET_CATEGORY_BY_NAME, (data['nombre'],))
        if existing:
            return jsonify({
                'success': False,
                'error': 'Ya existe una categoría con este nombre'
            }), 400
        
        # Insertar categoría
        result = mysql_connection.execute_query(
            INSERT_CATEGORY, 
            (data['nombre'], data.get('color', '#2e3954')),
            fetch=False
        )
        
        if not result or 'affected_rows' not in result or result['affected_rows'] == 0:
            return jsonify({
                'success': False,
                'error': 'No se pudo crear la categoría'
            }), 500
        
        # Obtener la categoría recién creada
        new_category = mysql_connection.execute_query(GET_CATEGORY_BY_NAME, (data['nombre'],))
        
        return jsonify({
            'success': True,
            'message': 'Categoría creada correctamente',
            'data': category_schema(new_category[0])
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al crear categoría: {str(e)}'
        }), 500

@bienestar_bp.route('/categories/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    """
    Actualiza una categoría existente.
    
    Args:
        category_id (int): ID de la categoría
        
    Returns:
        json: Categoría actualizada o error
    """
    try:
        data = request.json
        
        # Validar datos
        is_valid, error_msg = validate_category(data)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': error_msg
            }), 400
        
        # Verificar si existe la categoría
        existing = mysql_connection.execute_query(GET_CATEGORY_BY_ID, (category_id,))
        if not existing:
            return jsonify({
                'success': False,
                'error': 'Categoría no encontrada'
            }), 404
        
        # Verificar si ya existe otra categoría con el mismo nombre
        name_check = mysql_connection.execute_query(GET_CATEGORY_BY_NAME, (data['nombre'],))
        if name_check and name_check[0]['id'] != category_id:
            return jsonify({
                'success': False,
                'error': 'Ya existe otra categoría con este nombre'
            }), 400
        
        # Actualizar categoría
        result = mysql_connection.execute_query(
            UPDATE_CATEGORY,
            (data['nombre'], data.get('color', '#2e3954'), category_id),
            fetch=False
        )
        
        if not result or 'affected_rows' not in result:
            return jsonify({
                'success': False,
                'error': 'No se pudo actualizar la categoría'
            }), 500
        
        # Obtener la categoría actualizada
        updated_category = mysql_connection.execute_query(GET_CATEGORY_BY_ID, (category_id,))
        
        return jsonify({
            'success': True,
            'message': 'Categoría actualizada correctamente',
            'data': category_schema(updated_category[0])
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al actualizar categoría: {str(e)}'
        }), 500

@bienestar_bp.route('/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    """
    Elimina una categoría.
    
    Args:
        category_id (int): ID de la categoría
        
    Returns:
        json: Confirmación de eliminación o error
    """
    try:
        # Verificar si existe la categoría
        existing = mysql_connection.execute_query(GET_CATEGORY_BY_ID, (category_id,))
        if not existing:
            return jsonify({
                'success': False,
                'error': 'Categoría no encontrada'
            }), 404
        
        # TODO: Verificar si hay posts usando esta categoría
        # Este bloque debería implementarse para evitar borrar categorías en uso
        
        # Eliminar categoría
        result = mysql_connection.execute_query(DELETE_CATEGORY, (category_id,), fetch=False)
        
        if not result or 'affected_rows' not in result or result['affected_rows'] == 0:
            return jsonify({
                'success': False,
                'error': 'No se pudo eliminar la categoría'
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Categoría eliminada correctamente'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al eliminar categoría: {str(e)}'
        }), 500 