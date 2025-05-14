"""
Rutas para la gestión de posts del blog de bienestar.
"""
from datetime import datetime
from flask import request, jsonify
from ..models import post_schema, validate_post, PostStatus
from ..queries import (
    GET_ALL_POSTS, GET_POSTS_BY_STATUS, GET_POSTS_BY_CATEGORY,
    GET_POSTS_HIGHLIGHTED, GET_POST_BY_ID, SEARCH_POSTS,
    INSERT_POST, UPDATE_POST, UPDATE_POST_STATUS, UPDATE_POST_HIGHLIGHT,
    INCREMENT_VIEWS, DELETE_POST
)
from ... import mysql_connection
from ...bienestar import bienestar_bp

@bienestar_bp.route('/posts', methods=['GET'])
def get_posts():
    """
    Obtiene posts con diversos filtros.
    
    Query params:
        status (str): Estado de posts a filtrar
        category (int): ID de categoría a filtrar
        search (str): Término de búsqueda
        destacados (bool): Si se incluyen sólo posts destacados
        
    Returns:
        json: Lista de posts filtrados
    """
    try:
        status = request.args.get('status')
        category_id = request.args.get('category')
        search_term = request.args.get('search')
        destacados = request.args.get('destacados', '').lower() == 'true'
        
        posts = []
        
        if destacados:
            # Filtrar por destacados
            posts = mysql_connection.execute_query(GET_POSTS_HIGHLIGHTED)
        elif search_term:
            # Búsqueda por término
            search_param = f'%{search_term}%'
            posts = mysql_connection.execute_query(SEARCH_POSTS, (search_param, search_param, search_param))
        elif status and status in [e.value for e in PostStatus]:
            # Filtrar por estado
            posts = mysql_connection.execute_query(GET_POSTS_BY_STATUS, (status,))
        elif category_id and category_id.isdigit():
            # Filtrar por categoría
            posts = mysql_connection.execute_query(GET_POSTS_BY_CATEGORY, (int(category_id),))
        else:
            # Obtener todos los posts
            posts = mysql_connection.execute_query(GET_ALL_POSTS)
        
        if posts is None:
            return jsonify({
                'success': False,
                'error': 'Error al obtener posts'
            }), 500
        
        return jsonify({
            'success': True,
            'data': [post_schema(post) for post in posts]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al obtener posts: {str(e)}'
        }), 500

@bienestar_bp.route('/posts/<int:post_id>', methods=['GET'])
def get_post(post_id):
    """
    Obtiene un post por su ID.
    
    Args:
        post_id (int): ID del post
        
    Query params:
        increment_views (bool): Si se debe incrementar el contador de vistas
        
    Returns:
        json: Post encontrado o error
    """
    try:
        # Verificar si se debe incrementar vistas
        increment_views = request.args.get('increment_views', '').lower() == 'true'
        
        # Obtener post
        post_data = mysql_connection.execute_query(GET_POST_BY_ID, (post_id,))
        
        if not post_data:
            return jsonify({
                'success': False,
                'error': 'Post no encontrado'
            }), 404
        
        # Incrementar vistas si se ha solicitado y el post está publicado
        if increment_views and post_data[0]['estado'] == PostStatus.PUBLISHED.value:
            mysql_connection.execute_query(INCREMENT_VIEWS, (post_id,), fetch=False)
            post_data[0]['vistas'] += 1
        
        return jsonify({
            'success': True,
            'data': post_schema(post_data[0])
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al obtener post: {str(e)}'
        }), 500

