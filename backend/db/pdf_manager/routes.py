import os
import shutil
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from flask import request, jsonify, send_from_directory, redirect, url_for, current_app, render_template
from werkzeug.utils import secure_filename

from . import pdf_manager_bp # Importar el blueprint del __init__.py de este mismo directorio
from .pdf_processor import PDFProcessor
from ..config import get_jwt_secret # Para la protección de rutas si es necesario en el futuro

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración de carga de archivos
ALLOWED_EXTENSIONS = {'pdf'}

# Instancia global del procesador de PDF
# Se inicializará correctamente usando init_pdf_processor_with_context() desde __init__.py
pdf_processor_instance = None

def get_upload_temp_dir():
    """Obtiene la carpeta de subida temporal de archivos PDF."""
    return os.path.join(current_app.root_path, 'db', 'pdf_manager', 'uploads')

def get_processed_pdf_base_dir():
    """Obtiene la carpeta base donde se guardan los PDFs procesados (subcarpetas por PDF)."""
    return os.path.join(current_app.root_path, 'db', 'pdf_manager', 'pdf_files')

def init_pdf_processor_with_context(app):
    """
    Inicializa el procesador de PDF con el contexto de la aplicación disponible.
    Esta función será llamada desde el __init__.py del módulo.
    """
    global pdf_processor_instance
    if pdf_processor_instance is None:
        with app.app_context(): # Asegura que estamos en el contexto de la app
            upload_dir = get_upload_temp_dir()
            processed_dir = get_processed_pdf_base_dir()
            pdf_processor_instance = PDFProcessor(base_dir_for_pdfs=processed_dir, base_dir_for_uploads=upload_dir)
            logger.info("PDF_MANAGER ROUTES: PDFProcessor inicializado.")
    return pdf_processor_instance

def get_pdf_processor():
    """Obtiene la instancia del procesador de PDF. Lo inicializa si es necesario."""
    global pdf_processor_instance
    if pdf_processor_instance is None:
        if current_app:
            logger.warning("PDF_MANAGER ROUTES: PDFProcessor accedido antes de la inicialización explícita. Intentando inicializar ahora.")
            init_pdf_processor_with_context(current_app)
        else:
            # Esto no debería ocurrir en un flujo normal de Flask
            logger.error("PDF_MANAGER ROUTES: No hay contexto de aplicación para inicializar PDFProcessor.")
            raise RuntimeError("PDFProcessor no inicializado y sin contexto de aplicación.")
    return pdf_processor_instance

# --- Rutas para servir HTML estáticos y assets ---

@pdf_manager_bp.route('/')
def index_route():
    """Sirve el index.html principal (visor de un PDF específico)."""
    # Esta ruta podría esperar un parámetro ?pdf=nombre_catalogo para cargar un PDF específico
    # o redirigir al catálogo si no se especifica.
    pdf_param = request.args.get('pdf')
    if not pdf_param:
        return redirect(url_for('pdf_manager.catalogo_route'))
    return render_template('pdf_reader/index.html', pdf_url=pdf_param) # index.html debe estar en templates/pdf_reader

@pdf_manager_bp.route('/catalogo')
def catalogo_route():
    """Sirve la página de catálogo."""
    return render_template('pdf_reader/catalogo.html') # catalogo.html debe estar en templates/pdf_reader

@pdf_manager_bp.route('/upload-page') # Cambiado de /upload para evitar colisión con API
def upload_page_route():
    """Sirve la página para subir PDFs."""
    return render_template('pdf_reader/upload.html') # upload.html debe estar en templates/pdf_reader

@pdf_manager_bp.route('/ver-todos') # Cambiado de /ver para claridad
def ver_todos_catalogos_route():
    """Página para visualizar el listado completo de catálogos (ver.html)."""
    return render_template('pdf_reader/ver.html') # ver.html debe estar en templates/pdf_reader


# --- Rutas de API ---

