"""
Rutas del PDF Manager con arquitectura S3 + Base de Datos
Sistema profesional de gestión de catálogos
"""

import os
import logging
from flask import Blueprint, request, jsonify, send_file, redirect, render_template, url_for
from werkzeug.utils import secure_filename
from datetime import datetime
import requests

from .pdf_processor_s3 import PDFProcessorS3
from .models import CatalogoManager, EstadoCatalogo, TipoArchivo

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Crear blueprint
pdf_manager_s3_bp = Blueprint(
    'pdf_manager_s3', 
    __name__,
    template_folder='templates',  # Carpeta de templates
    static_folder='static',       # Carpeta de archivos estáticos
    static_url_path='/api/pdfs/static',  # URL para archivos estáticos
    url_prefix='/api/pdfs'        # Prefijo para todas las rutas
)

# Instancia global del procesador
processor = PDFProcessorS3()
catalogo_manager = CatalogoManager()


@pdf_manager_s3_bp.route('/upload', methods=['POST'])
def upload_pdf():
    """
    Endpoint para subir y procesar un PDF completo
    
    Form data:
    - file: Archivo PDF
    - descripcion: Descripción del catálogo (opcional)
    - categoria: Categoría del catálogo (opcional, default: 'general')
    - usuario_id: ID del usuario (opcional)
    """
    try:
        # Validar que se envió un archivo
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No se encontró archivo en la petición'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No se seleccionó ningún archivo'
            }), 400
        
        # Validar extensión
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({
                'success': False,
                'error': 'Solo se permiten archivos PDF'
            }), 400
        
        # Obtener parámetros adicionales
        descripcion = request.form.get('descripcion', '')
        categoria = request.form.get('categoria', 'general')
        usuario_id = request.form.get('usuario_id')
        
        if usuario_id:
            try:
                usuario_id = int(usuario_id)
            except ValueError:
                usuario_id = None
        
        # Sanitizar nombre de archivo
        filename = secure_filename(file.filename)
        
        logger.info(f"📤 Iniciando procesamiento de PDF: {filename}")
        
        # Procesar PDF completo
        result = processor.process_pdf_complete(
            pdf_file_data=file,
            filename=filename,
            descripcion=descripcion,
            categoria=categoria,
            usuario_id=usuario_id
        )
        
        if result['success']:
            logger.info(f"✅ PDF procesado exitosamente: {result['catalogo_id']}")
            return jsonify(result), 200
        else:
            logger.error(f"❌ Error procesando PDF: {result['error']}")
            return jsonify(result), 500
            
    except Exception as e:
        error_msg = f"Error inesperado en upload: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return jsonify({
            'success': False,
            'error': error_msg
        }), 500


