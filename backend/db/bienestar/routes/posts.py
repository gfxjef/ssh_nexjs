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
    INCREMENT_VIEWS, DELETE_POST, CHECK_EXISTING_POSTULACION, INSERT_POSTULACION,
    GET_POSTULANTES_BY_POST_ID, UPDATE_POST_EMAIL_SENT
)
from ...mysql_connection import MySQLConnection # Importar la clase
from ...bienestar import bienestar_bp
# Importar funciones de login para verificación de token y obtención de datos de usuario
from ...login import verificar_token, obtener_usuario_por_id # Asumiendo que están en el __init__ de login

# Importar servicio de email
try:
    import sys
    import os
    # Agregar el directorio padre para acceder a utils
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    from utils.email_service import email_service
    EMAIL_SERVICE_AVAILABLE = True
    print("✅ [EMAIL] Servicio de correos cargado correctamente")
except ImportError as e:
    EMAIL_SERVICE_AVAILABLE = False
    print(f"⚠️ [EMAIL] Servicio de correos no disponible: {e}")

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
        db_ops = MySQLConnection() # AÑADIDO
        category_id = request.args.get('category')
        search_term = request.args.get('search')
        destacados = request.args.get('destacados', '').lower() == 'true'
        
        posts = []
        print(f"DEBUG: get_posts() - Filtros: status={status}, category_id={category_id}, search_term={search_term}, destacados={destacados}") # Log
        
        if destacados:
            print("DEBUG: get_posts() - Obteniendo posts destacados...") # Log
            posts = db_ops.execute_query(GET_POSTS_HIGHLIGHTED) # MODIFICADO
        elif search_term:
            print(f"DEBUG: get_posts() - Buscando posts con término: {search_term}...") # Log
            search_param = f'%{search_term}%'
            posts = db_ops.execute_query(SEARCH_POSTS, (search_param, search_param, search_param)) # MODIFICADO
        elif status and status in [e.value for e in PostStatus]:
            print(f"DEBUG: get_posts() - Obteniendo posts por estado: {status}...") # Log
            posts = db_ops.execute_query(GET_POSTS_BY_STATUS, (status,)) # MODIFICADO
        elif category_id and category_id.isdigit():
            print(f"DEBUG: get_posts() - Obteniendo posts por categoría ID: {category_id}...") # Log
            posts = db_ops.execute_query(GET_POSTS_BY_CATEGORY, (int(category_id),)) # MODIFICADO
        else:
            print("DEBUG: get_posts() - Obteniendo todos los posts (GET_ALL_POSTS)...") # Log
            try:
                posts = db_ops.execute_query(GET_ALL_POSTS) # MODIFICADO
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
        db_ops = MySQLConnection() # AÑADIDO
        
        # Obtener post
        post_data = db_ops.execute_query(GET_POST_BY_ID, (post_id,)) # MODIFICADO
        
        if not post_data:
            return jsonify({
                'success': False,
                'error': 'Post no encontrado'
            }), 404
        
        # Incrementar vistas si se ha solicitado y el post está publicado
        if increment_views and post_data[0]['estado'] == PostStatus.PUBLISHED.value:
            db_ops.execute_query(INCREMENT_VIEWS, (post_id,), fetch=False) # MODIFICADO
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
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No se proporcionaron datos'}), 400

        # Extraer datos del post
        titulo = data.get('titulo')
        contenido = data.get('contenido')
        # Asegúrate de que categoria_id se maneje como entero
        categoria_id_str = data.get('categoria_id')
        imagen_url = data.get('imagen_url')
        usuario_id = data.get('usuario_id') # Asumiendo que el ID del usuario se envía o se obtiene del token
        
        if not all([titulo, contenido, categoria_id_str]):
            return jsonify({'success': False, 'error': 'Título, contenido y ID de categoría son requeridos'}), 400

        try:
            categoria_id = int(categoria_id_str)
        except ValueError:
            return jsonify({'success': False, 'error': 'El ID de categoría debe ser un número entero'}), 400

        try:
            mysql_conn = MySQLConnection() # Crear instancia
            
            # Verificar si la categoría existe
            categoria = mysql_conn.execute_query("SELECT id FROM categorias_bienestar WHERE id = %s", (categoria_id,)) # CORREGIDO
            
            if not categoria:
                return jsonify({'success': False, 'error': f'La categoría con ID {categoria_id} no existe'}), 400

            # Obtener el extracto del payload
            extracto = data.get('extracto') # Asegurarse de que el frontend envía esto
            if not extracto:
                # Considerar si el extracto es obligatorio
                # Por ahora, si no viene, se podría poner un placeholder o fallar si es mandatorio
                # Para la query INSERT_POST es obligatorio
                return jsonify({'success': False, 'error': 'El campo extracto es requerido'}), 400

            # Usar el campo 'autor' que viene del frontend para la query, que espera un string para el campo 'autor'
            autor_nombre = data.get('autor', 'Autor Desconocido') # Tomar 'autor' del payload, o un default
            
            # La query INSERT_POST espera 9 parámetros:
            # titulo, extracto, contenido, autor, fecha, estado, destacado, categoria_id, imagen_url
            insert_result = mysql_conn.execute_query(
                INSERT_POST,
                (
                    titulo,                   # 1. titulo
                    extracto,                 # 2. extracto
                    contenido,                # 3. contenido
                    autor_nombre,             # 4. autor (el nombre del autor, string)
                    datetime.now().isoformat(), # 5. fecha
                    PostStatus.DRAFT.value,   # 6. estado
                    False,                    # 7. destacado (por defecto al crear)
                    categoria_id,             # 8. categoria_id
                    imagen_url                # 9. imagen_url
                ),
                fetch=False
            )
            
            if not insert_result or 'affected_rows' not in insert_result or insert_result['affected_rows'] == 0:
                return jsonify({
                    'success': False,
                    'error': 'No se pudo crear el post'
                }), 500
            
            # Obtener el ID del último insert
            last_id_result = mysql_conn.execute_query("SELECT LAST_INSERT_ID() as id") # MODIFICADO
            
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
                
                alt_result = mysql_conn.execute_query(alt_query, (
                    titulo,
                    extracto,
                    autor_nombre
                ))
                
                print(f"DEBUG - alt_result: {alt_result}")
                
                if alt_result and len(alt_result) > 0:
                    last_id = alt_result[0]['id']
                    print(f"DEBUG - ID alternativo encontrado: {last_id}")
            
            # Obtener el post recién creado
            new_post = mysql_conn.execute_query(GET_POST_BY_ID, (last_id,)) # MODIFICADO
            
            # Imprimir debug info
            print(f"DEBUG - new_post: {new_post}")
            
            if not new_post or len(new_post) == 0:
                # Si no podemos obtener el post, al menos devolvemos éxito pero con datos mínimos
                return jsonify({
                    'success': True,
                    'message': 'Post creado correctamente pero no se pudo recuperar la información completa',
                    'data': {
                        'id': last_id,
                        'titulo': titulo
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

    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR CRÍTICO en create_post(): {str(e)}\n{error_details}")
        return jsonify({
            'success': False,
            'error': f'Error interno del servidor al crear post: {str(e)}',
            'details': error_details
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
        db_ops = MySQLConnection() # AÑADIDO
        existing = db_ops.execute_query(GET_POST_BY_ID, (post_id,))
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
        result = db_ops.execute_query(
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
        updated_post = db_ops.execute_query(GET_POST_BY_ID, (post_id,))
        
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
        
        nuevo_estado = data['status']
        
        # Validar el estado
        if nuevo_estado not in [e.value for e in PostStatus]:
            return jsonify({
                'success': False,
                'error': f'Estado no válido. Debe ser uno de: {", ".join([e.value for e in PostStatus])}'
            }), 400
        
        # Verificar si existe el post
        db_ops = MySQLConnection() # AÑADIDO
        existing = db_ops.execute_query(GET_POST_BY_ID, (post_id,))
        if not existing:
            return jsonify({
                'success': False,
                'error': 'Post no encontrado'
            }), 404
        
        # Obtener el estado anterior y verificar si ya se envió email
        post_anterior = existing[0]
        estado_anterior = post_anterior['estado']
        email_enviado_previamente = post_anterior.get('email_sent', False)
        
        # Actualizar estado
        result = db_ops.execute_query(
            UPDATE_POST_STATUS,
            (nuevo_estado, post_id),
            fetch=False
        )
        
        if not result or 'affected_rows' not in result or result['affected_rows'] == 0:
            return jsonify({
                'success': False,
                'error': 'No se pudo actualizar el estado del post'
            }), 500
        
        # 🚀 LÓGICA DE ENVÍO DE CORREO
        email_enviado = False
        if (nuevo_estado == PostStatus.PUBLISHED.value and 
            estado_anterior != PostStatus.PUBLISHED.value and 
            not email_enviado_previamente and 
            EMAIL_SERVICE_AVAILABLE):
            
            try:
                print(f"📧 [EMAIL] Enviando notificación para post publicado: {post_id}")
                
                # Obtener información completa del post y categoría
                post_data = db_ops.execute_query(GET_POST_BY_ID, (post_id,))[0]
                
                # Obtener nombre de la categoría
                categoria_query = "SELECT nombre FROM categorias_bienestar WHERE id = %s"
                categoria_result = db_ops.execute_query(categoria_query, (post_data['categoria_id'],))
                category_name = categoria_result[0]['nombre'] if categoria_result else "Sin categoría"
                
                # Enviar email de notificación
                email_success = email_service.send_post_notification(
                    post_data=post_data,
                    category_name=category_name
                )
                
                if email_success:
                    # Marcar como email enviado en la base de datos
                    db_ops.execute_query(
                        UPDATE_POST_EMAIL_SENT,
                        (True, post_id),
                        fetch=False
                    )
                    email_enviado = True
                    print(f"✅ [EMAIL] Notificación enviada y marcada en BD para post {post_id}")
                else:
                    print(f"❌ [EMAIL] Error al enviar notificación para post {post_id}")
                    
            except Exception as email_error:
                print(f"❌ [EMAIL] Error en envío de notificación para post {post_id}: {str(email_error)}")
                # No fallar la actualización del estado por un error de email
        
        # Obtener el post actualizado
        updated_post = db_ops.execute_query(GET_POST_BY_ID, (post_id,))
        
        response_data = {
            'success': True,
            'message': 'Estado del post actualizado correctamente',
            'data': post_schema(updated_post[0])
        }
        
        # Agregar información del email si se envió
        if email_enviado:
            response_data['email_sent'] = True
            response_data['message'] += ' y notificación enviada por correo'
        
        return jsonify(response_data)
        
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
        db_ops = MySQLConnection() # AÑADIDO
        existing = db_ops.execute_query(GET_POST_BY_ID, (post_id,))
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
        result = db_ops.execute_query(
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
        updated_post = db_ops.execute_query(GET_POST_BY_ID, (post_id,))
        
        return jsonify({
            'success': True,
            'message': 'Estado destacado del post actualizado correctamente',
            'data': post_schema(updated_post[0])
        })
        
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR CRÍTICO en toggle_post_highlight(id={post_id}): {str(e)}\n{error_details}")
        return jsonify({'success': False, 'error': f'Error al destacar post {post_id}: {str(e)}'}), 500

@bienestar_bp.route('/posts/<int:post_id>/resend-email', methods=['POST'])
def resend_post_email(post_id):
    """
    Re-envía el email de notificación para un post publicado.
    
    Args:
        post_id (int): ID del post
        
    Returns:
        json: Confirmación de re-envío o error
    """
    try:
        if not EMAIL_SERVICE_AVAILABLE:
            return jsonify({
                'success': False,
                'error': 'Servicio de email no disponible'
            }), 503
        
        # Verificar si existe el post
        db_ops = MySQLConnection()
        existing = db_ops.execute_query(GET_POST_BY_ID, (post_id,))
        if not existing:
            return jsonify({
                'success': False,
                'error': 'Post no encontrado'
            }), 404
        
        post_data = existing[0]
        
        # Verificar que el post esté publicado
        if post_data['estado'] != PostStatus.PUBLISHED.value:
            return jsonify({
                'success': False,
                'error': 'Solo se pueden re-enviar emails de posts publicados'
            }), 400
        
        try:
            print(f"📧 [EMAIL-RESEND] Re-enviando notificación para post: {post_id}")
            
            # Obtener nombre de la categoría
            categoria_query = "SELECT nombre FROM categorias_bienestar WHERE id = %s"
            categoria_result = db_ops.execute_query(categoria_query, (post_data['categoria_id'],))
            category_name = categoria_result[0]['nombre'] if categoria_result else "Sin categoría"
            
            # Re-enviar email de notificación
            email_success = email_service.send_post_notification(
                post_data=post_data,
                category_name=category_name
            )
            
            if email_success:
                # Actualizar la marca de email enviado en la base de datos
                db_ops.execute_query(
                    UPDATE_POST_EMAIL_SENT,
                    (True, post_id),
                    fetch=False
                )
                
                print(f"✅ [EMAIL-RESEND] Notificación re-enviada exitosamente para post {post_id}")
                
                return jsonify({
                    'success': True,
                    'message': 'Email de notificación re-enviado correctamente',
                    'post_title': post_data['titulo']
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Error al re-enviar el email de notificación'
                }), 500
                
        except Exception as email_error:
            print(f"❌ [EMAIL-RESEND] Error al re-enviar notificación para post {post_id}: {str(email_error)}")
            return jsonify({
                'success': False,
                'error': f'Error en el servicio de email: {str(email_error)}'
            }), 500
        
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR CRÍTICO en resend_post_email(id={post_id}): {str(e)}\n{error_details}")
        return jsonify({'success': False, 'error': f'Error al re-enviar email para post {post_id}: {str(e)}'}), 500

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
        db_ops = MySQLConnection() # AÑADIDO
        existing = db_ops.execute_query(GET_POST_BY_ID, (post_id,))
        if not existing:
            return jsonify({
                'success': False,
                'error': 'Post no encontrado'
            }), 404
        
        # Eliminar post
        result = db_ops.execute_query(
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

@bienestar_bp.route('/posts/<int:post_id>/postular', methods=['POST'])
def postular_al_post(post_id):
    """
    Permite a un usuario autenticado postularse a un post específico.
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'success': False, 'error': 'Token no proporcionado'}), 401

    token = None
    try:
        # Espera un token "Bearer <token>"
        token = auth_header.split(' ')[1]
    except IndexError:
        return jsonify({'success': False, 'error': 'Token malformado. Debe ser "Bearer <token>"'}), 401

    payload = verificar_token(token)
    if not payload:
        return jsonify({'success': False, 'error': 'Token inválido o expirado'}), 401

    usuario_id_autenticado = payload.get('sub')
    if not usuario_id_autenticado:
         return jsonify({'success': False, 'error': 'ID de usuario no encontrado en el token'}), 401

    db_ops = MySQLConnection()

    # 1. Verificar que el post exista
    post_existente = db_ops.execute_query(GET_POST_BY_ID, (post_id,))
    if not post_existente:
        return jsonify({'success': False, 'error': 'Post no encontrado'}), 404

    # 2. (Opcional pero recomendado) Verificar si el post es de la categoría "Postulaciones"
    # Asumimos que post_schema y las queries devuelven 'categoria_nombre' o similar
    # Esta parte es conceptual, la implementación exacta de post_schema puede variar.
    # Para simplificar, la omitimos por ahora, pero es una buena validación.
    # post_data_raw = post_existente[0]
    # if post_data_raw.get('categoria_nombre', '').lower() != 'postulaciones':
    #    return jsonify({'success': False, 'error': 'Este post no admite postulaciones directas por esta vía.'}), 400


    # 3. Verificar si el usuario ya se postuló a este post
    ya_postulado = db_ops.execute_query(CHECK_EXISTING_POSTULACION, (post_id, usuario_id_autenticado))
    if ya_postulado: # si la consulta devuelve alguna fila, significa que ya existe
        return jsonify({'success': False, 'error': 'Ya te has postulado a esta oferta'}), 409 # 409 Conflict

    # 4. Registrar la postulación
    result = db_ops.execute_query(
        INSERT_POSTULACION,
        (post_id, usuario_id_autenticado),
        fetch=False  # Es una inserción, no esperamos un fetch de datos
    )

    if not result or result.get('affected_rows', 0) == 0:
        # Este error podría ocurrir si hay un problema con la BD o la query
        print(f"Error al insertar postulación: post_id={post_id}, usuario_id={usuario_id_autenticado}, result={result}")
        return jsonify({'success': False, 'error': 'No se pudo registrar la postulación debido a un error interno'}), 500

    # (Opcional) Podrías querer devolver información del usuario que se postuló, o el ID de la postulación
    # usuario_info = obtener_usuario_por_id(usuario_id_autenticado) # Si quieres devolver datos del usuario

    return jsonify({
        'success': True,
        'message': 'Postulación registrada correctamente'
        # 'postulante_id': usuario_id_autenticado, # Opcional
        # 'postulante_nombre': usuario_info.get('nombre') if usuario_info else None # Opcional
    }), 201 

@bienestar_bp.route('/posts/<int:post_id>/postulacion/status', methods=['GET'])
def get_estado_postulacion(post_id):
    """
    Verifica si el usuario autenticado actual ya se ha postulado a un post específico.
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'success': False, 'error': 'Token no proporcionado'}), 401

    token = None
    try:
        token = auth_header.split(' ')[1]
    except IndexError:
        return jsonify({'success': False, 'error': 'Token malformado'}), 401

    payload = verificar_token(token)
    if not payload:
        return jsonify({'success': False, 'error': 'Token inválido o expirado'}), 401

    usuario_id_autenticado = payload.get('sub')
    if not usuario_id_autenticado:
         return jsonify({'success': False, 'error': 'ID de usuario no encontrado en el token'}), 401

    db_ops = MySQLConnection()

    # Verificar que el post exista (opcional, pero buena práctica)
    post_existente = db_ops.execute_query(GET_POST_BY_ID, (post_id,))
    if not post_existente:
        return jsonify({'success': False, 'error': 'Post no encontrado'}), 404

    # Verificar si el usuario ya se postuló
    postulacion_existente = db_ops.execute_query(CHECK_EXISTING_POSTULACION, (post_id, usuario_id_autenticado))
    
    if postulacion_existente: # Si la consulta devuelve alguna fila
        return jsonify({'success': True, 'data': {'postulado': True}})
    else:
        # Podría ser que la query devuelva None si hay un error, o una lista vacía si no hay match
        if postulacion_existente is None:
            # Esto indicaría un error en la consulta, no que no esté postulado
            return jsonify({'success': False, 'error': 'Error al verificar el estado de la postulación'}), 500
        return jsonify({'success': True, 'data': {'postulado': False}})

@bienestar_bp.route('/posts/<int:post_id>/postulantes', methods=['GET'])
def get_postulantes_del_post(post_id):
    """
    Obtiene la lista de usuarios que se han postulado a un post específico.
    Requiere autenticación (aunque la protección específica del endpoint no está implementada aquí).
    """
    # Se podría añadir verificación de token aquí si se requiere que solo ciertos usuarios vean esto.
    # Por ahora, asumimos que el acceso está gestionado a nivel de frontend o configuración de red.

    db_ops = MySQLConnection()

    # 1. Verificar que el post exista y sea de la categoría correcta (opcional pero recomendado)
    post_existente = db_ops.execute_query(GET_POST_BY_ID, (post_id,))
    if not post_existente:
        return jsonify({'success': False, 'error': 'Post no encontrado'}), 404
    
    # Podríamos verificar si post_existente[0]['categoria_nombre'] == 'Postulaciones'
    # Pero la query GET_POSTULANTES_BY_POST_ID ya filtra por post_id, así que es implícito.

    # 2. Obtener los postulantes
    try:
        postulantes_data = db_ops.execute_query(GET_POSTULANTES_BY_POST_ID, (post_id,))
        
        if postulantes_data is None:
            # Esto indicaría un error en la consulta SQL en sí misma.
            print(f"Error crítico al ejecutar GET_POSTULANTES_BY_POST_ID para post_id={post_id}")
            return jsonify({'success': False, 'error': 'Error interno al obtener postulantes'}), 500

        # Importar el schema aquí para evitar importación circular si estuviera en models.py y models importara de routes
        from ..models import postulante_schema 
        serialized_postulantes = [postulante_schema(p) for p in postulantes_data]
        
        return jsonify({
            'success': True,
            'data': serialized_postulantes
        })

    except Exception as e:
        error_details = traceback.format_exc()
        print(f"ERROR CRÍTICO en get_postulantes_del_post(post_id={post_id}): {str(e)}\n{error_details}")
        return jsonify({
            'success': False, 
            'error': f'Error interno del servidor: {str(e)}',
            'details': error_details
        }), 500 

@bienestar_bp.route('/posts/upload-image', methods=['POST'])
def upload_image():
    """
    Endpoint para subir imágenes para posts usando AWS S3.
    """
    try:
        # Importar nuestro sistema centralizado S3
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'utils'))
        from upload_utils import UploadManager, UploadType
        
        # Verificar token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Token de autorización requerido'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verificar_token(token)
        if not payload:
            return jsonify({'success': False, 'error': 'Token inválido'}), 401
        
        # Verificar que se envió un archivo
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No se encontró ninguna imagen'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No se seleccionó ningún archivo'}), 400
        
        # Validar archivo usando el sistema centralizado
        file_size = len(file.read())
        file.seek(0)  # Reset file pointer
        
        # Detectar MIME type
        import mimetypes
        mime_type, _ = mimetypes.guess_type(file.filename)
        if not mime_type:
            mime_type = file.content_type or 'application/octet-stream'
        
        # Validar con UploadManager
        is_valid, error_msg = UploadManager.validate_file(
            file_size=file_size,
            filename=file.filename,
            mime_type=mime_type,
            upload_type=UploadType.POSTS
        )
        
        if not is_valid:
            return jsonify({'success': False, 'error': error_msg}), 400
        
        # Generar nombre único para S3
        from datetime import datetime
        import uuid
        
        file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'jpg'
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        unique_filename = f"post_image_{timestamp}_{unique_id}.{file_extension}"
        
        # Subir archivo a S3
        success, s3_url, error_message = UploadManager.upload_file(
            file_data=file,
            filename=unique_filename,
            upload_type=UploadType.POSTS
        )
        
        if not success:
            print(f"❌ Error subiendo a S3: {error_message}")
            return jsonify({'success': False, 'error': f'Error subiendo archivo: {error_message}'}), 500
        
        print(f"✅ Imagen subida exitosamente a S3: {s3_url}")
        
        return jsonify({
            'success': True,
            'url': s3_url,
            'filename': unique_filename,
            'message': 'Imagen subida exitosamente a S3'
        })
        
    except Exception as e:
        print(f"❌ Error al subir imagen: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': 'Error interno del servidor'}), 500