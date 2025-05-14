"""
Rutas para la gestión de categorías del blog de bienestar.
"""
from flask import request, jsonify
import traceback # Añadido para traceback
from ..models import category_schema, validate_category
from ..queries import (
    GET_ALL_CATEGORIES, GET_CATEGORY_BY_ID, GET_CATEGORY_BY_NAME,
    INSERT_CATEGORY, UPDATE_CATEGORY, DELETE_CATEGORY
)
from ...mysql_connection import MySQLConnection # Importar la clase
from ...bienestar import bienestar_bp

@bienestar_bp.route('/categories', methods=['GET'])
def get_categories():
    print("DEBUG: Iniciando get_categories()") # Log
    """
    Obtiene todas las categorías.
    
    Returns:
        json: Lista de categorías
    """
    try:
        print("DEBUG: get_categories() - Obteniendo todas las categorías (GET_ALL_CATEGORIES)...") # Log
        db_ops = MySQLConnection()
        try:
            categories = db_ops.execute_query(GET_ALL_CATEGORIES)
        except Exception as query_exc:
            query_error_details = traceback.format_exc()
            print(f"ERROR CRÍTICO durante execute_query(GET_ALL_CATEGORIES): {str(query_exc)}\n{query_error_details}")
            # Devolvemos un error 500 inmediatamente si la query falla aquí
            return jsonify({
                'success': False,
                'error': f'Error crítico al ejecutar la consulta principal de categorías: {str(query_exc)}',
                'details': query_error_details
            }), 500
        
        print(f"DEBUG: get_categories() - Resultado de execute_query: {type(categories)}") # Log del tipo
        if categories is not None:
            print(f"DEBUG: get_categories() - Número de categorías obtenidas: {len(categories)}") # Log
        else:
            print("DEBUG: get_categories() - execute_query devolvió None") # Log

        if categories is None:
            print("ERROR: get_categories() - execute_query devolvió None, retornando error 500.") # Log
            return jsonify({
                'success': False,
                'error': 'Error crítico al obtener categorías de la base de datos (query devolvió None)'
            }), 500

        print("DEBUG: get_categories() - Serializando categorías con category_schema...") # Log
        serialized_categories = [category_schema(category) for category in categories]
        print("DEBUG: get_categories() - Serialización completada.") # Log
        
        return jsonify({
            'success': True,
            'data': serialized_categories
        })
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR CRÍTICO en get_categories(): {str(e)}\n{error_details}") # Log detallado
        return jsonify({
            'success': False,
            'error': f'Error interno del servidor al obtener categorías: {str(e)}',
            'details': error_details
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
        db_ops = MySQLConnection()
        category = db_ops.execute_query(GET_CATEGORY_BY_ID, (category_id,))
        
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
        error_details = traceback.format_exc()
        print(f"ERROR CRÍTICO en get_category(id={category_id}): {str(e)}\n{error_details}")
        return jsonify({
            'success': False,
            'error': f'Error al obtener categoría {category_id}: {str(e)}'
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
        db_ops = MySQLConnection()
        existing = db_ops.execute_query(GET_CATEGORY_BY_NAME, (data['nombre'],))
        if existing:
            return jsonify({
                'success': False,
                'error': 'Ya existe una categoría con este nombre'
            }), 400
        
        # Insertar categoría
        result = db_ops.execute_query(
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
        new_category = db_ops.execute_query(GET_CATEGORY_BY_NAME, (data['nombre'],))
        
        return jsonify({
            'success': True,
            'message': 'Categoría creada correctamente',
            'data': category_schema(new_category[0])
        }), 201
        
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR CRÍTICO en create_category: {str(e)}\n{error_details}")
        return jsonify({
            'success': False,
            'error': f'Error al crear categoría: {str(e)}'
        }), 500

@bienestar_bp.route('/categories/<int:category_id>', methods=['PUT'])
def update_category_route(category_id): # Renombrado para evitar conflicto
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
        db_ops = MySQLConnection()
        existing = db_ops.execute_query(GET_CATEGORY_BY_ID, (category_id,))
        if not existing:
            return jsonify({
                'success': False,
                'error': 'Categoría no encontrada'
            }), 404
        
        # Verificar si ya existe otra categoría con el mismo nombre
        name_check = db_ops.execute_query(GET_CATEGORY_BY_NAME, (data['nombre'],))
        if name_check and name_check[0]['id'] != category_id:
            return jsonify({
                'success': False,
                'error': 'Ya existe otra categoría con este nombre'
            }), 400
        
        # Actualizar categoría
        result = db_ops.execute_query(
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
        updated_category = db_ops.execute_query(GET_CATEGORY_BY_ID, (category_id,))
        
        return jsonify({
            'success': True,
            'message': 'Categoría actualizada correctamente',
            'data': category_schema(updated_category[0])
        })
        
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR CRÍTICO en update_category(id={category_id}): {str(e)}\n{error_details}")
        return jsonify({
            'success': False,
            'error': f'Error al actualizar categoría {category_id}: {str(e)}'
        }), 500

@bienestar_bp.route('/categories/<int:category_id>', methods=['DELETE'])
def delete_category_route(category_id): # Renombrado
    """
    Elimina una categoría.
    
    Args:
        category_id (int): ID de la categoría
        
    Returns:
        json: Confirmación de eliminación o error
    """
    try:
        # Verificar si existe la categoría
        db_ops = MySQLConnection()
        existing = db_ops.execute_query(GET_CATEGORY_BY_ID, (category_id,))
        if not existing:
            return jsonify({
                'success': False,
                'error': 'Categoría no encontrada'
            }), 404
        
        # TODO: Verificar si hay posts usando esta categoría
        # Este bloque debería implementarse para evitar borrar categorías en uso
        
        # Eliminar categoría
        result = db_ops.execute_query(DELETE_CATEGORY, (category_id,), fetch=False)
        
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
        error_details = traceback.format_exc()
        print(f"ERROR CRÍTICO en delete_category(id={category_id}): {str(e)}\n{error_details}")
        return jsonify({
            'success': False,
            'error': f'Error al eliminar categoría {category_id}: {str(e)}'
        }), 500 