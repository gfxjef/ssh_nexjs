"""
Aplicación Flask que integra el módulo de bienestar.
Este archivo sirve como punto de entrada para ejecutar la API en modo desarrollo.
"""
from flask import Flask
from flask_cors import CORS

from . import bienestar_bp
from .setup import setup_database, seed_initial_data

def create_app(test_config=None):
    """
    Crea y configura la aplicación Flask.
    
    Args:
        test_config (dict, optional): Configuración para pruebas
        
    Returns:
        Flask: Aplicación configurada
    """
    # Crear y configurar la aplicación
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY='dev',
        JSON_AS_ASCII=False,  # Para manejar caracteres UTF-8 correctamente
    )
    
    # Añadir soporte para CORS
    CORS(app)
    
    if test_config is None:
        # Cargar la configuración de instancia, si existe
        app.config.from_pyfile('config.py', silent=True)
    else:
        # Cargar la configuración de prueba si se proporciona
        app.config.from_mapping(test_config)
    
    # Registrar el blueprint de bienestar
    app.register_blueprint(bienestar_bp, url_prefix='/api/bienestar')
    
    @app.route('/')
    def index():
        """Ruta principal que sirve como verificación de funcionamiento"""
        return {
            'status': 'ok',
            'message': 'API de Bienestar funcionando correctamente',
            'endpoints': {
                'posts': '/api/bienestar/posts',
                'categories': '/api/bienestar/categories'
            }
        }
    
    return app

def init_db():
    """
    Inicializa la base de datos.
    Crea las tablas necesarias y carga datos iniciales si es necesario.
    """
    # Configurar la base de datos
    setup_result = setup_database()
    
    if setup_result:
        # Cargar datos iniciales
        seed_initial_data()

if __name__ == '__main__':
    from dotenv import load_dotenv
    load_dotenv()
    import os

    init_db()
    app = create_app()

    host = os.getenv('FLASK_RUN_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_RUN_PORT', 5001))
    debug_str = os.getenv('FLASK_DEBUG', 'True')
    debug = debug_str.lower() in ['true', '1', 't', 'y', 'yes']

    print(f"Servidor del módulo BIENESTAR ejecutándose en {host}:{port} con debug={debug}")
    app.run(debug=debug, host=host, port=port) 