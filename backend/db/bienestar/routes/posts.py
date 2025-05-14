"""
Rutas para la gestión de posts del blog de bienestar.
"""
from datetime import datetime
from flask import request, jsonify
import traceback # Añadido para traceback
from ..models import post_schema, validate_post, PostStatus
from ..queries import (
    GET_ALL_POSTS, GET_POSTS_BY_STATUS, GET_POSTS_BY_CATEGORY,
    GET_POSTS_HIGHLIGHTED, GET_POST_BY_ID, SEARCH_POSTS,
    INSERT_POST, UPDATE_POST, UPDATE_POST_STATUS, UPDATE_POST_HIGHLIGHT,
    INCREMENT_VIEWS, DELETE_POST
)
from ...mysql_connection import MySQLConnection # Importar la clase
from ...bienestar import bienestar_bp

# Obtener una instancia del singleton de conexión
db_conn = MySQLConnection()

@bienestar_bp.route('/posts', methods=['GET'])
def get_posts():
    print("DEBUG: Iniciando get_posts()") # Log
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
        print(f"DEBUG: get_posts() - Filtros: status={status}, category_id={category_id}, search_term={search_term}, destacados={destacados}") # Log
        
        if destacados:
            print("DEBUG: get_posts() - Obteniendo posts destacados...") # Log
            posts = db_conn.execute_query(GET_POSTS_HIGHLIGHTED)
        elif search_term:
            print(f"DEBUG: get_posts() - Buscando posts con término: {search_term}...") # Log
            search_param = f'%{search_term}%'
            posts = db_conn.execute_query(SEARCH_POSTS, (search_param, search_param, search_param))
        elif status and status in [e.value for e in PostStatus]:
            print(f"DEBUG: get_posts() - Obteniendo posts por estado: {status}...") # Log
            posts = db_conn.execute_query(GET_POSTS_BY_STATUS, (status,))
        elif category_id and category_id.isdigit():
            print(f"DEBUG: get_posts() - Obteniendo posts por categoría ID: {category_id}...") # Log
            posts = db_conn.execute_query(GET_POSTS_BY_CATEGORY, (int(category_id),))
        else:
            print("DEBUG: get_posts() - Obteniendo todos los posts (GET_ALL_POSTS)...") # Log
            try:
                posts = db_conn.execute_query(GET_ALL_POSTS)
            except Exception as query_exc:
                query_error_details = traceback.format_exc()
                print(f"ERROR CRÍTICO durante execute_query(GET_ALL_POSTS): {str(query_exc)}\n{query_error_details}")
                # Devolvemos un error 500 inmediatamente si la query falla aquí
                return jsonify({
                    'success': False,
                    'error': f'Error crítico al ejecutar la consulta principal de posts: {str(query_exc)}',
                    'details': query_error_details
                }), 500
        
        print(f"DEBUG: get_posts() - Resultado de execute_query: {type(posts)}") # Log del tipo de 'posts'
        if posts is not None:
            print(f"DEBUG: get_posts() - Número de posts obtenidos: {len(posts)}") # Log si no es None
        else:
            print("DEBUG: get_posts() - execute_query devolvió None") # Log

        if posts is None:
            print("ERROR: get_posts() - execute_query devolvió None, retornando error 500.") # Log
            return jsonify({
                'success': False,
                'error': 'Error crítico al obtener posts de la base de datos (query devolvió None)'
            }), 500
        
        print("DEBUG: get_posts() - Serializando posts con post_schema...") # Log
        serialized_posts = [post_schema(post) for post in posts]
        print("DEBUG: get_posts() - Serialización completada.") # Log
        
        return jsonify({
            'success': True,
            'data': serialized_posts
        })
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR CRÍTICO en get_posts(): {str(e)}\n{error_details}") # Log detallado del error
        return jsonify({
            'success': False,
            'error': f'Error interno del servidor al obtener posts: {str(e)}',
            'details': error_details
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
        post_data = db_conn.execute_query(GET_POST_BY_ID, (post_id,))
        
        if not post_data:
            return jsonify({
                'success': False,
                'error': 'Post no encontrado'
            }), 404
        
        # Incrementar vistas si se ha solicitado y el post está publicado
        if increment_views and post_data[0]['estado'] == PostStatus.PUBLISHED.value:
            db_conn.execute_query(INCREMENT_VIEWS, (post_id,), fetch=False)
            post_data[0]['vistas'] += 1
        
        return jsonify({
            'success': True,
            'data': post_schema(post_data[0])
        })
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR CRÍTICO en get_post(id={post_id}): {str(e)}\n{error_details}")
        return jsonify({'success': False, 'error': f'Error al obtener post {post_id}: {str(e)}'}), 500

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
        categoria = db_conn.execute_query("SELECT id FROM categorias_bienestar WHERE id = %s", (categoria_id,))
        
        if not categoria:
            return jsonify({
                'success': False,
                'error': f'La categoría con ID {categoria_id} no existe'
            }), 400
        
        # Insertar post
        insert_result = db_conn.execute_query(
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
        last_id_result = db_conn.execute_query("SELECT LAST_INSERT_ID() as id")
        
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
            
            alt_result = db_conn.execute_query(alt_query, (
                data['titulo'],
                data['extracto'],
                data['autor']
            ))
            
            print(f"DEBUG - alt_result: {alt_result}")
            
            if alt_result and len(alt_result) > 0:
                last_id = alt_result[0]['id']
                print(f"DEBUG - ID alternativo encontrado: {last_id}")
        
        # Obtener el post recién creado
        new_post = db_conn.execute_query(GET_POST_BY_ID, (last_id,))
        
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
        error_details = traceback.format_exc()
        print(f"ERROR CRÍTICO en create_post: {str(e)}\n{error_details}")
        return jsonify({'success': False, 'error': f'Error al crear post: {str(e)}'}), 500

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
        existing = db_conn.execute_query(GET_POST_BY_ID, (post_id,))
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
        result = db_conn.execute_query(
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
        updated_post = db_conn.execute_query(GET_POST_BY_ID, (post_id,))
        
        return jsonify({
            'success': True,
            'message': 'Post actualizado correctamente',
            'data': post_schema(updated_post[0])
        })
        
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR CRÍTICO en update_post(id={post_id}): {str(e)}\n{error_details}")
        return jsonify({'success': False, 'error': f'Error al actualizar post {post_id}: {str(e)}'}), 500

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
        existing = db_conn.execute_query(GET_POST_BY_ID, (post_id,))
        if not existing:
            return jsonify({
                'success': False,
                'error': 'Post no encontrado'
            }), 404
        
        # Actualizar estado
        result = db_conn.execute_query(
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
        updated_post = db_conn.execute_query(GET_POST_BY_ID, (post_id,))
        
        return jsonify({
            'success': True,
            'message': 'Estado del post actualizado correctamente',
            'data': post_schema(updated_post[0])
        })
        
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR CRÍTICO en change_post_status(id={post_id}): {str(e)}\n{error_details}")
        return jsonify({'success': False, 'error': f'Error al cambiar estado del post {post_id}: {str(e)}'}), 500

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
        existing = db_conn.execute_query(GET_POST_BY_ID, (post_id,))
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
        result = db_conn.execute_query(
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
        updated_post = db_conn.execute_query(GET_POST_BY_ID, (post_id,))
        
        return jsonify({
            'success': True,
            'message': 'Estado destacado del post actualizado correctamente',
            'data': post_schema(updated_post[0])
        })
        
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR CRÍTICO en toggle_post_highlight(id={post_id}): {str(e)}\n{error_details}")
        return jsonify({'success': False, 'error': f'Error al destacar post {post_id}: {str(e)}'}), 500

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
        existing = db_conn.execute_query(GET_POST_BY_ID, (post_id,))
        if not existing:
            return jsonify({
                'success': False,
                'error': 'Post no encontrado'
            }), 404
        
        # Eliminar post
        result = db_conn.execute_query(
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
        error_details = traceback.format_exc()
        print(f"ERROR CRÍTICO en delete_post(id={post_id}): {str(e)}\n{error_details}")
        return jsonify({'success': False, 'error': f'Error al eliminar post {post_id}: {str(e)}'}), 500 