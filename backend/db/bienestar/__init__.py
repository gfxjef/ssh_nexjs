"""
Módulo para la gestión de posts y categorías de bienestar.
Este módulo proporciona las funciones y clases necesarias para administrar el blog de bienestar.
"""

from flask import Blueprint

# Crear el blueprint para bienestar
bienestar_bp = Blueprint('bienestar', __name__)

# Importar las rutas
from .routes import posts, categories 