"""
Paquete para gestionar conexiones y operaciones de base de datos.
"""
from .config import get_db_config, get_jwt_secret
# from .mysql_connection import get_connection, execute_query, execute_many # ELIMINADA
from .auth import (
    login_user, 
    register_user, 
    verify_token, 
    hash_password, 
    generate_token, 
    init_auth_tables
)

# Importar el módulo de login
from . import login

# Importar el blueprint de marketing (stock)
from .marketing import stock_bp

# Inicializar tablas de autenticación al importar el paquete
try:
    init_auth_tables()
except Exception as e:
    print(f"Error al inicializar tablas de autenticación: {e}") 