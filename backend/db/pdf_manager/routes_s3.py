"""
Rutas del PDF Manager con arquitectura S3 + Base de Datos
Sistema profesional de gestión de catálogos
"""

import os
import logging
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from datetime import datetime

from .pdf_processor_s3 import PDFProcessorS3
from .models import CatalogoManager, EstadoCatalogo, TipoArchivo

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Crear blueprint
pdf_manager_s3_bp = Blueprint('pdf_manager_s3', __name__)

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


@pdf_manager_s3_bp.route('/list', methods=['GET'])
def list_legacy():
    """Endpoint de compatibilidad para listar catálogos"""
    logger.warning("⚠️ Usando endpoint legacy /list - considerar migrar a /catalogos")
    return list_catalogos()


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