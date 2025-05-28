"""
Módulo para la gestión de posts y categorías de bienestar.
Este módulo proporciona las funciones y clases necesarias para administrar el blog de bienestar.
"""

from flask import Blueprint

# Crear el blueprint para bienestar
bienestar_bp = Blueprint('bienestar', __name__)

# Importar las rutas
from .routes import posts, categories 

# Importar y registrar el blueprint de documentos
from .documentos import documentos_bp
bienestar_bp.register_blueprint(documentos_bp, url_prefix='/documentos')

# Importar funciones de setup
from .setup import setup_database, seed_initial_data

def init_bienestar_db():
    """
    Inicializa las tablas y datos semilla para el módulo de bienestar.
    """
    print("BIENESTAR: Iniciando configuración de base de datos para el módulo...")
    if setup_database():
        print("BIENESTAR: Tablas creadas/verificadas correctamente.")
        if seed_initial_data():
            print("BIENESTAR: Datos iniciales cargados/verificados correctamente.")
        else:
            print("BIENESTAR: Error al cargar datos iniciales.")
    else:
        print("BIENESTAR: Error al configurar las tablas de la base de datos.") 