"""
Módulo para autenticación de usuarios con MySQL.
Proporciona funciones para login, registro y validación de tokens.
"""
import jwt
import hashlib
from datetime import datetime, timedelta
from .mysql_connection import execute_query
from .config import get_jwt_secret

def hash_password(password):
    """
    Genera un hash seguro para la contraseña.
    
    Args:
        password (str): Contraseña en texto plano
        
    Returns:
        str: Hash de la contraseña
    """
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token(user_id, username, expiration_days=1):
    """
    Genera un token JWT para el usuario autenticado.
    
    Args:
        user_id (int): ID del usuario
        username (str): Nombre de usuario
        expiration_days (int): Días de validez del token
        
    Returns:
        str: Token JWT generado
    """
    payload = {
        'exp': datetime.utcnow() + timedelta(days=expiration_days),
        'iat': datetime.utcnow(),
        'sub': user_id,
        'username': username
    }
    
    return jwt.encode(
        payload,
        get_jwt_secret(),
        algorithm='HS256'
    )

def verify_token(token):
    """
    Verifica la validez de un token JWT.
    
    Args:
        token (str): Token JWT a verificar
        
    Returns:
        dict/None: Payload del token si es válido, None si no lo es
    """
    try:
        payload = jwt.decode(
            token,
            get_jwt_secret(),
            algorithms=['HS256']
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def login_user(username, password):
    """
    Autentica un usuario con su nombre de usuario y contraseña.
    
    Args:
        username (str): Nombre de usuario
        password (str): Contraseña
        
    Returns:
        dict/None: Información del usuario y token si la autenticación es exitosa, None si falla
    """
    hashed_password = hash_password(password)
    
    query = """
    SELECT id, username
    FROM users
    WHERE username = %s AND password = %s
    """
    
    users = execute_query(query, (username, hashed_password))
    
    if not users or len(users) == 0:
        return None
    
    user = users[0]
    token = generate_token(user['id'], user['username'])
    
    return {
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username']
        }
    }

def register_user(username, password):
    """
    Registra un nuevo usuario en la base de datos.
    
    Args:
        username (str): Nombre de usuario
        password (str): Contraseña
        
    Returns:
        dict/None: Información del usuario y token si el registro es exitoso, None si falla
    """
    hashed_password = hash_password(password)
    
    # Verificar si el usuario ya existe
    check_query = "SELECT id FROM users WHERE username = %s"
    existing_users = execute_query(check_query, (username,))
    
    if existing_users and len(existing_users) > 0:
        return None
    
    # Insertar nuevo usuario
    insert_query = """
    INSERT INTO users (username, password, created_at)
    VALUES (%s, %s, NOW())
    """
    
    result = execute_query(insert_query, (username, hashed_password), fetch=False)
    
    if not result or result.get('affected_rows', 0) == 0:
        return None
    
    # Obtener el ID del usuario recién insertado
    get_id_query = "SELECT LAST_INSERT_ID() as id"
    id_result = execute_query(get_id_query)
    
    if not id_result or len(id_result) == 0:
        return None
    
    user_id = id_result[0]['id']
    token = generate_token(user_id, username)
    
    return {
        'token': token,
        'user': {
            'id': user_id,
            'username': username
        }
    }

def init_auth_tables():
    """
    Inicializa las tablas necesarias para la autenticación si no existen.
    
    Returns:
        bool: True si se crean/verifican correctamente, False si hay error
    """
    create_table_query = """
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
    """
    
    result = execute_query(create_table_query, fetch=False)
    return result is not None 