@pdf_manager_s3_bp.route('/progress', methods=['GET'])
def get_progress():
    """Obtiene el progreso del procesamiento actual"""
    try:
        progress = processor.get_progress()
        return jsonify({
            'success': True,
            'progress': progress
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@pdf_manager_s3_bp.route('/catalogos', methods=['GET'])
def list_catalogos():
    """
    Lista todos los catálogos con filtros opcionales
    
    Query params:
    - categoria: Filtrar por categoría
    - estado: Filtrar por estado (activo, procesando, error, inactivo)
    - limite: Número máximo de resultados (default: 50)
    - offset: Offset para paginación (default: 0)
    - buscar: Término de búsqueda en nombre y descripción
    """
    try:
        # Obtener parámetros de consulta
        categoria = request.args.get('categoria')
        estado_str = request.args.get('estado')
        limite = int(request.args.get('limite', 50))
        offset = int(request.args.get('offset', 0))
        termino_busqueda = request.args.get('buscar')
        
        # Convertir estado a enum si se proporciona
        estado = None
        if estado_str:
            try:
                estado = EstadoCatalogo(estado_str)
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': f'Estado inválido: {estado_str}. Valores válidos: activo, procesando, error, inactivo'
                }), 400
        
        # Buscar o listar catálogos
        if termino_busqueda:
            catalogos = catalogo_manager.buscar_catalogos(termino_busqueda, categoria)
        else:
            catalogos = catalogo_manager.listar_catalogos(
                categoria=categoria,
                estado=estado,
                limite=limite,
                offset=offset
            )
        
        # Obtener estadísticas
        estadisticas = catalogo_manager.obtener_estadisticas_catalogos()
        
        return jsonify({
            'success': True,
            'catalogos': catalogos,
            'total': len(catalogos),
            'limite': limite,
            'offset': offset,
            'estadisticas': estadisticas
        }), 200
        
    except Exception as e:
        logger.error(f"Error listando catálogos: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@pdf_manager_s3_bp.route('/catalogos/<int:catalogo_id>', methods=['GET'])
def get_catalogo(catalogo_id):
    """Obtiene información completa de un catálogo específico"""
    try:
        catalogo_info = processor.get_catalogo_info(catalogo_id)
        
        if not catalogo_info:
            return jsonify({
                'success': False,
                'error': f'Catálogo {catalogo_id} no encontrado'
            }), 404
        
        return jsonify({
            'success': True,
            'catalogo': catalogo_info
        }), 200
        
    except Exception as e:
        logger.error(f"Error obteniendo catálogo {catalogo_id}: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@pdf_manager_s3_bp.route('/catalogos/<int:catalogo_id>/paginas', methods=['GET'])
def get_paginas_catalogo(catalogo_id):
    """Obtiene todas las páginas de un catálogo"""
    try:
        paginas = catalogo_manager.obtener_paginas_catalogo(catalogo_id)
        
        if not paginas:
            return jsonify({
                'success': False,
                'error': f'No se encontraron páginas para el catálogo {catalogo_id}'
            }), 404
        
        return jsonify({
            'success': True,
            'catalogo_id': catalogo_id,
            'total_paginas': len(paginas),
            'paginas': paginas
        }), 200
        
    except Exception as e:
        logger.error(f"Error obteniendo páginas del catálogo {catalogo_id}: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@pdf_manager_s3_bp.route('/catalogos/<int:catalogo_id>/pdf', methods=['GET'])
def get_pdf_original(catalogo_id):
    """Obtiene la URL del PDF original de un catálogo"""
    try:
        pdf_info = catalogo_manager.obtener_pdf_original(catalogo_id)
        
        if not pdf_info:
            return jsonify({
                'success': False,
                'error': f'PDF original no encontrado para catálogo {catalogo_id}'
            }), 404
        
        return jsonify({
            'success': True,
            'catalogo_id': catalogo_id,
            'pdf_url': pdf_info['url_s3'],
            'nombre_archivo': pdf_info['nombre_archivo'],
            'tamaño_archivo': pdf_info['tamaño_archivo'],
            'fecha_creacion': pdf_info['fecha_creacion']
        }), 200
        
    except Exception as e:
        logger.error(f"Error obteniendo PDF del catálogo {catalogo_id}: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@pdf_manager_s3_bp.route('/catalogos/<int:catalogo_id>/thumbnail', methods=['GET'])
def get_thumbnail(catalogo_id):
    """Obtiene la URL del thumbnail de un catálogo"""
    try:
        thumbnail_info = catalogo_manager.obtener_thumbnail(catalogo_id)
        
        if not thumbnail_info:
            return jsonify({
                'success': False,
                'error': f'Thumbnail no encontrado para catálogo {catalogo_id}'
            }), 404
        
        return jsonify({
            'success': True,
            'catalogo_id': catalogo_id,
            'thumbnail_url': thumbnail_info['url_s3'],
            'tamaño_archivo': thumbnail_info['tamaño_archivo'],
            'metadatos': thumbnail_info['metadatos']
        }), 200
        
    except Exception as e:
        logger.error(f"Error obteniendo thumbnail del catálogo {catalogo_id}: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@pdf_manager_s3_bp.route('/catalogos/<int:catalogo_id>', methods=['DELETE'])
def delete_catalogo(catalogo_id):
    """Elimina un catálogo completo (archivos S3 + registros BD)"""
    try:
        result = processor.delete_catalogo_complete(catalogo_id)
        
        if result['success']:
            logger.info(f"✅ Catálogo {catalogo_id} eliminado exitosamente")
            return jsonify(result), 200
        else:
            logger.error(f"❌ Error eliminando catálogo {catalogo_id}: {result['error']}")
            return jsonify(result), 500
            
    except Exception as e:
        error_msg = f"Error inesperado eliminando catálogo {catalogo_id}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return jsonify({
            'success': False,
            'error': error_msg
        }), 500


@pdf_manager_s3_bp.route('/catalogos/<int:catalogo_id>/estado', methods=['PUT'])
def update_estado_catalogo(catalogo_id):
    """
    Actualiza el estado de un catálogo
    
    JSON body:
    - estado: nuevo estado (activo, inactivo, procesando, error)
    - metadatos: metadatos adicionales (opcional)
    """
    try:
        data = request.get_json()
        
        if not data or 'estado' not in data:
            return jsonify({
                'success': False,
                'error': 'Se requiere el campo "estado" en el JSON'
            }), 400
        
        # Validar estado
        try:
            nuevo_estado = EstadoCatalogo(data['estado'])
        except ValueError:
            return jsonify({
                'success': False,
                'error': f'Estado inválido: {data["estado"]}. Valores válidos: activo, procesando, error, inactivo'
            }), 400
        
        metadatos = data.get('metadatos')
        
        # Actualizar estado
        success = catalogo_manager.actualizar_estado_catalogo(
            catalogo_id, 
            nuevo_estado, 
            metadatos
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Estado del catálogo {catalogo_id} actualizado a {nuevo_estado.value}'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': f'No se pudo actualizar el catálogo {catalogo_id}'
            }), 404
            
    except Exception as e:
        logger.error(f"Error actualizando estado del catálogo {catalogo_id}: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@pdf_manager_s3_bp.route('/estadisticas', methods=['GET'])
def get_estadisticas():
    """Obtiene estadísticas generales del sistema"""
    try:
        estadisticas = processor.get_statistics()
        
        return jsonify({
            'success': True,
            'estadisticas': estadisticas
        }), 200
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@pdf_manager_s3_bp.route('/limpiar-huerfanos', methods=['POST'])
def limpiar_huerfanos():
    """Ejecuta limpieza de archivos huérfanos"""
    try:
        resultado = catalogo_manager.limpiar_archivos_huerfanos()
        
        return jsonify({
            'success': True,
            'resultado': resultado,
            'message': 'Limpieza de archivos huérfanos completada'
        }), 200
        
    except Exception as e:
        logger.error(f"Error en limpieza de huérfanos: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@pdf_manager_s3_bp.route('/health', methods=['GET'])
def health_check():
    """Endpoint de salud del servicio"""
    try:
        # Verificar conexión a BD
        estadisticas = catalogo_manager.obtener_estadisticas_catalogos()
        
        # Verificar estado del procesador
        progress = processor.get_progress()
        
        return jsonify({
            'success': True,
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'database_connected': bool(estadisticas),
            'processor_status': progress.get('status', 'unknown'),
            'total_catalogos': estadisticas.get('total_catalogos', 0)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


# ==========================================
# ENDPOINTS DE COMPATIBILIDAD (LEGACY)
# ==========================================

@pdf_manager_s3_bp.route('/process', methods=['POST'])
def process_legacy():
    """Endpoint de compatibilidad con el sistema anterior"""
    logger.warning("⚠️ Usando endpoint legacy /process - considerar migrar a /upload")
    return upload_pdf()


@pdf_manager_s3_bp.route('/upload-pdf-async', methods=['POST'])
def upload_pdf_async_legacy():
    """Endpoint de compatibilidad para upload-pdf-async del sistema anterior"""
    logger.warning("⚠️ Usando endpoint legacy /upload-pdf-async - redirigiendo a nuevo sistema S3")
    return upload_pdf()


@pdf_manager_s3_bp.route('/list', methods=['GET'])
def list_legacy():
    """Endpoint de compatibilidad para listar catálogos"""
    logger.warning("⚠️ Usando endpoint legacy /list - considerar migrar a /catalogos")
    return list_catalogos()


# ==========================================
# ENDPOINTS DE COMPATIBILIDAD CON FRONTEND
# ==========================================

@pdf_manager_s3_bp.route('/upload-page', methods=['GET'])
def upload_page_route():
    """Página para subir PDFs - Sirve HTML simple"""
    try:
        # Crear una página HTML simple que replique la funcionalidad
        html_content = """
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subir Nuevo Catálogo</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .upload-area {
            border: 2px dashed #ccc;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            margin: 20px 0;
            background-color: #fafafa;
        }
        .upload-area:hover {
            border-color: #007bff;
            background-color: #f0f8ff;
        }
        .file-icon {
            font-size: 48px;
            color: #ccc;
            margin-bottom: 10px;
        }
        .upload-text {
            color: #666;
            margin-bottom: 5px;
        }
        .file-limit {
            color: #999;
            font-size: 14px;
        }
        .form-group {
            margin: 20px 0;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: #333;
        }
        input[type="text"], textarea, select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        textarea {
            height: 80px;
            resize: vertical;
        }
        .btn {
            background-color: #28a745;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
            margin-top: 20px;
        }
        .btn:hover {
            background-color: #218838;
        }
        .btn:disabled {
            background-color: #6c757d;
            cursor: not-allowed;
        }
        .back-link {
            display: inline-block;
            margin-bottom: 20px;
            color: #007bff;
            text-decoration: none;
        }
        .back-link:hover {
            text-decoration: underline;
        }
        .progress {
            display: none;
            margin-top: 20px;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background-color: #28a745;
            width: 0%;
            transition: width 0.3s ease;
        }
        .message {
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            display: none;
        }
        .message.success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .message.error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="javascript:history.back()" class="back-link">← Volver al Catálogo</a>
        
        <h1>Subir Nuevo Catálogo</h1>
        
        <form id="uploadForm" enctype="multipart/form-data">
            <div class="form-group">
                <label for="file">Selecciona un archivo PDF:</label>
                <div class="upload-area" onclick="document.getElementById('file').click()">
                    <div class="file-icon">📄</div>
                    <div class="upload-text">Arrastra un archivo PDF aquí o haz clic para seleccionar</div>
                    <div class="file-limit">Máximo 50MB</div>
                </div>
                <input type="file" id="file" name="file" accept=".pdf" style="display: none;" required>
                <div id="fileName" style="margin-top: 10px; color: #666;"></div>
            </div>
            
            <div class="form-group">
                <label for="descripcion">Descripción (opcional):</label>
                <textarea id="descripcion" name="descripcion" placeholder="Describe el contenido del catálogo..."></textarea>
            </div>
            
            <div class="form-group">
                <label for="categoria">Categoría:</label>
                <select id="categoria" name="categoria">
                    <option value="general">General</option>
                    <option value="productos">Productos</option>
                    <option value="servicios">Servicios</option>
                    <option value="promociones">Promociones</option>
                    <option value="manuales">Manuales</option>
                </select>
            </div>
            
            <button type="submit" class="btn" id="submitBtn">Subir y Procesar</button>
        </form>
        
        <div class="progress" id="progress">
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            <div id="progressText" style="text-align: center; margin-top: 5px;">Procesando...</div>
        </div>
        
        <div class="message" id="message"></div>
    </div>

    <script>
        const fileInput = document.getElementById('file');
        const fileName = document.getElementById('fileName');
        const uploadForm = document.getElementById('uploadForm');
        const submitBtn = document.getElementById('submitBtn');
        const progress = document.getElementById('progress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const message = document.getElementById('message');

        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                fileName.textContent = `Archivo seleccionado: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
            }
        });

        uploadForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            const file = fileInput.files[0];
            
            if (!file) {
                showMessage('Por favor selecciona un archivo PDF', 'error');
                return;
            }
            
            if (file.size > 50 * 1024 * 1024) {
                showMessage('El archivo es demasiado grande. Máximo 50MB permitido.', 'error');
                return;
            }
            
            formData.append('file', file);
            formData.append('descripcion', document.getElementById('descripcion').value);
            formData.append('categoria', document.getElementById('categoria').value);
            
            submitBtn.disabled = true;
            progress.style.display = 'block';
            message.style.display = 'none';
            
            try {
                const response = await fetch('/api/pdfs/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showMessage(`¡Catálogo "${result.nombre}" procesado exitosamente!`, 'success');
                    uploadForm.reset();
                    fileName.textContent = '';
                    setTimeout(() => {
                        window.history.back();
                    }, 2000);
                } else {
                    showMessage(`Error: ${result.error}`, 'error');
                }
            } catch (error) {
                showMessage(`Error de conexión: ${error.message}`, 'error');
            } finally {
                submitBtn.disabled = false;
                progress.style.display = 'none';
            }
        });

        function showMessage(text, type) {
            message.textContent = text;
            message.className = `message ${type}`;
            message.style.display = 'block';
        }

        // Drag and drop functionality
        const uploadArea = document.querySelector('.upload-area');
        
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.style.borderColor = '#007bff';
            uploadArea.style.backgroundColor = '#f0f8ff';
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            uploadArea.style.borderColor = '#ccc';
            uploadArea.style.backgroundColor = '#fafafa';
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.style.borderColor = '#ccc';
            uploadArea.style.backgroundColor = '#fafafa';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                const event = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(event);
            }
        });
    </script>
</body>
</html>
        """
        
        from flask import Response
        return Response(html_content, mimetype='text/html')
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pdf_manager_s3_bp.route('/ver-todos', methods=['GET'])
def ver_todos_catalogos_route():
    """Página para visualizar catálogos - Compatibilidad con sistema anterior"""
    try:
        # Redirigir a la API de listado de catálogos
        return jsonify({
            'message': 'Sistema S3 activo',
            'catalogos_endpoint': '/api/pdfs/catalogos',
            'listar_endpoint': '/api/pdfs/listar-pdfs-procesados',
            'method': 'GET',
            'note': 'Use los endpoints de API para obtener datos de catálogos'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pdf_manager_s3_bp.route('/', methods=['GET'])
def index_route():
    """Página principal del visualizador de PDFs"""
    try:
        # Verificar si se está solicitando un PDF específico
        pdf_param = request.args.get('pdf')
        
        if pdf_param:
            # Servir la página del visualizador de PDF individual
            logger.info(f"📖 Sirviendo visualizador para PDF: {pdf_param}")
            return render_template('pdf_reader/index.html', pdf_url=pdf_param)
        else:
            # Redirigir a la página de catálogos si no se especifica PDF
            logger.info("🏠 Redirigiendo a página de catálogos")
            return redirect(url_for('pdf_manager_s3.catalogo_route'))
            
    except Exception as e:
        logger.error(f"Error en index_route: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@pdf_manager_s3_bp.route('/catalogo', methods=['GET'])
def catalogo_route():
    """Página de listado de catálogos"""
    try:
        logger.info("📋 Sirviendo página de catálogos")
        return render_template('pdf_reader/catalogo.html')
    except Exception as e:
        logger.error(f"Error en catalogo_route: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@pdf_manager_s3_bp.route('/listar-pdfs-procesados', methods=['GET'])
def listar_pdfs_procesados_api():
    """
    Endpoint de compatibilidad para el frontend existente.
    Adapta la respuesta del sistema S3 al formato esperado por el frontend.
    """
    try:
        logger.info("📋 Listando catálogos (compatibilidad con frontend)")
        
        # Obtener catálogos del sistema S3
        catalogos = catalogo_manager.listar_catalogos(
            estado=EstadoCatalogo.ACTIVO,  # Solo catálogos activos
            limite=100,  # Límite generoso para compatibilidad
            offset=0
        )
        
        # Procesar cada catálogo para el formato de compatibilidad
        processed_catalogs = []
        for catalogo in catalogos:
            # Construir la información básica del catálogo
            catalog_info = {
                'name': catalogo.get('nombre', ''),
                'pages': catalogo.get('total_paginas', 0),
                'status': catalogo.get('estado', 'unknown'),
                'created': catalogo.get('fecha_creacion', ''),
                'size': catalogo.get('tamaño_archivo', 0)
            }
            
            # Manejar thumbnail - verificar si ya es una URL completa
            thumbnail_url = catalogo.get('thumbnail_url')
            if thumbnail_url:
                if thumbnail_url.startswith('http'):
                    # Ya es una URL completa de S3
                    catalog_info['thumbnail_path_relative'] = thumbnail_url
                else:
                    # Es una ruta relativa, construir URL completa
                    catalog_info['thumbnail_path_relative'] = f"/api/pdfs/processed_files/{thumbnail_url}"
            else:
                catalog_info['thumbnail_path_relative'] = None
            
            # Manejar PDF original
            pdf_url = catalogo.get('pdf_url')
            if pdf_url:
                if pdf_url.startswith('http'):
                    # Ya es una URL completa de S3
                    catalog_info['original_pdf_path_relative'] = pdf_url
                else:
                    # Es una ruta relativa
                    catalog_info['original_pdf_path_relative'] = f"/api/pdfs/processed_files/{pdf_url}"
            else:
                catalog_info['original_pdf_path_relative'] = None
            
            processed_catalogs.append(catalog_info)
        
        # Ordenar por nombre
        processed_catalogs.sort(key=lambda x: x['name'].lower())
        
        logger.info(f"✅ Devolviendo {len(processed_catalogs)} catálogos (formato compatibilidad)")
        return jsonify(processed_catalogs)
        
    except Exception as e:
        logger.error(f"Error en listar_pdfs_procesados_api: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@pdf_manager_s3_bp.route('/upload-pdf', methods=['POST'])
def upload_pdf_legacy():
    """Endpoint de compatibilidad para upload-pdf del sistema anterior"""
    logger.warning("⚠️ Usando endpoint legacy /upload-pdf - redirigiendo a nuevo sistema S3")
    return upload_pdf()


@pdf_manager_s3_bp.route('/delete-pdf', methods=['POST'])
def delete_pdf_legacy():
    """Endpoint de compatibilidad para eliminar PDFs"""
    try:
        data = request.get_json()
        if not data or 'pdf_name' not in data:
            return jsonify({
                'success': False, 
                'error': 'No se especificó el nombre del PDF'
            }), 400
        
        pdf_name = data['pdf_name']
        
        # Buscar catálogo por nombre
        catalogos = catalogo_manager.buscar_catalogos(pdf_name)
        
        if not catalogos:
            return jsonify({
                'success': False,
                'error': f'Catálogo "{pdf_name}" no encontrado'
            }), 404
        
        # Tomar el primer resultado que coincida exactamente
        catalogo_encontrado = None
        for cat in catalogos:
            if cat['nombre'] == pdf_name:
                catalogo_encontrado = cat
                break
        
        if not catalogo_encontrado:
            return jsonify({
                'success': False,
                'error': f'Catálogo "{pdf_name}" no encontrado'
            }), 404
        
        # Eliminar usando el sistema S3
        result = processor.delete_catalogo_complete(catalogo_encontrado['id'])
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': f'Catálogo "{pdf_name}" eliminado correctamente'
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500
            
    except Exception as e:
        logger.error(f"Error en delete_pdf_legacy: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@pdf_manager_s3_bp.route('/progreso-pdf', methods=['GET'])
def progreso_pdf_legacy():
    """Endpoint de compatibilidad para consultar progreso"""
    logger.warning("⚠️ Usando endpoint legacy /progreso-pdf - redirigiendo a /progress")
    return get_progress()


@pdf_manager_s3_bp.route('/processed_files/<path:filepath>')
def serve_processed_pdf_files_legacy(filepath):
    """
    Sirve archivos procesados desde S3 o redirige a la URL correcta
    Compatibilidad con el sistema anterior
    """
    try:
        logger.info(f"📁 Solicitando archivo: {filepath}")
        
        # Si la filepath ya es una URL completa de S3, extraer la parte del path
        if filepath.startswith('https://'):
            # Extraer solo la parte del path después del dominio S3
            if 'amazonaws.com/' in filepath:
                s3_key = filepath.split('amazonaws.com/', 1)[1]
                logger.info(f"🔗 Extrayendo S3 key de URL completa: {s3_key}")
                return redirect(filepath)
            else:
                logger.warning(f"⚠️ URL S3 malformada: {filepath}")
                return serve_fallback_image("unknown")
        
        # Manejar solicitudes de páginas individuales (ej: CX23/page_1.webp)
        if '/' in filepath and 'page_' in filepath:
            parts = filepath.split('/')
            if len(parts) == 2:
                catalogo_nombre = parts[0]
                archivo_nombre = parts[1]
                
                # Extraer número de página
                if archivo_nombre.startswith('page_') and archivo_nombre.endswith('.webp'):
                    try:
                        numero_pagina = int(archivo_nombre.replace('page_', '').replace('.webp', ''))
                        logger.info(f"🔍 Buscando página {numero_pagina} del catálogo '{catalogo_nombre}'")
                        
                        # Buscar catálogo por nombre
                        catalogos = catalogo_manager.buscar_catalogos(catalogo_nombre)
                        
                        if catalogos:
                            # Buscar coincidencia exacta
                            catalogo_encontrado = None
                            for cat in catalogos:
                                if cat['nombre'] == catalogo_nombre:
                                    catalogo_encontrado = cat
                                    break
                            
                            if catalogo_encontrado:
                                catalogo_id = catalogo_encontrado['id']
                                
                                # Obtener páginas del catálogo
                                paginas = catalogo_manager.obtener_paginas_catalogo(catalogo_id)
                                
                                # Buscar la página específica
                                for pagina in paginas:
                                    if pagina['numero_pagina'] == numero_pagina:
                                        s3_url = pagina['url_s3']
                                        logger.info(f"✅ Página encontrada, redirigiendo a: {s3_url}")
                                        return redirect(s3_url)
                                
                                logger.warning(f"⚠️ Página {numero_pagina} no encontrada para catálogo '{catalogo_nombre}'")
                            else:
                                logger.warning(f"⚠️ Catálogo '{catalogo_nombre}' no encontrado")
                    except ValueError:
                        logger.warning(f"⚠️ No se pudo extraer número de página de: {archivo_nombre}")
        
        # Buscar el archivo en la base de datos por s3_key o nombre
        doc = catalogo_manager.obtener_documento_por_s3_key(filepath)
        
        if doc and doc.get('url_s3'):
            s3_url = doc['url_s3']
            logger.info(f"✅ Archivo encontrado en BD: {s3_url}")
            return redirect(s3_url)
        
        # Si no se encuentra en BD, construir URL directa de S3
        s3_url = f"https://redkossodo.s3.us-east-2.amazonaws.com/{filepath}"
        logger.info(f"🔄 Intentando URL directa S3: {s3_url}")
        
        # Validar que la URL parece correcta antes de redirigir
        if '/pdf/' in filepath or 'thumbnail' in filepath or 'page_' in filepath:
            return redirect(s3_url)
        
        # Si no es un archivo reconocido, servir fallback
        logger.warning(f"⚠️ Archivo no reconocido: {filepath}")
        filename = filepath.split('/')[-1]
        return serve_fallback_image(filename)
        
    except Exception as e:
        logger.error(f"Error sirviendo archivo procesado {filepath}: {str(e)}")
        filename = filepath.split('/')[-1] if '/' in filepath else filepath
        return serve_fallback_image(filename)


def serve_fallback_image(filename: str):
    """Sirve una imagen de fallback cuando S3 no está disponible"""
    try:
        # Si es un thumbnail, devolver SVG de fallback
        if 'thumbnail' in filename.lower() or filename.endswith('.webp') or 'pdf' in filename.lower():
            fallback_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400">
            <rect width="300" height="400" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2" rx="8"/>
            <rect x="40" y="60" width="220" height="280" fill="#e74c3c" rx="12" opacity="0.8"/>
            <rect x="60" y="100" width="180" height="20" fill="#ffffff" rx="4" opacity="0.9"/>
            <rect x="60" y="140" width="140" height="15" fill="#ffffff" rx="3" opacity="0.7"/>
            <rect x="60" y="170" width="160" height="15" fill="#ffffff" rx="3" opacity="0.7"/>
            <rect x="60" y="200" width="120" height="15" fill="#ffffff" rx="3" opacity="0.7"/>
            <circle cx="150" cy="270" r="25" fill="#ffffff" opacity="0.3"/>
            <path d="M140 270 L145 275 L160 260" stroke="#e74c3c" stroke-width="3" fill="none" stroke-linecap="round"/>
            <text x="150" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6c757d" font-weight="500">
                Cargando...
            </text>
            <text x="150" y="385" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#adb5bd">
                PDF temporalmente no disponible
            </text>
            </svg>'''
            
            from flask import Response
            return Response(fallback_svg, mimetype='image/svg+xml', headers={
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            })
        
        # Para otros archivos, intentar servir desde static local
        try:
            static_path = os.path.join(os.path.dirname(__file__), 'static', 'images', 'pdf-icon.svg')
            if os.path.exists(static_path):
                return send_file(static_path, mimetype='image/svg+xml')
        except:
            pass
        
        # Último recurso: error 404
        return "Archivo no encontrado", 404
        
    except Exception as e:
        logger.error(f"Error sirviendo fallback para {filename}: {str(e)}")
        return "Error interno", 500


# ==========================================
# MANEJO DE ERRORES
# ==========================================

@pdf_manager_s3_bp.errorhandler(413)
def request_entity_too_large(error):
    """Maneja archivos demasiado grandes"""
    return jsonify({
        'success': False,
        'error': 'Archivo demasiado grande. Máximo permitido: 100MB'
    }), 413


@pdf_manager_s3_bp.errorhandler(400)
def bad_request(error):
    """Maneja peticiones malformadas"""
    return jsonify({
        'success': False,
        'error': 'Petición malformada'
    }), 400


@pdf_manager_s3_bp.errorhandler(500)
def internal_server_error(error):
    """Maneja errores internos del servidor"""
    logger.error(f"Error interno del servidor: {str(error)}", exc_info=True)
    return jsonify({
        'success': False,
        'error': 'Error interno del servidor'
    }), 500


# ==========================================
# DOCUMENTACIÓN DE LA API
# ==========================================

@pdf_manager_s3_bp.route('/docs', methods=['GET'])
def api_docs():
    """Documentación de la API"""
    docs = {
        'title': 'PDF Manager S3 API',
        'version': '2.0.0',
        'description': 'API profesional para gestión de catálogos PDF con S3 y base de datos',
        'endpoints': {
            'POST /upload': 'Subir y procesar PDF completo',
            'GET /progress': 'Obtener progreso del procesamiento',
            'GET /catalogos': 'Listar catálogos con filtros',
            'GET /catalogos/{id}': 'Obtener catálogo específico',
            'GET /catalogos/{id}/paginas': 'Obtener páginas de catálogo',
            'GET /catalogos/{id}/pdf': 'Obtener PDF original',
            'GET /catalogos/{id}/thumbnail': 'Obtener thumbnail',
            'DELETE /catalogos/{id}': 'Eliminar catálogo completo',
            'PUT /catalogos/{id}/estado': 'Actualizar estado de catálogo',
            'GET /estadisticas': 'Obtener estadísticas del sistema',
            'POST /limpiar-huerfanos': 'Limpiar archivos huérfanos',
            'GET /health': 'Estado de salud del servicio'
        },
        'architecture': {
            'storage': 'AWS S3',
            'database': 'MySQL con tablas catalogos y catalogos_docs',
            'processing': 'PyMuPDF + PIL para conversión a WEBP',
            'features': [
                'Registro completo en base de datos',
                'URLs directas de S3',
                'Thumbnails automáticos',
                'Procesamiento por lotes',
                'Tracking de progreso',
                'Limpieza de archivos huérfanos',
                'Estadísticas del sistema'
            ]
        }
    }
    
    return jsonify(docs), 200


@pdf_manager_s3_bp.route('/catalogos/nombre/<nombre>/paginas', methods=['GET'])
def get_paginas_catalogo_por_nombre(nombre):
    """Obtiene todas las páginas de un catálogo por su nombre"""
    try:
        logger.info(f"📖 Buscando páginas para catálogo: {nombre}")
        
        # Buscar catálogo por nombre exacto
        catalogos = catalogo_manager.buscar_catalogos(nombre)
        
        if not catalogos:
            return jsonify({
                'success': False,
                'error': f'Catálogo "{nombre}" no encontrado'
            }), 404
        
        # Buscar coincidencia exacta
        catalogo_encontrado = None
        for cat in catalogos:
            if cat['nombre'] == nombre:
                catalogo_encontrado = cat
                break
        
        if not catalogo_encontrado:
            # Si no hay coincidencia exacta, usar el primero
            catalogo_encontrado = catalogos[0]
            logger.warning(f"⚠️ No se encontró coincidencia exacta para '{nombre}', usando: {catalogo_encontrado['nombre']}")
        
        catalogo_id = catalogo_encontrado['id']
        
        # Obtener páginas del catálogo
        paginas = catalogo_manager.obtener_paginas_catalogo(catalogo_id)
        
        if not paginas:
            return jsonify({
                'success': False,
                'error': f'No se encontraron páginas para el catálogo "{nombre}"'
            }), 404
        
        # Formatear respuesta con URLs directas de S3
        paginas_formateadas = []
        for pagina in paginas:
            paginas_formateadas.append({
                'numero_pagina': pagina['numero_pagina'],
                'url': pagina['url_s3'],  # URL directa de S3
                's3_key': pagina['s3_key'],
                'tamaño': pagina['tamaño_archivo']
            })
        
        logger.info(f"✅ Devolviendo {len(paginas_formateadas)} páginas para catálogo '{nombre}'")
        
        return jsonify({
            'success': True,
            'catalogo_id': catalogo_id,
            'nombre': catalogo_encontrado['nombre'],
            'total_paginas': len(paginas_formateadas),
            'paginas': paginas_formateadas
        }), 200
        
    except Exception as e:
        logger.error(f"Error obteniendo páginas del catálogo '{nombre}': {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 