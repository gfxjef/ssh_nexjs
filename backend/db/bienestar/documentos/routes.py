import os
import uuid
import logging
from datetime import datetime
from flask import request, jsonify, send_from_directory, current_app, abort, redirect
from werkzeug.utils import secure_filename
from urllib.parse import unquote
import shutil

from . import documentos_bp
from .models import Document, DocumentCategory, DocumentTag, DocumentAudit
from .utils import FileValidator, FileManager, DocumentUtils, SearchHelper
from .queries import (
    GET_ALL_DOCUMENTS, GET_DOCUMENTS_BY_CATEGORY, GET_DOCUMENTS_BY_TAG,
    GET_DOCUMENT_BY_ID, GET_DOCUMENT_WITH_TAGS, SEARCH_DOCUMENTS,
    INSERT_DOCUMENT, UPDATE_DOCUMENT, DELETE_DOCUMENT, UPDATE_DOCUMENT_STATUS,
    GET_ALL_DOCUMENT_CATEGORIES, GET_ALL_TAGS,
    ADD_TAG_TO_DOCUMENT, LOG_DOCUMENT_ACTION, INCREMENT_DOWNLOADS
)
from ...mysql_connection import MySQLConnection
from ...login import verificar_token, obtener_usuario_por_id
from .permissions import require_permission, require_auth, get_current_user, has_permission, get_user_from_token

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración de archivos permitidos
ALLOWED_EXTENSIONS = {
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'txt', 'rtf', 'jpg', 'jpeg', 'png', 'gif', 'bmp',
    'zip', 'rar', '7z', 'mp4', 'avi', 'mov', 'wmv'
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

def get_upload_dir():
    """Obtiene la carpeta de subida de documentos (sistema centralizado)."""
    from ...utils.upload_utils import UploadManager, UploadType
    
    # Usar sistema centralizado
    upload_dir = UploadManager.ensure_upload_directory(UploadType.DOCUMENTOS)
    return upload_dir

def allowed_file(filename):
    """Verifica si la extensión del archivo es permitida."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_size(file):
    """Obtiene el tamaño del archivo."""
    file.seek(0, 2)  # Mover al final del archivo
    size = file.tell()
    file.seek(0)  # Volver al inicio
    return size

def copy_file_to_backend(ruta_archivo):
    """
    Copia un archivo desde frontend/public/uploads/ a backend/uploads/documentos/
    
    Args:
        ruta_archivo (str): Ruta del archivo como "uploads/filename.ext"
        
    Returns:
        bool: True si se copió exitosamente, False en caso contrario
    """
    try:
        # Extraer solo el nombre del archivo de la ruta
        filename = os.path.basename(ruta_archivo)
        
        # Rutas de origen y destino
        frontend_path = os.path.join(current_app.root_path, '..', 'frontend', 'public', 'uploads', filename)
        backend_upload_dir = get_upload_dir()
        backend_path = os.path.join(backend_upload_dir, filename)
        
        # Normalizar rutas
        frontend_path = os.path.normpath(frontend_path)
        backend_path = os.path.normpath(backend_path)
        
        logger.info(f"Intentando copiar archivo:")
        logger.info(f"  Desde: {frontend_path}")
        logger.info(f"  Hacia: {backend_path}")
        
        # Verificar que el archivo origen existe
        if not os.path.exists(frontend_path):
            logger.error(f"Archivo origen no encontrado: {frontend_path}")
            return False
        
        # Asegurar que el directorio destino existe
        os.makedirs(backend_upload_dir, exist_ok=True)
        
        # Copiar archivo
        shutil.copy2(frontend_path, backend_path)
        
        # Verificar que se copió correctamente
        if os.path.exists(backend_path):
            logger.info(f"✅ Archivo copiado exitosamente: {filename}")
            return True
        else:
            logger.error(f"❌ Error: archivo no se copió correctamente")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error al copiar archivo: {str(e)}")
        return False

# === ENDPOINTS DE DOCUMENTOS ===

@documentos_bp.route('/upload', methods=['POST'])
@require_permission('documents.upload')
def upload_document():
    """
    Endpoint para recibir metadata de documentos (archivos ya guardados en frontend).
    
    JSON data:
        titulo: Título del documento
        descripcion: Descripción del documento
        categoria_id: ID de la categoría
        etiquetas: Lista de IDs de etiquetas
        nombre_archivo: Nombre original del archivo
        ruta_archivo: Ruta donde se guardó el archivo (desde public)
        tipo_mime: Tipo MIME del archivo
        tamaño_archivo: Tamaño en bytes
        es_publico: Boolean si es público
        autor: Autor del documento
        
    Returns:
        json: Resultado de la inserción en BD
    """
    try:
        # Obtener datos JSON (ya no FormData)
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No se enviaron datos'}), 400
        
        # Extraer campos requeridos
        titulo = data.get('titulo')
        descripcion = data.get('descripcion', '')
        categoria_id = data.get('categoria_id')
        etiquetas_list = data.get('etiquetas', [])
        nombre_archivo = data.get('nombre_archivo')
        ruta_archivo = data.get('ruta_archivo') 
        tipo_mime = data.get('tipo_mime')
        tamaño_archivo = data.get('tamaño_archivo')
        es_publico = data.get('es_publico', True)
        autor = data.get('autor', '')
        grupo = data.get('grupo', 'grupo_kossodo')  # Valor por defecto
        
        # Validaciones básicas
        if not titulo:
            return jsonify({'success': False, 'error': 'El título es requerido'}), 400
        
        if not categoria_id or not isinstance(categoria_id, int):
            return jsonify({'success': False, 'error': 'ID de categoría válido es requerido'}), 400
        
        if not nombre_archivo:
            return jsonify({'success': False, 'error': 'Nombre de archivo es requerido'}), 400
            
        if not ruta_archivo:
            return jsonify({'success': False, 'error': 'Ruta de archivo es requerida'}), 400
            
        if not tipo_mime:
            return jsonify({'success': False, 'error': 'Tipo MIME es requerido'}), 400
            
        if not tamaño_archivo or not isinstance(tamaño_archivo, int):
            return jsonify({'success': False, 'error': 'Tamaño de archivo válido es requerido'}), 400
        
        # Validar grupo empresarial
        if grupo not in ['kossodo', 'kossomet', 'grupo_kossodo']:
            return jsonify({'success': False, 'error': 'Grupo empresarial no válido. Debe ser: kossodo, kossomet o grupo_kossodo'}), 400
        
        # Insertar documento en base de datos
        db_ops = MySQLConnection()
        
        try:
            # Verificar que la categoría existe
            categoria = db_ops.execute_query(
                "SELECT id FROM categorias_documentos WHERE id = %s", 
                (categoria_id,)
            )
            
            if not categoria:
                return jsonify({'success': False, 'error': 'Categoría no encontrada'}), 400
            
            # Obtener usuario actual desde el token
            current_user = get_user_from_token()
            user_id = current_user.get('id') if current_user else 149
            
            # Asegurar que user_id es un entero
            user_id = int(user_id) if user_id else 149
            
            # Insertar documento en BD
            result = db_ops.execute_query(
                INSERT_DOCUMENT,
                (
                    titulo,
                    descripcion,
                    nombre_archivo,      # nombre_archivo original
                    ruta_archivo,        # ruta_archivo desde frontend
                    tamaño_archivo,      # tamaño_archivo
                    tipo_mime,           # tipo_mime
                    categoria_id,
                    user_id,             # subido_por (usuario_id desde token)
                    es_publico,          # es_publico
                    'activo',            # estado
                    grupo                # grupo empresarial
                ),
                fetch=False
            )
            
            # Extraer el ID del documento del resultado
            if result and isinstance(result, dict) and 'last_insert_id' in result:
                documento_id = result['last_insert_id']
            else:
                return jsonify({'success': False, 'error': 'Error al guardar documento en base de datos'}), 500
            
            # Procesar etiquetas si se proporcionaron
            if etiquetas_list and isinstance(etiquetas_list, list):
                for etiqueta_id in etiquetas_list:
                    if isinstance(etiqueta_id, int):
                        # Verificar que la etiqueta existe
                        etiqueta = db_ops.execute_query(
                            "SELECT id FROM etiquetas_documentos WHERE id = %s", 
                            (etiqueta_id,)
                        )
                        
                        if etiqueta:
                            # Insertar relación documento-etiqueta
                            db_ops.execute_query(
                                ADD_TAG_TO_DOCUMENT,
                                (documento_id, etiqueta_id),
                                fetch=False
                            )
            
            # Registrar auditoría
            db_ops.execute_query(
                LOG_DOCUMENT_ACTION,
                (
                    documento_id,
                    user_id,             # usuario_id desde token
                    'upload',
                    '127.0.0.1',         # ip_address (placeholder)
                    'Sistema',           # user_agent (placeholder)
                    f'Documento subido: {titulo}'
                ),
                fetch=False
            )
            
            logger.info(f"Documento guardado en BD - ID: {documento_id}, Título: {titulo}, Ruta: {ruta_archivo}")
            
            # El archivo ya está en el sistema centralizado frontend/public/uploads/
            # No necesitamos copiar, el sistema centralizado maneja todo
            logger.info(f"📁 Archivo registrado en sistema centralizado: {ruta_archivo}")
            
            return jsonify({
                'success': True,
                'message': 'Documento registrado exitosamente en base de datos',
                'data': {
                    'id': documento_id,
                    'titulo': titulo,
                    'nombre_archivo': nombre_archivo,
                    'ruta_archivo': ruta_archivo,
                    'tamaño': tamaño_archivo
                }
            })
            
        except Exception as e:
            logger.error(f"Error en base de datos: {str(e)}")
            return jsonify({'success': False, 'error': f'Error en base de datos: {str(e)}'}), 500
        
    except Exception as e:
        logger.error(f"Error en upload_document: {str(e)}")
        return jsonify({'success': False, 'error': f'Error interno: {str(e)}'}), 500

@documentos_bp.route('/download/<int:documento_id>', methods=['GET'])
@require_permission('documents.download')
def download_document(documento_id):
    """
    Endpoint para descargar documentos.
    
    Args:
        documento_id (int): ID del documento
        
    Returns:
        file: Archivo descargado
    """
    try:
        db_ops = MySQLConnection()
        
        # Obtener información del documento
        documento = db_ops.execute_query(GET_DOCUMENT_BY_ID, (documento_id,))
        
        if not documento:
            return jsonify({'success': False, 'error': 'Documento no encontrado'}), 404
        
        doc_data = documento[0]
        
        # Verificar que el documento esté activo
        if doc_data['estado'] != 'activo':
            return jsonify({'success': False, 'error': 'Documento no disponible'}), 403
        
        # Verificar que el archivo existe en el sistema centralizado
        from ...utils.upload_utils import UploadManager, UploadType
        
        # Construir ruta en sistema centralizado usando la ruta_archivo de BD
        ruta_archivo = doc_data.get('ruta_archivo', '')
        if ruta_archivo.startswith('/uploads/'):
            # Es una ruta centralizada, convertir a ruta física
            filename = os.path.basename(ruta_archivo)
            file_path = UploadManager.get_upload_path(UploadType.DOCUMENTOS, filename)
        else:
            # Fallback a método legacy
            upload_dir = get_upload_dir()
            file_path = os.path.join(upload_dir, doc_data['nombre_archivo'])
        
        if not os.path.exists(file_path):
            return jsonify({'success': False, 'error': 'Archivo no encontrado en el servidor'}), 404
        
        # Incrementar contador de descargas
        db_ops.execute_query(
            "UPDATE documentos SET descargas = descargas + 1 WHERE id = %s",
            (documento_id,),
            fetch=False
        )
        
        # Registrar auditoría
        db_ops.execute_query(
            LOG_DOCUMENT_ACTION,
            (
                documento_id,
                149,  # usuario_id admin
                'download',
                '127.0.0.1',  # ip_address (placeholder)
                'Sistema',    # user_agent (placeholder)
                'Documento descargado'
            ),
            fetch=False
        )
        
        # Enviar archivo
        return send_from_directory(
            upload_dir,
            doc_data['nombre_archivo'],
            as_attachment=True,
            download_name=doc_data['nombre_original']
        )
        
    except Exception as e:
        logger.error(f"Error en download_document: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al descargar: {str(e)}'}), 500

@documentos_bp.route('/files/<path:filename>')
def serve_file(filename):
    """
    Endpoint para servir archivos directamente (para preview/viewer).
    A diferencia de download, este NO fuerza la descarga.
    
    Args:
        filename (str): Nombre del archivo a servir (puede estar URL-encoded)
        
    Returns:
        file: Archivo servido con headers apropiados para preview
    """
    try:
        # Decodificar el nombre del archivo desde URL encoding
        decoded_filename = unquote(filename)
        
        # Usar sistema centralizado
        from ...utils.upload_utils import UploadManager, UploadType
        
        try:
            # Primero intentar con sistema centralizado
            file_path = UploadManager.get_upload_path(UploadType.DOCUMENTOS, decoded_filename)
            
            if os.path.exists(file_path):
                file_dir = os.path.dirname(file_path)
                file_name = os.path.basename(file_path)
                logger.info(f"✅ Sirviendo archivo desde sistema centralizado: {file_path}")
                return send_from_directory(file_dir, file_name, as_attachment=False)
            
            # Fallback a sistema legacy
            upload_dir = get_upload_dir()
            legacy_file_path = os.path.join(upload_dir, decoded_filename)
            
            if os.path.exists(legacy_file_path):
                logger.info(f"⚠️ Sirviendo archivo desde sistema legacy: {legacy_file_path}")
                return send_from_directory(upload_dir, decoded_filename, as_attachment=False)
                
        except Exception as e:
            logger.error(f"Error accediendo archivo centralizado: {str(e)}")
        
        # Si no se encuentra en ningún sistema
        logger.error(f"Archivo no encontrado: {decoded_filename}")
        abort(404)
        
    except Exception as e:
        logger.error(f"Error en serve_file: {str(e)}")
        abort(500)

@documentos_bp.route('/', methods=['GET'])
@require_permission('documents.view')
def get_documents():
    """
    Obtiene documentos con filtros opcionales.
    
    Query params:
        categoria (int): ID de categoría
        etiqueta (int): ID de etiqueta
        search (str): Término de búsqueda
        estado (str): Estado del documento
        page (int): Página (para paginación)
        limit (int): Límite por página
        
    Returns:
        json: Lista de documentos
    """
    try:
        db_ops = MySQLConnection()
        
        # Obtener parámetros de consulta
        categoria_id = request.args.get('categoria')
        etiqueta_id = request.args.get('etiqueta')
        search_term = request.args.get('search')
        estado = request.args.get('estado', 'activo')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        
        documentos = []
        
        if search_term:
            # Búsqueda por término
            search_param = f'%{search_term}%'
            documentos = db_ops.execute_query(SEARCH_DOCUMENTS, (search_param, search_param))
        elif categoria_id and categoria_id.isdigit():
            # Filtrar por categoría
            documentos = db_ops.execute_query(GET_DOCUMENTS_BY_CATEGORY, (int(categoria_id),))
        elif etiqueta_id and etiqueta_id.isdigit():
            # Filtrar por etiqueta
            documentos = db_ops.execute_query(GET_DOCUMENTS_BY_TAG, (int(etiqueta_id),))
        else:
            # Obtener todos los documentos
            documentos = db_ops.execute_query(GET_ALL_DOCUMENTS)
        
        if documentos is None:
            documentos = []
        
        # Aplicar filtro de estado
        if estado != 'todos':
            documentos = [doc for doc in documentos if doc['estado'] == estado]
        
        # Aplicar paginación
        total = len(documentos)
        start = (page - 1) * limit
        end = start + limit
        documentos_paginados = documentos[start:end]
        
        return jsonify({
            'success': True,
            'data': documentos_paginados,
            'pagination': {
                'total': total,
                'page': page,
                'limit': limit,
                'pages': (total + limit - 1) // limit
            }
        })
        
    except Exception as e:
        logger.error(f"Error en get_documents: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al obtener documentos: {str(e)}'}), 500

@documentos_bp.route('/<int:documento_id>', methods=['GET'])
def get_document(documento_id):
    """
    Obtiene un documento específico por ID.
    
    Args:
        documento_id (int): ID del documento
        
    Returns:
        json: Datos del documento
    """
    try:
        db_ops = MySQLConnection()
        
        # Obtener documento con sus etiquetas
        documento = db_ops.execute_query(GET_DOCUMENT_WITH_TAGS, (documento_id,))
        
        if not documento:
            return jsonify({'success': False, 'error': 'Documento no encontrado'}), 404
        
        return jsonify({
            'success': True,
            'data': documento[0]
        })
        
    except Exception as e:
        logger.error(f"Error en get_document: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al obtener documento: {str(e)}'}), 500

# === ENDPOINTS DE CATEGORÍAS ===

@documentos_bp.route('/categorias', methods=['GET'])
@documentos_bp.route('/api/categories', methods=['GET'])
def get_categories():
    """
    Obtiene todas las categorías de documentos.
    
    Returns:
        json: Lista de categorías
    """
    try:
        category_model = DocumentCategory()
        categorias = category_model.get_all()
        
        return jsonify({
            'success': True,
            'data': categorias or []
        })
        
    except Exception as e:
        logger.error(f"Error en get_categories: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al obtener categorías: {str(e)}'}), 500

# === ENDPOINTS DE ETIQUETAS ===

@documentos_bp.route('/etiquetas', methods=['GET'])
def get_tags():
    """
    Obtiene todas las etiquetas de documentos.
    
    Returns:
        json: Lista de etiquetas
    """
    try:
        db_ops = MySQLConnection()
        etiquetas = db_ops.execute_query(GET_ALL_TAGS)
        
        return jsonify({
            'success': True,
            'data': etiquetas or []
        })
        
    except Exception as e:
        logger.error(f"Error en get_tags: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al obtener etiquetas: {str(e)}'}), 500

# === ENDPOINTS DE ADMINISTRACIÓN ===

@documentos_bp.route('/<int:documento_id>/estado', methods=['PATCH'])
def update_document_status(documento_id):
    """
    Actualiza el estado de un documento.
    
    Args:
        documento_id (int): ID del documento
        
    Body:
        estado (str): Nuevo estado
        
    Returns:
        json: Resultado de la actualización
    """
    try:
        data = request.get_json()
        if not data or 'estado' not in data:
            return jsonify({'success': False, 'error': 'Estado es requerido'}), 400
        
        nuevo_estado = data['estado']
        if nuevo_estado not in ['activo', 'inactivo', 'eliminado']:
            return jsonify({'success': False, 'error': 'Estado no válido'}), 400
        
        db_ops = MySQLConnection()
        
        # Verificar que el documento existe
        documento = db_ops.execute_query(GET_DOCUMENT_BY_ID, (documento_id,))
        if not documento:
            return jsonify({'success': False, 'error': 'Documento no encontrado'}), 404
        
        # Actualizar estado
        db_ops.execute_query(
            UPDATE_DOCUMENT_STATUS,
            (nuevo_estado, documento_id),
            fetch=False
        )
        
        # Registrar auditoría
        db_ops.execute_query(
            LOG_DOCUMENT_ACTION,
            (
                documento_id,
                149,  # usuario_id admin
                'status_change',
                '127.0.0.1',  # ip_address (placeholder)
                'Sistema',    # user_agent (placeholder)
                f'Estado cambiado a: {nuevo_estado}'
            ),
            fetch=False
        )
        
        return jsonify({
            'success': True,
            'message': f'Estado actualizado a: {nuevo_estado}'
        })
        
    except Exception as e:
        logger.error(f"Error en update_document_status: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al actualizar estado: {str(e)}'}), 500

@documentos_bp.route('/<int:documento_id>', methods=['DELETE'])
def delete_document(documento_id):
    """
    Elimina un documento (marca como eliminado).
    
    Args:
        documento_id (int): ID del documento
        
    Returns:
        json: Resultado de la eliminación
    """
    try:
        db_ops = MySQLConnection()
        
        # Verificar que el documento existe
        documento = db_ops.execute_query(GET_DOCUMENT_BY_ID, (documento_id,))
        if not documento:
            return jsonify({'success': False, 'error': 'Documento no encontrado'}), 404
        
        # Marcar como eliminado
        db_ops.execute_query(
            UPDATE_DOCUMENT_STATUS,
            ('eliminado', documento_id),
            fetch=False
        )
        
        # Registrar auditoría
        db_ops.execute_query(
            LOG_DOCUMENT_ACTION,
            (
                documento_id,
                149,  # usuario_id admin
                'delete',
                '127.0.0.1',  # ip_address (placeholder)
                'Sistema',    # user_agent (placeholder)
                'Documento eliminado'
            ),
            fetch=False
        )
        
        return jsonify({
            'success': True,
            'message': 'Documento eliminado exitosamente'
        })
        
    except Exception as e:
        logger.error(f"Error en delete_document: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al eliminar documento: {str(e)}'}), 500

# === ENDPOINTS DE BÚSQUEDA AVANZADA ===

@documentos_bp.route('/api/search/suggestions', methods=['GET'])
@require_permission('documents.view')
def get_search_suggestions():
    """
    Obtiene sugerencias de búsqueda para autocompletado.
    
    Query params:
        q (str): Término de búsqueda
        limit (int): Número máximo de sugerencias (default: 10)
        
    Returns:
        json: Lista de sugerencias
    """
    try:
        search_term = request.args.get('q', '').strip()
        limit = min(int(request.args.get('limit', 10)), 20)  # Máximo 20 sugerencias
        
        if len(search_term) < 2:
            return jsonify({
                'success': True,
                'data': {
                    'suggestions': [],
                    'categories': [],
                    'tags': []
                }
            })
        
        db_ops = MySQLConnection()
        search_pattern = f'%{search_term}%'
        
        # Sugerencias de títulos de documentos
        document_suggestions = db_ops.execute_query(
            """
            SELECT DISTINCT titulo, categoria_id 
            FROM documentos 
            WHERE titulo LIKE %s AND estado = 'activo' 
            ORDER BY descargas DESC, created_at DESC
            LIMIT %s
            """,
            (search_pattern, limit)
        ) or []
        
        # Sugerencias de categorías
        category_suggestions = db_ops.execute_query(
            """
            SELECT DISTINCT nombre, color, icono
            FROM categorias_documentos 
            WHERE nombre LIKE %s 
            ORDER BY nombre 
            LIMIT 5
            """,
            (search_pattern,)
        ) or []
        
        # Sugerencias de etiquetas
        tag_suggestions = db_ops.execute_query(
            """
            SELECT DISTINCT nombre, color
            FROM etiquetas_documentos 
            WHERE nombre LIKE %s 
            ORDER BY nombre 
            LIMIT 5
            """,
            (search_pattern,)
        ) or []
        
        return jsonify({
            'success': True,
            'data': {
                'suggestions': [{'title': doc['titulo'], 'category_id': doc['categoria_id']} for doc in document_suggestions],
                'categories': category_suggestions,
                'tags': tag_suggestions
            }
        })
        
    except Exception as e:
        logger.error(f"Error en get_search_suggestions: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al obtener sugerencias: {str(e)}'}), 500


@documentos_bp.route('/api/search/advanced', methods=['GET'])
@require_permission('documents.view')
def advanced_search():
    """
    Búsqueda avanzada con múltiples filtros y ranking de relevancia.
    
    Query params:
        q (str): Término de búsqueda
        categories (str): IDs de categorías separadas por coma
        tags (str): IDs de etiquetas separadas por coma
        date_from (str): Fecha desde (YYYY-MM-DD)
        date_to (str): Fecha hasta (YYYY-MM-DD)
        file_types (str): Tipos de archivo separados por coma
        min_downloads (int): Número mínimo de descargas
        page (int): Página
        limit (int): Límite por página
        
    Returns:
        json: Resultados de búsqueda con ranking de relevancia
    """
    try:
        # Obtener parámetros
        search_term = request.args.get('q', '').strip()
        categories = request.args.get('categories', '')
        tags = request.args.get('tags', '')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        file_types = request.args.get('file_types', '')
        min_downloads = int(request.args.get('min_downloads', 0))
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        
        db_ops = MySQLConnection()
        
        # Construir query con ranking de relevancia
        base_query = """
        SELECT d.*, c.nombre as categoria_nombre, c.color as categoria_color, c.icono as categoria_icono,
               'Sistema' as subido_por_nombre,
               GROUP_CONCAT(DISTINCT CONCAT(e.id, ':', e.nombre, ':', e.color) SEPARATOR '|') as etiquetas,
               (
                 CASE 
                   WHEN d.titulo LIKE %s THEN 3
                   WHEN d.descripcion LIKE %s THEN 2  
                   WHEN e.nombre LIKE %s THEN 1
                   ELSE 0
                 END + 
                 (d.descargas / 10) +
                 CASE WHEN d.es_publico = 1 THEN 0.5 ELSE 0 END
               ) as relevance_score
        FROM documentos d
        JOIN categorias_documentos c ON d.categoria_id = c.id
        LEFT JOIN documento_etiquetas de ON d.id = de.documento_id
        LEFT JOIN etiquetas_documentos e ON de.etiqueta_id = e.id
        """
        
        # Construir condiciones WHERE
        where_conditions = ["d.estado = 'activo'"]
        params = []
        
        # Agregar parámetros de búsqueda si existe término
        if search_term:
            search_pattern = f'%{search_term}%'
            params.extend([search_pattern, search_pattern, search_pattern])
            where_conditions.append("(d.titulo LIKE %s OR d.descripcion LIKE %s OR e.nombre LIKE %s)")
        else:
            # Si no hay término de búsqueda, usar parámetros dummy para el scoring
            params.extend(['', '', ''])
        
        # Filtro por categorías
        if categories:
            category_ids = [int(cid) for cid in categories.split(',') if cid.isdigit()]
            if category_ids:
                placeholders = ','.join(['%s'] * len(category_ids))
                where_conditions.append(f"d.categoria_id IN ({placeholders})")
                params.extend(category_ids)
        
        # Filtro por etiquetas
        if tags:
            tag_ids = [int(tid) for tid in tags.split(',') if tid.isdigit()]
            if tag_ids:
                placeholders = ','.join(['%s'] * len(tag_ids))
                where_conditions.append(f"de.etiqueta_id IN ({placeholders})")
                params.extend(tag_ids)
        
        # Filtro por fechas
        if date_from:
            where_conditions.append("DATE(d.created_at) >= %s")
            params.append(date_from)
            
        if date_to:
            where_conditions.append("DATE(d.created_at) <= %s")
            params.append(date_to)
        
        # Filtro por tipos de archivo
        if file_types:
            types = [t.strip().lower() for t in file_types.split(',')]
            type_conditions = []
            for file_type in types:
                if file_type in ['pdf', 'doc', 'docx', 'txt', 'excel', 'xls', 'xlsx', 'image']:
                    if file_type == 'excel':
                        type_conditions.append("d.tipo_mime LIKE '%spreadsheet%'")
                    elif file_type == 'image':
                        type_conditions.append("d.tipo_mime LIKE 'image/%'")
                    else:
                        type_conditions.append("d.tipo_mime LIKE %s")
                        params.append(f'%{file_type}%')
            
            if type_conditions:
                where_conditions.append(f"({' OR '.join(type_conditions)})")
        
        # Filtro por descargas mínimas
        if min_downloads > 0:
            where_conditions.append("d.descargas >= %s")
            params.append(min_downloads)
        
        # Construir query completa
        if where_conditions:
            base_query += " WHERE " + " AND ".join(where_conditions)
        
        base_query += " GROUP BY d.id ORDER BY relevance_score DESC, d.created_at DESC"
        
        # Ejecutar query para contar total
        count_query = base_query.replace(
            "SELECT d.*, c.nombre as categoria_nombre, c.color as categoria_color, c.icono as categoria_icono, 'Sistema' as subido_por_nombre, GROUP_CONCAT(DISTINCT CONCAT(e.id, ':', e.nombre, ':', e.color) SEPARATOR '|') as etiquetas, (",
            "SELECT COUNT(DISTINCT d.id) as total FROM (SELECT d.id, ("
        ).replace("ORDER BY relevance_score DESC, d.created_at DESC", ") as relevance_score FROM documentos d JOIN categorias_documentos c ON d.categoria_id = c.id LEFT JOIN documento_etiquetas de ON d.id = de.documento_id LEFT JOIN etiquetas_documentos e ON de.etiqueta_id = e.id GROUP BY d.id) counted_results")
        
        # Obtener total (simplificado)
        all_results = db_ops.execute_query(base_query, params) or []
        total = len(all_results)
        
        # Aplicar paginación
        offset = (page - 1) * limit
        paginated_query = base_query + f" LIMIT {limit} OFFSET {offset}"
        documentos = db_ops.execute_query(paginated_query, params) or []
        
        # Procesar etiquetas para cada documento
        for doc in documentos:
            if doc.get('etiquetas'):
                etiquetas_list = []
                for etiqueta_info in doc['etiquetas'].split('|'):
                    if etiqueta_info:
                        parts = etiqueta_info.split(':')
                        if len(parts) == 3:
                            etiquetas_list.append({
                                'id': int(parts[0]),
                                'nombre': parts[1],
                                'color': parts[2]
                            })
                doc['etiquetas'] = etiquetas_list
            else:
                doc['etiquetas'] = []
        
        return jsonify({
            'success': True,
            'data': documentos,
            'pagination': {
                'total': total,
                'page': page,
                'limit': limit,
                'pages': (total + limit - 1) // limit if total > 0 else 1,
                'has_next': page * limit < total,
                'has_prev': page > 1
            },
            'search_info': {
                'query': search_term,
                'categories': categories,
                'tags': tags,
                'date_range': [date_from, date_to] if date_from or date_to else None,
                'file_types': file_types.split(',') if file_types else [],
                'min_downloads': min_downloads
            }
        })
        
    except Exception as e:
        logger.error(f"Error en advanced_search: {str(e)}")
        return jsonify({'success': False, 'error': f'Error en búsqueda avanzada: {str(e)}'}), 500


# === ENDPOINTS DE ESTADÍSTICAS ===

@documentos_bp.route('/stats', methods=['GET'])
def get_document_stats():
    """
    Obtiene estadísticas de documentos.
    
    Returns:
        json: Estadísticas
    """
    try:
        db_ops = MySQLConnection()
        
        # Obtener contadores básicos
        stats = {}
        
        # Total de documentos por estado
        stats['total_documentos'] = db_ops.execute_query(
            "SELECT COUNT(*) as total FROM documentos WHERE estado = 'activo'"
        )[0]['total']
        
        # Documentos por categoría
        stats['por_categoria'] = db_ops.execute_query(
            "SELECT c.nombre, COUNT(d.id) as total FROM categorias_documentos c LEFT JOIN documentos d ON c.id = d.categoria_id AND d.estado = 'activo' GROUP BY c.id, c.nombre"
        )
        
        # Documentos subidos en los últimos 30 días
        stats['subidos_mes'] = db_ops.execute_query(
            "SELECT COUNT(*) as total FROM documentos WHERE estado = 'activo' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
        )[0]['total']
        
        # Total de descargas
        stats['total_descargas'] = db_ops.execute_query(
            "SELECT SUM(descargas) as total FROM documentos WHERE estado = 'activo'"
        )[0]['total'] or 0
        
        return jsonify({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        logger.error(f"Error en get_document_stats: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al obtener estadísticas: {str(e)}'}), 500


# === ENDPOINTS CRUD PARA CATEGORÍAS ===

@documentos_bp.route('/api/categories', methods=['POST'])
@require_permission('documents.create-category')
def create_category():
    """
    Crea una nueva categoría de documentos.
    
    Body:
        nombre (str): Nombre de la categoría
        descripcion (str): Descripción de la categoría
        color (str): Color hexadecimal
        icono (str): Icono emoji
        
    Returns:
        json: Resultado de la creación
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Datos requeridos'}), 400
        
        nombre = data.get('nombre', '').strip()
        descripcion = data.get('descripcion', '').strip()
        color = data.get('color', '#3182CE')
        icono = data.get('icono', '📁')
        
        if not nombre:
            return jsonify({'success': False, 'error': 'El nombre es requerido'}), 400
        
        if len(nombre) > 100:
            return jsonify({'success': False, 'error': 'El nombre no puede tener más de 100 caracteres'}), 400
        
        # Validar color hexadecimal
        if not color.startswith('#') or len(color) != 7:
            return jsonify({'success': False, 'error': 'Color debe ser hexadecimal válido (#RRGGBB)'}), 400
        
        # Crear categoría usando el modelo
        category_model = DocumentCategory()
        category_id = category_model.create(nombre, descripcion, color, icono)
        
        if category_id:
            # Obtener la categoría creada
            nueva_categoria = category_model.get_by_id(category_id)
            return jsonify({
                'success': True,
                'message': 'Categoría creada exitosamente',
                'data': nueva_categoria
            })
        else:
            return jsonify({'success': False, 'error': 'Error al crear categoría o ya existe'}), 400
        
    except Exception as e:
        logger.error(f"Error en create_category: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al crear categoría: {str(e)}'}), 500


@documentos_bp.route('/api/categories/<int:category_id>', methods=['PUT'])
@require_permission('documents.edit-category')
def update_category(category_id):
    """
    Actualiza una categoría existente.
    
    Args:
        category_id (int): ID de la categoría
        
    Body:
        nombre (str): Nuevo nombre
        descripcion (str): Nueva descripción
        color (str): Nuevo color hexadecimal
        icono (str): Nuevo icono emoji
        
    Returns:
        json: Resultado de la actualización
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Datos requeridos'}), 400
        
        nombre = data.get('nombre', '').strip()
        descripcion = data.get('descripcion', '').strip()
        color = data.get('color', '#3182CE')
        icono = data.get('icono', '📁')
        
        if not nombre:
            return jsonify({'success': False, 'error': 'El nombre es requerido'}), 400
        
        if len(nombre) > 100:
            return jsonify({'success': False, 'error': 'El nombre no puede tener más de 100 caracteres'}), 400
        
        # Validar color hexadecimal
        if not color.startswith('#') or len(color) != 7:
            return jsonify({'success': False, 'error': 'Color debe ser hexadecimal válido (#RRGGBB)'}), 400
        
        # Actualizar categoría usando el modelo
        category_model = DocumentCategory()
        
        # Verificar que existe
        existing_category = category_model.get_by_id(category_id)
        if not existing_category:
            return jsonify({'success': False, 'error': 'Categoría no encontrada'}), 404
        
        success = category_model.update(category_id, nombre, descripcion, color, icono)
        
        if success:
            # Obtener la categoría actualizada
            categoria_actualizada = category_model.get_by_id(category_id)
            return jsonify({
                'success': True,
                'message': 'Categoría actualizada exitosamente',
                'data': categoria_actualizada
            })
        else:
            return jsonify({'success': False, 'error': 'Error al actualizar categoría'}), 400
        
    except Exception as e:
        logger.error(f"Error en update_category: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al actualizar categoría: {str(e)}'}), 500


@documentos_bp.route('/api/categories/<int:category_id>', methods=['DELETE'])
@require_permission('documents.delete-category')
def delete_category(category_id):
    """
    Elimina una categoría.
    
    Args:
        category_id (int): ID de la categoría
        
    Returns:
        json: Resultado de la eliminación
    """
    try:
        category_model = DocumentCategory()
        
        # Verificar que existe
        existing_category = category_model.get_by_id(category_id)
        if not existing_category:
            return jsonify({'success': False, 'error': 'Categoría no encontrada'}), 404
        
        # Verificar si hay documentos que usan esta categoría
        db_ops = MySQLConnection()
        count_result = db_ops.execute_query(
            "SELECT COUNT(*) as total FROM documentos WHERE categoria_id = %s AND estado != 'eliminado'",
            (category_id,)
        )
        documents_count = count_result[0]['total'] if count_result else 0
        
        if documents_count > 0:
            return jsonify({
                'success': False, 
                'error': f'No se puede eliminar. Hay {documents_count} documento(s) en esta categoría'
            }), 400
        
        success = category_model.delete(category_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Categoría eliminada exitosamente'
            })
        else:
            return jsonify({'success': False, 'error': 'Error al eliminar categoría'}), 400
        
    except Exception as e:
        logger.error(f"Error en delete_category: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al eliminar categoría: {str(e)}'}), 500


@documentos_bp.route('/api/categories/<int:category_id>', methods=['GET'])
def get_category(category_id):
    """
    Obtiene una categoría específica por ID.
    
    Args:
        category_id (int): ID de la categoría
        
    Returns:
        json: Datos de la categoría
    """
    try:
        category_model = DocumentCategory()
        categoria = category_model.get_by_id(category_id)
        
        if categoria:
            return jsonify({
                'success': True,
                'data': categoria
            })
        else:
            return jsonify({'success': False, 'error': 'Categoría no encontrada'}), 404
        
    except Exception as e:
        logger.error(f"Error en get_category: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al obtener categoría: {str(e)}'}), 500


# === ENDPOINTS CRUD PARA ETIQUETAS ===

@documentos_bp.route('/api/tags', methods=['GET'])
def get_tags_api():
    """
    Obtiene todas las etiquetas de documentos.
    
    Returns:
        json: Lista de etiquetas
    """
    try:
        tag_model = DocumentTag()
        etiquetas = tag_model.get_all()
        
        return jsonify({
            'success': True,
            'data': etiquetas or []
        })
        
    except Exception as e:
        logger.error(f"Error en get_tags_api: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al obtener etiquetas: {str(e)}'}), 500


@documentos_bp.route('/api/tags', methods=['POST'])
@require_permission('documents.create-tag')
def create_tag():
    """
    Crea una nueva etiqueta de documentos.
    
    Body:
        nombre (str): Nombre de la etiqueta
        color (str): Color hexadecimal
        
    Returns:
        json: Resultado de la creación
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Datos requeridos'}), 400
        
        nombre = data.get('nombre', '').strip()
        color = data.get('color', '#2e3954')
        
        if not nombre:
            return jsonify({'success': False, 'error': 'El nombre es requerido'}), 400
        
        if len(nombre) > 50:
            return jsonify({'success': False, 'error': 'El nombre no puede tener más de 50 caracteres'}), 400
        
        # Validar color hexadecimal
        if not color.startswith('#') or len(color) != 7:
            return jsonify({'success': False, 'error': 'Color debe ser hexadecimal válido (#RRGGBB)'}), 400
        
        # Crear etiqueta usando el modelo
        tag_model = DocumentTag()
        tag_id = tag_model.create(nombre, color)
        
        if tag_id:
            # Obtener la etiqueta creada
            nueva_etiqueta = tag_model.get_by_id(tag_id)
            return jsonify({
                'success': True,
                'message': 'Etiqueta creada exitosamente',
                'data': nueva_etiqueta
            })
        else:
            return jsonify({'success': False, 'error': 'Error al crear etiqueta o ya existe'}), 400
        
    except Exception as e:
        logger.error(f"Error en create_tag: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al crear etiqueta: {str(e)}'}), 500


@documentos_bp.route('/api/tags/<int:tag_id>', methods=['GET'])
def get_tag(tag_id):
    """
    Obtiene una etiqueta específica por ID.
    
    Args:
        tag_id (int): ID de la etiqueta
        
    Returns:
        json: Datos de la etiqueta
    """
    try:
        tag_model = DocumentTag()
        etiqueta = tag_model.get_by_id(tag_id)
        
        if etiqueta:
            return jsonify({
                'success': True,
                'data': etiqueta
            })
        else:
            return jsonify({'success': False, 'error': 'Etiqueta no encontrada'}), 404
        
    except Exception as e:
        logger.error(f"Error en get_tag: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al obtener etiqueta: {str(e)}'}), 500


@documentos_bp.route('/api/tags/<int:tag_id>', methods=['PUT'])
@require_permission('documents.edit-tag')
def update_tag(tag_id):
    """
    Actualiza una etiqueta existente.
    
    Args:
        tag_id (int): ID de la etiqueta
        
    Body:
        nombre (str): Nuevo nombre
        color (str): Nuevo color hexadecimal
        
    Returns:
        json: Resultado de la actualización
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Datos requeridos'}), 400
        
        nombre = data.get('nombre', '').strip()
        color = data.get('color', '#2e3954')
        
        if not nombre:
            return jsonify({'success': False, 'error': 'El nombre es requerido'}), 400
        
        if len(nombre) > 50:
            return jsonify({'success': False, 'error': 'El nombre no puede tener más de 50 caracteres'}), 400
        
        # Validar color hexadecimal
        if not color.startswith('#') or len(color) != 7:
            return jsonify({'success': False, 'error': 'Color debe ser hexadecimal válido (#RRGGBB)'}), 400
        
        # Actualizar etiqueta usando el modelo
        tag_model = DocumentTag()
        
        # Verificar que existe
        existing_tag = tag_model.get_by_id(tag_id)
        if not existing_tag:
            return jsonify({'success': False, 'error': 'Etiqueta no encontrada'}), 404
        
        success = tag_model.update(tag_id, nombre, color)
        
        if success:
            # Obtener la etiqueta actualizada
            etiqueta_actualizada = tag_model.get_by_id(tag_id)
            return jsonify({
                'success': True,
                'message': 'Etiqueta actualizada exitosamente',
                'data': etiqueta_actualizada
            })
        else:
            return jsonify({'success': False, 'error': 'Error al actualizar etiqueta'}), 400
        
    except Exception as e:
        logger.error(f"Error en update_tag: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al actualizar etiqueta: {str(e)}'}), 500


@documentos_bp.route('/api/tags/<int:tag_id>', methods=['DELETE'])
@require_permission('documents.delete-tag')
def delete_tag(tag_id):
    """
    Elimina una etiqueta.
    
    Args:
        tag_id (int): ID de la etiqueta
        
    Returns:
        json: Resultado de la eliminación
    """
    try:
        tag_model = DocumentTag()
        
        # Verificar que existe
        existing_tag = tag_model.get_by_id(tag_id)
        if not existing_tag:
            return jsonify({'success': False, 'error': 'Etiqueta no encontrada'}), 404
        
        # Verificar si hay documentos que usan esta etiqueta
        db_ops = MySQLConnection()
        count_result = db_ops.execute_query(
            "SELECT COUNT(*) as total FROM documento_etiquetas de JOIN documentos d ON de.documento_id = d.id WHERE de.etiqueta_id = %s AND d.estado != 'eliminado'",
            (tag_id,)
        )
        documents_count = count_result[0]['total'] if count_result else 0
        
        if documents_count > 0:
            return jsonify({
                'success': False, 
                'error': f'No se puede eliminar. Hay {documents_count} documento(s) usando esta etiqueta'
            }), 400
        
        success = tag_model.delete(tag_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Etiqueta eliminada exitosamente'
            })
        else:
            return jsonify({'success': False, 'error': 'Error al eliminar etiqueta'}), 400
        
    except Exception as e:
        logger.error(f"Error en delete_tag: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al eliminar etiqueta: {str(e)}'}), 500


# === ENDPOINTS CRUD PARA DOCUMENTOS (API REST) ===

@documentos_bp.route('/api/documents/<int:document_id>/download', methods=['GET'])
@require_permission('documents.download')
def download_document_api(document_id):
    """
    Endpoint API para descarga segura de documentos.
    Soporta tanto archivos locales como URLs de S3.
    
    Args:
        document_id (int): ID del documento
        
    Returns:
        file: Archivo descargado con headers de seguridad o redirect a S3
    """
    try:
        db_ops = MySQLConnection()
        
        # Obtener información completa del documento
        documento = db_ops.execute_query(GET_DOCUMENT_BY_ID, (document_id,))
        
        if not documento:
            return jsonify({'success': False, 'error': 'Documento no encontrado'}), 404
        
        doc_data = documento[0]
        
        # Validaciones de seguridad
        if doc_data['estado'] != 'activo':
            return jsonify({'success': False, 'error': 'Documento no disponible para descarga'}), 403
        
        # Verificar si el documento es público o si el usuario tiene permisos
        if not doc_data.get('es_publico', False):
            # Aquí se podría agregar validación de permisos de usuario más adelante
            logger.warning(f"Intento de acceso a documento privado ID: {document_id}")
        
        # Incrementar contador de descargas de forma atómica
        db_ops.execute_query(INCREMENT_DOWNLOADS, (document_id,), fetch=False)
        
        # Registrar auditoría de descarga con información detallada
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', '127.0.0.1'))
        user_agent = request.headers.get('User-Agent', 'Unknown')
        
        db_ops.execute_query(
            LOG_DOCUMENT_ACTION,
            (
                document_id,
                149,  # usuario_id admin (TODO: obtener usuario real de sesión)
                'download',
                client_ip,
                user_agent,
                f'Descarga de documento: {doc_data["titulo"]} (API)'
            ),
            fetch=False
        )
        
        # Verificar si es una URL de S3 (nueva forma)
        ruta_archivo = doc_data['ruta_archivo']
        
        if ruta_archivo and (ruta_archivo.startswith('https://') and 'amazonaws.com' in ruta_archivo):
            # Es una URL de S3 - redirigir directamente
            logger.info(f"📁 Redirigiendo descarga a S3: {ruta_archivo}")
            
            return redirect(ruta_archivo)
        
        else:
            # Es un archivo local (método anterior) - servir desde el servidor
            logger.info(f"📁 Sirviendo archivo local: {ruta_archivo}")
            
            # Extraer el nombre real del archivo de la ruta_archivo
            nombre_fisico = os.path.basename(ruta_archivo)  # 911f5f33-....txt
            
            upload_dir = get_upload_dir()
            file_path = os.path.join(upload_dir, nombre_fisico)
            
            if not os.path.exists(file_path):
                logger.error(f"Archivo físico no encontrado: {file_path}")
                logger.error(f"Ruta en BD: {ruta_archivo}, Nombre físico: {nombre_fisico}")
                return jsonify({'success': False, 'error': 'Archivo no encontrado en el servidor'}), 404
            
            # Obtener información del archivo para headers seguros
            file_size = os.path.getsize(file_path)
            mime_type = doc_data.get('tipo_mime', 'application/octet-stream')
            
            # Nombre original para descarga (usar titulo si no hay nombre_archivo original)
            download_filename = f"{doc_data['titulo']}.{doc_data['nombre_archivo'].split('.')[-1]}"
            
            logger.info(f"Descarga autorizada - Documento ID: {document_id}, IP: {client_ip}")
            
            # Preparar respuesta con headers de seguridad
            response = send_from_directory(
                upload_dir,
                nombre_fisico,  # Usar el nombre físico real del archivo
                as_attachment=True,
                download_name=download_filename,
                mimetype=mime_type
            )
            
            # Agregar headers de seguridad adicionales
            response.headers['Content-Length'] = str(file_size)
            response.headers['X-Content-Type-Options'] = 'nosniff'
            response.headers['X-Frame-Options'] = 'DENY'
            response.headers['X-XSS-Protection'] = '1; mode=block'
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            
            return response
        
    except Exception as e:
        logger.error(f"Error en download_document_api: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al descargar archivo: {str(e)}'}), 500

@documentos_bp.route('/api/documents', methods=['GET'])
def get_documents_api():
    """
    Obtiene documentos con filtros y paginación avanzada.
    
    Query params:
        categoria (int): ID de categoría
        etiqueta (int): ID de etiqueta
        grupo (str): Grupo empresarial ('kossodo', 'kossomet', 'grupo_kossodo')
        search (str): Término de búsqueda
        estado (str): Estado del documento
        page (int): Página (para paginación)
        limit (int): Límite por página
        sort (str): Campo para ordenar (titulo, fecha, descargas)
        order (str): Orden ascendente (asc) o descendente (desc)
        
    Returns:
        json: Lista de documentos con metadatos de paginación
    """
    try:
        db_ops = MySQLConnection()
        
        # Obtener parámetros de consulta
        categoria_id = request.args.get('categoria')
        etiqueta_id = request.args.get('etiqueta')
        grupo = request.args.get('grupo')
        search_term = request.args.get('search')
        estado = request.args.get('estado', 'activo')
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)  # Máximo 100 por página
        sort_field = request.args.get('sort', 'created_at')
        sort_order = request.args.get('order', 'desc')
        
        # Validar parámetros de ordenamiento
        valid_sort_fields = ['titulo', 'created_at', 'descargas', 'tamaño_archivo']
        if sort_field not in valid_sort_fields:
            sort_field = 'created_at'
        
        if sort_order not in ['asc', 'desc']:
            sort_order = 'desc'
        
        # Construir query base
        base_query = """
        SELECT d.*, c.nombre as categoria_nombre, c.color as categoria_color, c.icono as categoria_icono,
               'Sistema' as subido_por_nombre,
               GROUP_CONCAT(CONCAT(e.id, ':', e.nombre, ':', e.color) SEPARATOR '|') as etiquetas
        FROM documentos d
        JOIN categorias_documentos c ON d.categoria_id = c.id
        LEFT JOIN documento_etiquetas de ON d.id = de.documento_id
        LEFT JOIN etiquetas_documentos e ON de.etiqueta_id = e.id
        """
        
        # Construir condiciones WHERE
        where_conditions = []
        params = []
        
        # Filtro por estado
        if estado != 'todos':
            where_conditions.append("d.estado = %s")
            params.append(estado)
        
        # Filtro por categoría
        if categoria_id and categoria_id.isdigit():
            where_conditions.append("d.categoria_id = %s")
            params.append(int(categoria_id))
        
        # Filtro por etiqueta
        if etiqueta_id and etiqueta_id.isdigit():
            where_conditions.append("de.etiqueta_id = %s")
            params.append(int(etiqueta_id))
        
        # Filtro por grupo empresarial
        if grupo and grupo in ['kossodo', 'kossomet', 'grupo_kossodo']:
            where_conditions.append("d.grupo = %s")
            params.append(grupo)
        
        # Filtro por búsqueda
        if search_term:
            where_conditions.append("(d.titulo LIKE %s OR d.descripcion LIKE %s OR e.nombre LIKE %s)")
            search_param = f'%{search_term}%'
            params.extend([search_param, search_param, search_param])
        
        # Agregar WHERE clause si hay condiciones
        if where_conditions:
            base_query += " WHERE " + " AND ".join(where_conditions)
        
        # GROUP BY para evitar duplicados por las etiquetas
        base_query += " GROUP BY d.id"
        
        # Agregar ORDER BY
        base_query += f" ORDER BY d.{sort_field} {sort_order.upper()}"
        
        # Ejecutar query para obtener todos los resultados (para contar total)
        all_documents = db_ops.execute_query(base_query, params) or []
        total = len(all_documents)
        
        # Aplicar paginación
        offset = (page - 1) * limit
        paginated_query = base_query + f" LIMIT {limit} OFFSET {offset}"
        documentos = db_ops.execute_query(paginated_query, params) or []
        
        # Procesar etiquetas para cada documento
        for doc in documentos:
            if doc.get('etiquetas'):
                etiquetas_list = []
                for etiqueta_info in doc['etiquetas'].split('|'):
                    if etiqueta_info:
                        parts = etiqueta_info.split(':')
                        if len(parts) == 3:
                            etiquetas_list.append({
                                'id': int(parts[0]),
                                'nombre': parts[1],
                                'color': parts[2]
                            })
                doc['etiquetas'] = etiquetas_list
            else:
                doc['etiquetas'] = []
        
        return jsonify({
            'success': True,
            'data': documentos,
            'pagination': {
                'total': total,
                'page': page,
                'limit': limit,
                'pages': (total + limit - 1) // limit if total > 0 else 1,
                'has_next': page * limit < total,
                'has_prev': page > 1
            },
            'filters': {
                'categoria': categoria_id,
                'etiqueta': etiqueta_id,
                'grupo': grupo,
                'search': search_term,
                'estado': estado,
                'sort': sort_field,
                'order': sort_order
            }
        })
        
    except Exception as e:
        logger.error(f"Error en get_documents_api: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al obtener documentos: {str(e)}'}), 500


@documentos_bp.route('/api/documents/<int:document_id>', methods=['GET'])
def get_document_api(document_id):
    """
    Obtiene un documento específico por ID con información completa.
    
    Args:
        document_id (int): ID del documento
        
    Returns:
        json: Datos completos del documento
    """
    try:
        document_model = Document()
        documento = document_model.get_by_id(document_id)
        
        if not documento:
            return jsonify({'success': False, 'error': 'Documento no encontrado'}), 404
        
        # Agregar información adicional de categoría y etiquetas
        db_ops = MySQLConnection()
        
        # Obtener información de categoría
        categoria = db_ops.execute_query(
            "SELECT nombre, color, icono FROM categorias_documentos WHERE id = %s",
            (documento['categoria_id'],)
        )
        if categoria:
            documento['categoria'] = categoria[0]
        
        return jsonify({
            'success': True,
            'data': documento
        })
        
    except Exception as e:
        logger.error(f"Error en get_document_api: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al obtener documento: {str(e)}'}), 500


@documentos_bp.route('/api/documents', methods=['POST'])
@require_permission('documents.upload')
def create_document_api():
    """
    Crea un nuevo documento (metadatos solamente).
    
    Body:
        titulo (str): Título del documento
        descripcion (str): Descripción del documento
        categoria_id (int): ID de la categoría
        etiquetas (list): Lista de IDs de etiquetas
        es_publico (bool): Si el documento es público
        grupo (str): Grupo empresarial ('kossodo', 'kossomet', 'grupo_kossodo')
        
    Returns:
        json: Resultado de la creación
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Datos requeridos'}), 400
        
        titulo = data.get('titulo', '').strip()
        descripcion = data.get('descripcion', '').strip()
        categoria_id = data.get('categoria_id')
        etiquetas = data.get('etiquetas', [])
        es_publico = data.get('es_publico', True)
        grupo = data.get('grupo', 'grupo_kossodo')
        
        # Validaciones
        if not titulo:
            return jsonify({'success': False, 'error': 'El título es requerido'}), 400
        
        if len(titulo) > 255:
            return jsonify({'success': False, 'error': 'El título no puede tener más de 255 caracteres'}), 400
        
        if not categoria_id or not isinstance(categoria_id, int):
            return jsonify({'success': False, 'error': 'ID de categoría válido es requerido'}), 400
        
        # Verificar que la categoría existe
        category_model = DocumentCategory()
        categoria = category_model.get_by_id(categoria_id)
        if not categoria:
            return jsonify({'success': False, 'error': 'Categoría no encontrada'}), 404
        
        # Verificar etiquetas (si se proporcionan)
        if etiquetas and not isinstance(etiquetas, list):
            return jsonify({'success': False, 'error': 'Las etiquetas deben ser una lista de IDs'}), 400
        
        for etiqueta_id in etiquetas:
            if not isinstance(etiqueta_id, int):
                return jsonify({'success': False, 'error': 'IDs de etiquetas deben ser números enteros'}), 400
        
        # Validar grupo empresarial
        if grupo not in ['kossodo', 'kossomet', 'grupo_kossodo']:
            return jsonify({'success': False, 'error': 'Grupo empresarial no válido. Debe ser: kossodo, kossomet o grupo_kossodo'}), 400
        
        # Crear documento usando el modelo
        document_model = Document()
        db_ops = MySQLConnection()
        
        try:
            # Para documentos sin archivo, usar valores placeholder
            db_ops.execute_query(
                INSERT_DOCUMENT,
                (
                    titulo,
                    descripcion,
                    'placeholder.txt',  # nombre_archivo
                    '',  # ruta_archivo (vacía para documentos sin archivo)
                    0,   # tamaño_archivo
                    'text/plain',  # tipo_mime
                    categoria_id,
                    149,   # subido_por (usuario_id admin)
                    es_publico,
                    'activo',  # estado
                    grupo  # grupo empresarial
                ),
                fetch=False
            )
            
            # Obtener el ID del documento recién creado buscando por título y timestamp reciente
            result = db_ops.execute_query(
                "SELECT id FROM documentos WHERE titulo = %s AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE) ORDER BY created_at DESC LIMIT 1",
                (titulo,)
            )
            document_id = result[0]['id'] if result else None
            
            if not document_id:
                return jsonify({'success': False, 'error': 'Error al crear documento o encontrar ID'}), 500
            
            # Agregar etiquetas si se proporcionaron
            if etiquetas:
                for etiqueta_id in etiquetas:
                    try:
                        db_ops.execute_query(
                            ADD_TAG_TO_DOCUMENT,
                            (document_id, etiqueta_id),
                            fetch=False
                        )
                    except Exception as tag_error:
                        logger.warning(f"Error al asignar etiqueta {etiqueta_id} al documento {document_id}: {tag_error}")
            
            # Registrar auditoría
            db_ops.execute_query(
                LOG_DOCUMENT_ACTION,
                (
                    document_id,
                    149,  # usuario_id admin
                    'create',
                    '127.0.0.1',  # ip_address (placeholder)
                    'API',    # user_agent
                    f'Documento creado: {titulo}'
                ),
                fetch=False
            )
            
            # Obtener el documento creado con información básica
            doc_result = db_ops.execute_query(
                "SELECT id, titulo, descripcion, categoria_id, es_publico, estado, created_at FROM documentos WHERE id = %s",
                (document_id,)
            )
            
            nuevo_documento = doc_result[0] if doc_result else None
            
            return jsonify({
                'success': True,
                'message': 'Documento creado exitosamente',
                'data': nuevo_documento
            })
            
        except Exception as e:
            logger.error(f"Error en base de datos al crear documento: {str(e)}")
            return jsonify({'success': False, 'error': f'Error en base de datos: {str(e)}'}), 500
        
    except Exception as e:
        logger.error(f"Error en create_document_api: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al crear documento: {str(e)}'}), 500


@documentos_bp.route('/api/documents/<int:document_id>', methods=['PUT'])
@require_permission('documents.edit')
def update_document_api(document_id):
    """
    Actualiza los metadatos de un documento existente.
    
    Args:
        document_id (int): ID del documento
        
    Body:
        titulo (str): Nuevo título
        descripcion (str): Nueva descripción
        categoria_id (int): Nueva categoría
        etiquetas (list): Nueva lista de IDs de etiquetas
        es_publico (bool): Si el documento es público
        
    Returns:
        json: Resultado de la actualización
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Datos requeridos'}), 400
        
        titulo = data.get('titulo', '').strip()
        descripcion = data.get('descripcion', '').strip()
        categoria_id = data.get('categoria_id')
        etiquetas = data.get('etiquetas', [])
        es_publico = data.get('es_publico', True)
        grupo = data.get('grupo')  # Opcional - si no se proporciona, se mantiene el actual
        
        # Validaciones
        if not titulo:
            return jsonify({'success': False, 'error': 'El título es requerido'}), 400
        
        if len(titulo) > 255:
            return jsonify({'success': False, 'error': 'El título no puede tener más de 255 caracteres'}), 400
        
        if not categoria_id or not isinstance(categoria_id, int):
            return jsonify({'success': False, 'error': 'ID de categoría válido es requerido'}), 400
        
        # Verificar que el documento existe
        document_model = Document()
        documento_existente = document_model.get_by_id(document_id)
        if not documento_existente:
            return jsonify({'success': False, 'error': 'Documento no encontrado'}), 404
        
        # Verificar que la categoría existe
        category_model = DocumentCategory()
        categoria = category_model.get_by_id(categoria_id)
        if not categoria:
            return jsonify({'success': False, 'error': 'Categoría no encontrada'}), 404
        
        # Validar grupo empresarial si se proporciona
        if grupo and grupo not in ['kossodo', 'kossomet', 'grupo_kossodo']:
            return jsonify({'success': False, 'error': 'Grupo empresarial no válido. Debe ser: kossodo, kossomet o grupo_kossodo'}), 400
        
        # Actualizar documento
        success = document_model.update(document_id, titulo, descripcion, categoria_id, es_publico, grupo)
        if not success:
            return jsonify({'success': False, 'error': 'Error al actualizar documento'}), 500
        
        # Actualizar etiquetas
        if isinstance(etiquetas, list):
            try:
                # Primero eliminar todas las etiquetas existentes
                db_ops.execute_query(
                    "DELETE FROM documento_etiquetas WHERE documento_id = %s",
                    (document_id,),
                    fetch=False
                )
                
                # Luego agregar las nuevas etiquetas
                for etiqueta_id in etiquetas:
                    try:
                        db_ops.execute_query(
                            ADD_TAG_TO_DOCUMENT,
                            (document_id, etiqueta_id),
                            fetch=False
                        )
                    except Exception as tag_error:
                        logger.warning(f"Error al asignar etiqueta {etiqueta_id} al documento {document_id}: {tag_error}")
            except Exception as e:
                logger.warning(f"Error al actualizar etiquetas del documento {document_id}: {e}")
        
        # Registrar auditoría
        db_ops.execute_query(
            LOG_DOCUMENT_ACTION,
            (
                document_id,
                149,  # usuario_id admin
                'update',
                '127.0.0.1',  # ip_address (placeholder)
                'API',    # user_agent
                f'Documento actualizado: {titulo}'
            ),
            fetch=False
        )
        
        # Obtener el documento actualizado
        documento_actualizado = document_model.get_by_id(document_id)
        
        return jsonify({
            'success': True,
            'message': 'Documento actualizado exitosamente',
            'data': documento_actualizado
        })
        
    except Exception as e:
        logger.error(f"Error en update_document_api: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al actualizar documento: {str(e)}'}), 500


@documentos_bp.route('/api/documents/<int:document_id>', methods=['DELETE'])
@require_permission('documents.delete')
def delete_document_api(document_id):
    """
    Elimina un documento (marca como eliminado).
    
    Args:
        document_id (int): ID del documento
        
    Returns:
        json: Resultado de la eliminación
    """
    try:
        # Verificar que el documento existe
        document_model = Document()
        documento = document_model.get_by_id(document_id)
        if not documento:
            return jsonify({'success': False, 'error': 'Documento no encontrado'}), 404
        
        # Marcar como eliminado
        db_ops = MySQLConnection()
        success = db_ops.execute_query(
            UPDATE_DOCUMENT_STATUS,
            ('eliminado', document_id),
            fetch=False
        )
        
        if success is None:
            return jsonify({'success': False, 'error': 'Error al eliminar documento'}), 500
        
        # Registrar auditoría
        db_ops.execute_query(
            LOG_DOCUMENT_ACTION,
            (
                document_id,
                149,  # usuario_id admin
                'delete',
                '127.0.0.1',  # ip_address (placeholder)
                'API',    # user_agent
                f'Documento eliminado: {documento.get("titulo", "N/A")}'
            ),
            fetch=False
        )
        
        return jsonify({
            'success': True,
            'message': 'Documento eliminado exitosamente'
        })
        
    except Exception as e:
        logger.error(f"Error en delete_document_api: {str(e)}")
        return jsonify({'success': False, 'error': f'Error al eliminar documento: {str(e)}'}), 500 

@documentos_bp.route('/api/documents/upload-file', methods=['POST'])
@require_permission('documents.upload')
def upload_document_file():
    """
    Endpoint para subir archivos de documentos usando AWS S3.
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
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No se encontró ningún archivo'}), 400
        
        file = request.files['file']
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
            upload_type=UploadType.DOCUMENTOS
        )
        
        if not is_valid:
            return jsonify({'success': False, 'error': error_msg}), 400
        
        # Generar nombre único para S3
        from datetime import datetime
        import uuid
        
        file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'bin'
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        sanitized_name = ''.join(c for c in file.filename.rsplit('.', 1)[0] if c.isalnum() or c in ('_', '-'))[:20]
        unique_filename = f"doc_{timestamp}_{sanitized_name}_{unique_id}.{file_extension}"
        
        # Subir archivo a S3
        success, s3_url, error_message = UploadManager.upload_file(
            file_data=file,
            filename=unique_filename,
            upload_type=UploadType.DOCUMENTOS
        )
        
        if not success:
            logger.error(f"❌ Error subiendo a S3: {error_message}")
            return jsonify({'success': False, 'error': f'Error subiendo archivo: {error_message}'}), 500
        
        logger.info(f"✅ Documento subido exitosamente a S3: {s3_url}")
        
        return jsonify({
            'success': True,
            'url': s3_url,
            'filename': unique_filename,
            'original_filename': file.filename,
            'size': file_size,
            'mime_type': mime_type,
            'message': 'Documento subido exitosamente a S3'
        })
        
    except Exception as e:
        logger.error(f"❌ Error al subir documento: {str(e)}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': 'Error interno del servidor'}), 500

@documentos_bp.route('/api/documents/create-with-file', methods=['POST'])
@require_permission('documents.upload')
def create_document_with_file():
    """
    Endpoint para crear un documento completo con archivo en S3.
    Combina subida de archivo y creación de metadatos en una sola operación.
    
    Form data:
        file: Archivo a subir
        titulo: Título del documento
        descripcion: Descripción del documento
        categoria_id: ID de la categoría
        etiquetas: Lista de IDs de etiquetas (JSON string)
        es_publico: Si el documento es público (true/false)
        grupo: Grupo empresarial
        
    Returns:
        json: Documento creado con URL de S3
    """
    try:
        # Importar sistema S3
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'utils'))
        from upload_utils import UploadManager, UploadType
        import json
        
        # Verificar token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Token de autorización requerido'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verificar_token(token)
        if not payload:
            return jsonify({'success': False, 'error': 'Token inválido'}), 401
        
        # Verificar que se envió un archivo
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No se encontró ningún archivo'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No se seleccionó ningún archivo'}), 400
        
        # Obtener metadatos del formulario
        titulo = request.form.get('titulo', '').strip()
        descripcion = request.form.get('descripcion', '').strip()
        categoria_id = request.form.get('categoria_id')
        etiquetas_json = request.form.get('etiquetas', '[]')
        es_publico = request.form.get('es_publico', 'true').lower() == 'true'
        grupo = request.form.get('grupo', 'grupo_kossodo')
        
        # Validar metadatos
        if not titulo:
            return jsonify({'success': False, 'error': 'El título es requerido'}), 400
        
        if len(titulo) > 255:
            return jsonify({'success': False, 'error': 'El título no puede tener más de 255 caracteres'}), 400
        
        if not categoria_id or not categoria_id.isdigit():
            return jsonify({'success': False, 'error': 'ID de categoría válido es requerido'}), 400
        
        categoria_id = int(categoria_id)
        
        # Validar grupo empresarial
        if grupo not in ['kossodo', 'kossomet', 'grupo_kossodo']:
            return jsonify({'success': False, 'error': 'Grupo empresarial no válido. Debe ser: kossodo, kossomet o grupo_kossodo'}), 400
        
        # Parsear etiquetas
        try:
            etiquetas = json.loads(etiquetas_json) if etiquetas_json else []
            if not isinstance(etiquetas, list):
                etiquetas = []
        except:
            etiquetas = []
        
        # Validar archivo
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
            upload_type=UploadType.DOCUMENTOS
        )
        
        if not is_valid:
            return jsonify({'success': False, 'error': error_msg}), 400
        
        # Verificar que la categoría existe
        db_ops = MySQLConnection()
        categoria = db_ops.execute_query(
            "SELECT id FROM categorias_documentos WHERE id = %s", 
            (categoria_id,)
        )
        
        if not categoria:
            return jsonify({'success': False, 'error': 'Categoría no encontrada'}), 400
        
        # Generar nombre único para S3
        from datetime import datetime
        import uuid
        
        file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'bin'
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        sanitized_name = ''.join(c for c in file.filename.rsplit('.', 1)[0] if c.isalnum() or c in ('_', '-'))[:20]
        unique_filename = f"doc_{timestamp}_{sanitized_name}_{unique_id}.{file_extension}"
        
        # Subir archivo a S3
        success, s3_url, error_message = UploadManager.upload_file(
            file_data=file,
            filename=unique_filename,
            upload_type=UploadType.DOCUMENTOS
        )
        
        if not success:
            logger.error(f"❌ Error subiendo a S3: {error_message}")
            return jsonify({'success': False, 'error': f'Error subiendo archivo: {error_message}'}), 500
        
        # Crear documento en base de datos con URL de S3
        try:
            # Obtener usuario actual desde el token
            current_user = get_user_from_token()
            user_id = current_user.get('id') if current_user else 149
            user_id = int(user_id) if user_id else 149
            
            # Insertar documento en BD con URL de S3
            documento_id = db_ops.execute_query(
                INSERT_DOCUMENT,
                (
                    titulo,
                    descripcion,
                    file.filename,       # nombre_archivo original
                    s3_url,              # ruta_archivo = URL de S3
                    file_size,           # tamaño_archivo
                    mime_type,           # tipo_mime
                    categoria_id,
                    user_id,             # subido_por
                    es_publico,          # es_publico
                    'activo',            # estado
                    grupo                # grupo empresarial
                ),
                fetch=False
            )
            
            if not documento_id:
                # Si falla la BD, intentar eliminar el archivo de S3
                try:
                    UploadManager.delete_file(s3_url)
                except:
                    pass
                return jsonify({'success': False, 'error': 'Error al guardar documento en base de datos'}), 500
            
            # Agregar etiquetas si se proporcionaron
            if etiquetas:
                for etiqueta_id in etiquetas:
                    if isinstance(etiqueta_id, int):
                        try:
                            # Verificar que la etiqueta existe
                            etiqueta = db_ops.execute_query(
                                "SELECT id FROM etiquetas_documentos WHERE id = %s", 
                                (etiqueta_id,)
                            )
                            
                            if etiqueta:
                                # Insertar relación documento-etiqueta
                                db_ops.execute_query(
                                    ADD_TAG_TO_DOCUMENT,
                                    (documento_id, etiqueta_id),
                                    fetch=False
                                )
                        except Exception as tag_error:
                            logger.warning(f"Error al asignar etiqueta {etiqueta_id} al documento {documento_id}: {tag_error}")
            
            # Registrar auditoría
            db_ops.execute_query(
                LOG_DOCUMENT_ACTION,
                (
                    documento_id,
                    user_id,
                    'create_with_file',
                    request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', '127.0.0.1')),
                    request.headers.get('User-Agent', 'API'),
                    f'Documento creado con archivo en S3: {titulo}'
                ),
                fetch=False
            )
            
            logger.info(f"✅ Documento creado con archivo S3 - ID: {documento_id}, Título: {titulo}, URL: {s3_url}")
            
            return jsonify({
                'success': True,
                'message': 'Documento creado exitosamente con archivo en S3',
                'data': {
                    'id': documento_id,
                    'titulo': titulo,
                    'descripcion': descripcion,
                    'nombre_archivo': file.filename,
                    'ruta_archivo': s3_url,
                    'tamaño_archivo': file_size,
                    'tipo_mime': mime_type,
                    'categoria_id': categoria_id,
                    'es_publico': es_publico,
                    'grupo': grupo,
                    'etiquetas_asignadas': len([e for e in etiquetas if isinstance(e, int)])
                }
            }), 201
            
        except Exception as e:
            logger.error(f"Error en base de datos: {str(e)}")
            # Intentar eliminar el archivo de S3 si falla la BD
            try:
                UploadManager.delete_file(s3_url)
            except:
                pass
            return jsonify({'success': False, 'error': f'Error en base de datos: {str(e)}'}), 500
        
    except Exception as e:
        logger.error(f"❌ Error al crear documento con archivo: {str(e)}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': 'Error interno del servidor'}), 500