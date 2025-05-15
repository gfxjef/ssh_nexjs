import os
import logging
from flask import Blueprint, current_app, url_for

logger = logging.getLogger(__name__)

# Nombre del Blueprint
pdf_manager_bp = Blueprint('pdf_manager', __name__,
                           template_folder='templates', # Relativo a backend/db/pdf_manager/
                           static_folder='static',    # Relativo a backend/db/pdf_manager/
                           static_url_path='/api/pdfs/static', # URL pública para los estáticos del módulo
                           url_prefix='/api/pdfs')     # Prefijo para todas las rutas de este blueprint

# Importar las rutas DESPUÉS de crear el blueprint para evitar importaciones circulares
from . import routes as pdf_manager_routes


def get_pdf_upload_dir(app):
    return os.path.join(app.root_path, 'db', 'pdf_manager', 'uploads')

def get_pdf_processed_files_dir(app):
    return os.path.join(app.root_path, 'db', 'pdf_manager', 'pdf_files')

def init_pdf_module(app):
    """
    Función para inicializar directorios y el procesador de PDF
    cuando el blueprint es registrado o la app se inicia.
    """
    with app.app_context():
        upload_dir = get_pdf_upload_dir(app)
        processed_dir = get_pdf_processed_files_dir(app)

        os.makedirs(upload_dir, exist_ok=True)
        os.makedirs(processed_dir, exist_ok=True)

        logger.info(f"PDF_MANAGER: Directorio de uploads inicializado: {upload_dir}")
        logger.info(f"PDF_MANAGER: Directorio de archivos procesados inicializado: {processed_dir}")
        
        # Inicializar el procesador de PDF (si es una instancia global en routes.py)
        # Esto asegura que el procesador conozca las rutas correctas desde el inicio.
        if hasattr(pdf_manager_routes, 'init_pdf_processor_with_context'):
            pdf_manager_routes.init_pdf_processor_with_context(app)
        else:
            logger.warning("PDF_MANAGER: La función 'init_pdf_processor_with_context' no se encontró en routes.py")

@pdf_manager_bp.context_processor
def inject_pdf_manager_urls():
    """
    Inyecta variables en el contexto de las plantillas para este blueprint.
    """
    base_url = pdf_manager_bp.url_prefix if pdf_manager_bp.url_prefix else ''
    static_url = ''
    try:
        # Genera la URL base para los archivos estáticos, ej: /api/pdfs/static/
        # filename='' es importante para obtener solo la base de la ruta estática.
        static_url = url_for('pdf_manager.static', filename='')
    except Exception as e:
        logger.error(f"Error al generar pdf_manager_static_url: {e}. El blueprint podría no estar completamente configurado aún.")
        # Fallback si url_for falla (ej. durante la configuración inicial de la app)
        if base_url and pdf_manager_bp.static_url_path:
            # Concatena manualmente si es posible
            static_url = base_url.rstrip('/') + '/' + pdf_manager_bp.static_url_path.lstrip('/')
            if not static_url.endswith('/'):
                static_url += '/'
        else: # Peor caso, usar una ruta relativa (puede no funcionar siempre)
            static_url = './static/'


    return {
        'pdf_manager_base_url': base_url,
        'pdf_manager_static_url': static_url
    } 