@bienestar_bp.route('/posts', methods=['POST'])
def create_post():
    """
    Crea un nuevo post.
    
    Returns:
        json: Post creado o error
    """
    try:
        data = request.json
        
        # Validar datos
        is_valid, error_msg = validate_post(data)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': error_msg
            }), 400
        
        # Preparar los datos para inserción
        estado = data.get('estado', PostStatus.DRAFT.value)
        destacado = data.get('destacado', False)
        fecha = data.get('fecha', datetime.now().isoformat())
        imagen_url = data.get('imagenUrl', '')
        
        # Verificar si la categoría existe
        categoria_id = data['categoriaId']
        categoria = mysql_connection.execute_query("SELECT id FROM categorias_bienestar WHERE id = %s", (categoria_id,))
        
        if not categoria:
            return jsonify({
                'success': False,
                'error': f'La categoría con ID {categoria_id} no existe'
            }), 400
        
        # Insertar post
        insert_result = mysql_connection.execute_query(
            INSERT_POST,
            (
                data['titulo'],
                data['extracto'],
                data['contenido'],
                data['autor'],
                fecha,
                estado,
                destacado,
                categoria_id,
                imagen_url
            ),
            fetch=False
        )
        
        if not insert_result or 'affected_rows' not in insert_result or insert_result['affected_rows'] == 0:
            return jsonify({
                'success': False,
                'error': 'No se pudo crear el post'
            }), 500
        
        # Obtener el ID del último insert
        last_id_result = mysql_connection.execute_query("SELECT LAST_INSERT_ID() as id")
        
        # Imprimir debug info
        print(f"DEBUG - last_id_result: {last_id_result}")
        
        if not last_id_result or len(last_id_result) == 0:
            return jsonify({
                'success': False,
                'error': 'No se pudo obtener el ID del post creado'
            }), 500
            
        last_id = last_id_result[0]['id']
        
        # Imprimir debug info
        print(f"DEBUG - last_id: {last_id}")
        
        # Si el ID es 0 o nulo, es un error
        if last_id == 0 or last_id is None:
            # Intentar obtener el ID mediante otra consulta
            print("DEBUG - Intentando obtener el ID mediante consulta alternativa")
            
            # Tratar de encontrar el post recién creado por su título y contenido
            alt_query = """
            SELECT id FROM posts_bienestar 
            WHERE titulo = %s AND extracto = %s AND autor = %s
            ORDER BY created_at DESC LIMIT 1
            """
            
            alt_result = mysql_connection.execute_query(alt_query, (
                data['titulo'],
                data['extracto'],
                data['autor']
            ))
            
            print(f"DEBUG - alt_result: {alt_result}")
            
            if alt_result and len(alt_result) > 0:
                last_id = alt_result[0]['id']
                print(f"DEBUG - ID alternativo encontrado: {last_id}")
        
        # Obtener el post recién creado
        new_post = mysql_connection.execute_query(GET_POST_BY_ID, (last_id,))
        
        # Imprimir debug info
        print(f"DEBUG - new_post: {new_post}")
        
        if not new_post or len(new_post) == 0:
            # Si no podemos obtener el post, al menos devolvemos éxito pero con datos mínimos
            return jsonify({
                'success': True,
                'message': 'Post creado correctamente pero no se pudo recuperar la información completa',
                'data': {
                    'id': last_id,
                    'titulo': data['titulo']
                }
            }), 201
        
        return jsonify({
            'success': True,
            'message': 'Post creado correctamente',
            'data': post_schema(new_post[0])
        }), 201
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error al crear post: {str(e)}\n{error_trace}")
        return jsonify({
            'success': False,
            'error': f'Error al crear post: {str(e)}'
        }), 500

@bienestar_bp.route('/posts/<int:post_id>', methods=['PUT'])
def update_post(post_id):
    """
    Actualiza un post existente.
    
    Args:
        post_id (int): ID del post
        
    Returns:
        json: Post actualizado o error
    """
    try:
        data = request.json
        
        # Validar datos
        is_valid, error_msg = validate_post(data)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': error_msg
            }), 400
        
        # Verificar si existe el post
        existing = mysql_connection.execute_query(GET_POST_BY_ID, (post_id,))
        if not existing:
            return jsonify({
                'success': False,
                'error': 'Post no encontrado'
            }), 404
        
        # Preparar los datos para actualización
        estado = data.get('estado', existing[0]['estado'])
        destacado = data.get('destacado', existing[0]['destacado'])
        imagen_url = data.get('imagenUrl', existing[0]['imagen_url'])
        
        # Actualizar post
        result = mysql_connection.execute_query(
            UPDATE_POST,
            (
                data['titulo'],
                data['extracto'],
                data['contenido'],
                data['autor'],
                estado,
                destacado,
                data['categoriaId'],
                imagen_url,
                post_id
            ),
            fetch=False
        )
        
        if not result or 'affected_rows' not in result:
            return jsonify({
                'success': False,
                'error': 'No se pudo actualizar el post'
            }), 500
        
        # Obtener el post actualizado
        updated_post = mysql_connection.execute_query(GET_POST_BY_ID, (post_id,))
        
        return jsonify({
            'success': True,
            'message': 'Post actualizado correctamente',
            'data': post_schema(updated_post[0])
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al actualizar post: {str(e)}'
        }), 500

