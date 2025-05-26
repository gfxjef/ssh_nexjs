"""
Módulo de gestión de documentos para el sistema de bienestar.

Este módulo proporciona funcionalidades para:
- Gestión de categorías de documentos
- Gestión de etiquetas con colores
- Subida y descarga segura de archivos
- Sistema de auditoría y logging
- Búsqueda avanzada por categorías y etiquetas

Estructura:
- queries.py: Consultas SQL para todas las tablas
- setup.py: Configuración inicial de base de datos
- models.py: Modelos de datos (próximamente)
- routes.py: Endpoints de la API (próximamente)
- utils.py: Utilidades del módulo (próximamente)
"""

from .setup import (
    setup_documents_database,
    seed_initial_documents_data,
    create_uploads_directory,
    setup_complete_documents_module
)

from .queries import (
    # Queries de creación de tablas
    CREATE_DOCUMENT_CATEGORIES_TABLE,
    CREATE_TAGS_TABLE,
    CREATE_DOCUMENTS_TABLE,
    CREATE_DOCUMENT_TAGS_TABLE,
    CREATE_DOCUMENT_AUDIT_TABLE,
    
    # Queries para categorías
    GET_ALL_DOCUMENT_CATEGORIES,
    GET_DOCUMENT_CATEGORY_BY_ID,
    INSERT_DOCUMENT_CATEGORY,
    UPDATE_DOCUMENT_CATEGORY,
    DELETE_DOCUMENT_CATEGORY,
    
    # Queries para etiquetas
    GET_ALL_TAGS,
    GET_TAG_BY_ID,
    INSERT_TAG,
    UPDATE_TAG,
    DELETE_TAG,
    
    # Queries para documentos
    GET_ALL_DOCUMENTS,
    GET_DOCUMENTS_BY_CATEGORY,
    GET_DOCUMENTS_BY_TAG,
    GET_DOCUMENT_BY_ID,
    SEARCH_DOCUMENTS,
    INSERT_DOCUMENT,
    UPDATE_DOCUMENT,
    DELETE_DOCUMENT,
    
    # Queries para auditoría
    LOG_DOCUMENT_ACTION,
    GET_DOCUMENT_AUDIT_LOG,
    GET_USER_AUDIT_LOG
)

# Importar modelos
from .models import (
    DocumentCategory,
    DocumentTag,
    Document,
    DocumentTagRelation,
    DocumentAudit
)

# Importar utilidades
from .utils import (
    FileValidator,
    FileManager,
    DocumentUtils,
    SearchHelper,
    DocumentStats
)

# Crear blueprint
from flask import Blueprint

documentos_bp = Blueprint('documentos', __name__, url_prefix='/api/bienestar/documentos')

# Importar rutas para registrarlas en el blueprint
from .routes import *

__version__ = "1.0.0"
__author__ = "Sistema de Bienestar y Talento" 