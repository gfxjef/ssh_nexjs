"""
Configuración centralizada para conexiones a bases de datos.
Este módulo proporciona configuraciones y funciones para gestionar conexiones a bases de datos.
"""
import os
from dotenv import load_dotenv

# Intentar cargar variables de entorno desde .env si existe
load_dotenv()

# Configuración de la base de datos MySQL
DB_CONFIG = {
    'user': os.getenv('DB_USER', 'atusalud_atusalud'),
    'password': os.getenv('DB_PASSWORD', 'kmachin1'),
    'host': os.getenv('DB_HOST', 'atusaludlicoreria.com'),
    'database': os.getenv('DB_NAME', 'atusalud_kossomet'),
    'port': int(os.getenv('DB_PORT', 3306))
}

# Secreto para JWT (usado en la autenticación)
JWT_SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-here-change-in-production')

# Export fácil de usar
def get_db_config():
    """
    Retorna la configuración de la base de datos.
    
    Returns:
        dict: Configuración de conexión a la base de datos.
    """
    return DB_CONFIG

def get_jwt_secret():
    """
    Retorna el secreto para firmar tokens JWT.
    
    Returns:
        str: Secret key para JWT.
    """
    return JWT_SECRET_KEY 