@bienestar_bp.route('/posts/<int:post_id>/status', methods=['PATCH'])
def change_post_status(post_id):
    """
    Cambia el estado de un post.
    
    Args:
        post_id (int): ID del post
        
    Returns:
        json: Confirmación de cambio o error
    """
    try:
        data = request.json
        
        if 'status' not in data:
            return jsonify({
                'success': False,
                'error': 'Se requiere el campo status'
            }), 400
        
        new_status = data['status']
        
        # Validar el estado
        if new_status not in [e.value for e in PostStatus]:
            return jsonify({
                'success': False,
                'error': f'Estado no válido. Debe ser uno de: {", ".join([e.value for e in PostStatus])}'
            }), 400
        
        # Verificar si existe el post
        existing = mysql_connection.execute_query(GET_POST_BY_ID, (post_id,))
        if not existing:
            return jsonify({
                'success': False,
                'error': 'Post no encontrado'
            }), 404
        
        # Actualizar estado
        result = mysql_connection.execute_query(
            UPDATE_POST_STATUS,
            (new_status, post_id),
            fetch=False
        )
        
        if not result or 'affected_rows' not in result or result['affected_rows'] == 0:
            return jsonify({
                'success': False,
                'error': 'No se pudo actualizar el estado del post'
            }), 500
        
        # Obtener el post actualizado
        updated_post = mysql_connection.execute_query(GET_POST_BY_ID, (post_id,))
        
        return jsonify({
            'success': True,
            'message': 'Estado del post actualizado correctamente',
            'data': post_schema(updated_post[0])
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al actualizar estado del post: {str(e)}'
        }), 500

@bienestar_bp.route('/posts/<int:post_id>/highlight', methods=['PATCH'])
def toggle_post_highlight(post_id):
    """
    Cambia el estado destacado de un post.
    
    Args:
        post_id (int): ID del post
        
    Returns:
        json: Confirmación de cambio o error
    """
    try:
        data = request.json
        
        # Verificar si existe el post
        existing = mysql_connection.execute_query(GET_POST_BY_ID, (post_id,))
        if not existing:
            return jsonify({
                'success': False,
                'error': 'Post no encontrado'
            }), 404
        
        # Determinar el nuevo estado destacado (invertir el actual o usar el proporcionado)
        current_highlight = bool(existing[0]['destacado'])
        new_highlight = not current_highlight
        
        if 'destacado' in data:
            new_highlight = bool(data['destacado'])
        
        # Actualizar destacado
        result = mysql_connection.execute_query(
            UPDATE_POST_HIGHLIGHT,
            (new_highlight, post_id),
            fetch=False
        )
        
        if not result or 'affected_rows' not in result:
            return jsonify({
                'success': False,
                'error': 'No se pudo actualizar el estado destacado del post'
            }), 500
        
        # Obtener el post actualizado
        updated_post = mysql_connection.execute_query(GET_POST_BY_ID, (post_id,))
        
        return jsonify({
            'success': True,
            'message': 'Estado destacado del post actualizado correctamente',
            'data': post_schema(updated_post[0])
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al actualizar estado destacado del post: {str(e)}'
        }), 500

@bienestar_bp.route('/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    """
    Elimina un post.
    
    Args:
        post_id (int): ID del post
        
    Returns:
        json: Confirmación de eliminación o error
    """
    try:
        # Verificar si existe el post
        existing = mysql_connection.execute_query(GET_POST_BY_ID, (post_id,))
        if not existing:
            return jsonify({
                'success': False,
                'error': 'Post no encontrado'
            }), 404
        
        # Eliminar post
        result = mysql_connection.execute_query(
            DELETE_POST,
            (post_id,),
            fetch=False
        )
        
        if not result or 'affected_rows' not in result or result['affected_rows'] == 0:
            return jsonify({
                'success': False,
                'error': 'No se pudo eliminar el post'
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Post eliminado correctamente'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al eliminar post: {str(e)}'
        }), 500 