def allowed_file(filename):
    """Verifica si la extensión del archivo es permitida."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@pdf_manager_bp.route('/upload-pdf', methods=['POST'])
def upload_pdf_api():
    """Endpoint API para subir y procesar un PDF."""
    processor = get_pdf_processor()
    
    if 'pdf' not in request.files:
        return jsonify({'success': False, 'error': 'No se envió archivo PDF'}), 400
    
    file = request.files['pdf']
    
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No se seleccionó archivo'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        upload_folder = get_upload_temp_dir()
        temp_path = os.path.join(upload_folder, filename)
        
        try:
            file.save(temp_path)
            logger.info(f"PDF guardado temporalmente en: {temp_path}")
            
            # Procesar el PDF
            result = processor.process_pdf(temp_path, delete_after=True)
            
            if result.get('success', False):
                # Las rutas en 'images_relative_paths' y 'thumbnail_relative_path'
                # ya son relativas a la carpeta base de PDFs procesados.
                # El frontend las usará con el prefijo estático /api/pdfs/static/processed_files/
                return jsonify({
                    'success': True,
                    'pdf_name': result.get('pdf_name'),
                    'pages': result.get('pages'),
                    'images_relative_paths': result.get('images_relative_paths'),
                    'thumbnail_relative_path': result.get('thumbnail_relative_path'),
                    'original_pdf_stored_path': result.get('original_pdf_stored_path'),
                    'message': f"PDF {result.get('pdf_name')} procesado con {result.get('pages', 0)} páginas."
                })
            else:
                return jsonify({
                    'success': False,
                    'error': result.get('error', 'Error desconocido durante el procesamiento')
                }), 500
        except Exception as e:
            logger.error(f"Error en la API upload_pdf: {str(e)}", exc_info=True)
            # Asegurarse de eliminar el archivo temporal si la subida falló antes del procesamiento
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception as e_del_fail:
                    logger.error(f"Error eliminando archivo temporal {temp_path} tras fallo: {e_del_fail}")
            return jsonify({'success': False, 'error': str(e)}), 500
        finally:
            # Si delete_after=False en process_pdf o el procesamiento falló antes de la eliminación,
            # y el archivo temporal aún existe, se podría eliminar aquí.
            # Pero process_pdf ya lo maneja con delete_after=True.
            pass
            
    return jsonify({'success': False, 'error': 'Tipo de archivo no permitido'}), 400

@pdf_manager_bp.route('/listar-pdfs-procesados')
def listar_pdfs_procesados_api():
    """
    Endpoint API para listar PDFs procesados.
    Escanea el directorio de `pdf_files` y devuelve la información.
    """
    processed_pdfs_dir = get_processed_pdf_base_dir()
    processed_catalogs = []

    if not os.path.exists(processed_pdfs_dir):
        logger.warning(f"Directorio de PDFs procesados no encontrado: {processed_pdfs_dir}")
        return jsonify([]) # Devuelve lista vacía si el directorio no existe

    try:
        for item_name in os.listdir(processed_pdfs_dir):
            item_path = os.path.join(processed_pdfs_dir, item_name)
            if os.path.isdir(item_path): # Cada subdirectorio es un catálogo procesado
                pdf_name = item_name # El nombre de la carpeta es el nombre base del PDF
                
                page_files = [f for f in os.listdir(item_path) 
                              if f.startswith('page_') and f.endswith('.webp')]
                page_count = len(page_files)
                
                original_pdf_filename = f"{pdf_name}.pdf"
                original_pdf_exists = os.path.exists(os.path.join(item_path, original_pdf_filename))

                # Lógica mejorada para encontrar la miniatura
                thumbnail_path_relative = None
                
                # 1. Buscar la miniatura estándar generada por PDFProcessor
                processor_thumb_filename = f"thumb_{pdf_name}.webp"
                if os.path.exists(os.path.join(item_path, processor_thumb_filename)):
                    thumbnail_path_relative = os.path.join(pdf_name, processor_thumb_filename)
                
                # 2. Si no se encuentra, buscar tu estructura preexistente (ej: thumb_1.webp directamente en la carpeta del catálogo)
                if not thumbnail_path_relative:
                    user_thumb_filename = "thumb_1.webp" # Asumiendo que este es el nombre estándar
                    if os.path.exists(os.path.join(item_path, user_thumb_filename)):
                        thumbnail_path_relative = os.path.join(pdf_name, user_thumb_filename)
                
                # 3. Si aún no se encuentra y había una carpeta 'thumbnail', buscar dentro de ella
                if not thumbnail_path_relative:
                    user_thumb_in_subdir_filename = os.path.join("thumbnail", "thumb_1.webp")
                    if os.path.exists(os.path.join(item_path, user_thumb_in_subdir_filename)):
                        thumbnail_path_relative = os.path.join(pdf_name, user_thumb_in_subdir_filename)

                # 4. Fallback a la primera página si no hay ninguna miniatura específica
                if not thumbnail_path_relative and page_count > 0:
                    first_page_filename = 'page_1.webp'
                    if os.path.exists(os.path.join(item_path, first_page_filename)):
                         thumbnail_path_relative = os.path.join(pdf_name, first_page_filename)

                if page_count > 0 or original_pdf_exists: # Considerar un catálogo si tiene páginas o el PDF original
                    processed_catalogs.append({
                        'name': pdf_name,
                        'pages': page_count,
                        'has_images': page_count > 0,
                        'original_pdf_available': original_pdf_exists,
                        'original_pdf_path_relative': os.path.join(pdf_name, original_pdf_filename) if original_pdf_exists else None,
                        'thumbnail_path_relative': thumbnail_path_relative, # Ruta relativa para servir desde estáticos
                        'images_base_path_relative': pdf_name # Ruta base para construir URLs de imágenes de páginas
                    })
        
        processed_catalogs.sort(key=lambda x: x['name'].lower())
        return jsonify(processed_catalogs)
    except Exception as e:
        logger.error(f"Error al listar PDFs procesados: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@pdf_manager_bp.route('/delete-pdf', methods=['POST'])
def delete_pdf_api():
    """Endpoint API para eliminar un PDF procesado y todos sus archivos asociados del backend."""
    data = request.json
    if not data or 'pdf_name' not in data:
        return jsonify({'success': False, 'error': 'No se especificó el nombre del PDF (sin extensión)'}), 400
        
    pdf_name_without_ext = data['pdf_name']
    
    # El nombre del PDF no debe contener "../" o caracteres maliciosos
    if '..' in pdf_name_without_ext or '/' in pdf_name_without_ext or '\\' in pdf_name_without_ext:
        return jsonify({'success': False, 'error': 'Nombre de PDF inválido'}), 400

    processed_pdf_folder_path = os.path.join(get_processed_pdf_base_dir(), secure_filename(pdf_name_without_ext))
    
    if not os.path.exists(processed_pdf_folder_path) or not os.path.isdir(processed_pdf_folder_path):
        logger.warning(f"Intento de eliminar catálogo no encontrado: {processed_pdf_folder_path}")
        return jsonify({
            'success': False, 
            'error': f'El catálogo "{pdf_name_without_ext}" no existe en el servidor o ya fue eliminado.'
        }), 404
    
    try:
        shutil.rmtree(processed_pdf_folder_path)
        logger.info(f"Catálogo eliminado del backend: {processed_pdf_folder_path}")
        return jsonify({
            'success': True, 
            'message': f'Catálogo "{pdf_name_without_ext}" eliminado correctamente del servidor.'
        })
    except Exception as e:
        logger.error(f"Error al eliminar PDF del backend ({pdf_name_without_ext}): {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

# Ruta para servir archivos procesados (imágenes, PDF original almacenado)
# Ejemplo: /api/pdfs/processed_files/nombre_catalogo/page_1.webp
# Ejemplo: /api/pdfs/processed_files/nombre_catalogo/nombre_catalogo.pdf
@pdf_manager_bp.route('/processed_files/<path:filepath>')
def serve_processed_pdf_files(filepath):
    """Sirve los archivos de un PDF procesado (imágenes, el PDF original)."""
    # filepath será algo como "NombreDelPDF/page_1.webp" o "NombreDelPDF/NombreDelPDF.pdf"
    # Hay que tener cuidado con la seguridad aquí (path traversal)
    # secure_filename podría ser demasiado restrictivo para subdirectorios.
    # Se construye la ruta completa y se verifica que esté dentro del directorio esperado.
    
    base_processed_dir = get_processed_pdf_base_dir()
    
    # Crear la ruta completa al archivo solicitado
    requested_file_path = os.path.join(base_processed_dir, filepath)
    
    # Medida de seguridad: Normalizar la ruta y verificar que sigue estando dentro del directorio base
    if not os.path.normpath(requested_file_path).startswith(os.path.normpath(base_processed_dir)):
        logger.warning(f"Intento de acceso no autorizado a: {filepath}")
        return jsonify({'error': 'Acceso no autorizado'}), 403

    if not os.path.exists(requested_file_path) or not os.path.isfile(requested_file_path):
        logger.warning(f"Archivo procesado no encontrado: {requested_file_path}")
        return jsonify({'error': 'Archivo no encontrado'}), 404
        
    # Extraer el directorio y el nombre del archivo para send_from_directory
    directory, filename = os.path.split(requested_file_path)
    return send_from_directory(directory, filename)


@pdf_manager_bp.route('/progreso-pdf')
def progreso_pdf_api():
    """Endpoint API para consultar el progreso del procesamiento de PDF."""
    processor = get_pdf_processor()
    progress = processor.get_progress()
    return jsonify(progress)

@pdf_manager_bp.route('/report-pdf', methods=['POST'])
def report_pdf_api():
    """Endpoint API para recibir reportes de problemas con PDFs y enviar correo de notificación."""
    report_data = request.json
    if not report_data:
        return jsonify({'success': False, 'error': 'No se recibieron datos'}), 400
        
    required_fields = ['pdf', 'tipo', 'descripcion']
    for field in required_fields:
        if field not in report_data:
            return jsonify({'success': False, 'error': f'Falta el campo {field}'}), 400

    user_data = {
        'nombre': report_data.get('usuario', 'Usuario desconocido'),
        'cargo': report_data.get('cargo', 'Cargo desconocido')
    }

    try:
        send_report_email(report_data, user_data)
        logger.info(f"Reporte para PDF '{report_data['pdf']}' procesado y correo enviado.")
        return jsonify({'success': True, 'message': 'Reporte enviado correctamente'})
    except Exception as e:
        logger.error(f"Error al procesar API de reporte de PDF: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': f"Error interno al enviar reporte: {str(e)}"}), 500

def send_report_email(report_data, user_data):
    """Envía un correo electrónico con el reporte del problema del PDF."""
    # Configuración del correo (directamente usando variables de entorno como solicitaste)
    email_user = os.environ.get('EMAIL_USER') # Ej: 'tu_correo@gmail.com'
    email_password = os.environ.get('EMAIL_PASSWORD') # Ej: 'tu_contraseña_de_aplicacion'
    
    if not email_user or not email_password:
        logger.error("EMAIL_USER o EMAIL_PASSWORD no están configuradas en las variables de entorno.")
        raise ValueError("Credenciales de correo no configuradas en el servidor.")

    # Asegúrate de que estos correos son válidos y existen
    recipients = ['jcamacho@kossodo.com', 'eventos@kossodo.com', 'rbazan@kossodo.com', 'creatividad@kossodo.com']
    
    now = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    
    msg = MIMEMultipart()
    msg['From'] = email_user
    msg['To'] = ', '.join(recipients)
    msg['Subject'] = f"Reporte de Problema con Catálogo PDF: {report_data['pdf']}"
    
    error_types = {
        'descripcion': 'Descripción incorrecta/errónea',
        'imagen': 'Error de Imagen',
        'enlace': 'Enlace roto o Inválido',
        'ortografia': 'Ortografía/Gramática',
        'otro': 'Otro'
    }
    error_type_display = error_types.get(report_data['tipo'], report_data['tipo'])
    
    html = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }}
            .email-container {{ max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }}
            .email-header {{ background-color: #3c4262; color: white; padding: 20px; text-align: center; }}
            .email-header h2 {{ margin: 0; font-size: 24px; }}
            .email-content {{ padding: 20px; }}
            .email-content p {{ margin-bottom: 15px; }}
            .info-section {{ background-color: #f9f9f9; padding: 15px; margin-bottom: 20px; border-left: 4px solid #6cba9d; border-radius: 4px; }}
            .info-section strong {{ color: #3c4262; }}
            .timestamp {{ font-style: italic; color: #555555; font-size: 0.9em; margin-bottom:20px;}}
            .footer {{ font-size: 12px; color: #777777; text-align: center; padding: 20px; background-color: #efefef; border-top: 1px solid #e0e0e0; }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="email-header">
                <h2>Reporte de Problema con Catálogo PDF</h2>
            </div>
            <div class="email-content">
                <p class="timestamp">Fecha del reporte: {now}</p>
                <p>Se ha recibido un nuevo reporte de problema para un PDF del catálogo.</p>
                
                <div class="info-section">
                    <p><strong>PDF Afectado:</strong> {report_data['pdf']}</p>
                    <p><strong>Tipo de Problema Reportado:</strong> {error_type_display}</p>
                    <p><strong>Descripción Detallada:</strong></p>
                    <p>{report_data['descripcion']}</p>
                </div>
                
                <div class="info-section">
                    <p><strong>Reportado por:</strong> {user_data.get('nombre', 'No especificado')}</p>
                    <p><strong>Cargo:</strong> {user_data.get('cargo', 'No especificado')}</p>
                </div>
                
                <p>Se recomienda revisar este catálogo y tomar las acciones necesarias.</p>
            </div>
            <div class="footer">
                <p>Este es un mensaje automático del Sistema de Gestión de Catálogos de Grupo Kossodo.</p>
                <p>&copy; {datetime.now().year} Grupo Kossodo. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    msg.attach(MIMEText(html, 'html'))
    
    try:
        # Usar Gmail SMTP. Asegúrate de que 'Permitir aplicaciones menos seguras' esté ON
        # o usar una contraseña de aplicación si tienes 2FA.
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.ehlo() # Saludo al servidor
        server.starttls() # Iniciar TLS
        server.ehlo() # Saludo de nuevo después de TLS
        server.login(email_user, email_password)
        server.send_message(msg)
        server.quit()
        logger.info(f"Correo de reporte para '{report_data['pdf']}' enviado exitosamente a {', '.join(recipients)}.")
    except smtplib.SMTPAuthenticationError as e_auth:
        logger.error(f"Error de autenticación SMTP: {e_auth}. Verifica EMAIL_USER y EMAIL_PASSWORD.")
        raise ConnectionRefusedError(f"Error de autenticación con el servidor SMTP: {e_auth}")
    except Exception as e_smtp:
        logger.error(f"Error general al enviar correo de reporte: {e_smtp}", exc_info=True)
        raise ConnectionAbortedError(f"Error al enviar correo: {e_smtp}") 