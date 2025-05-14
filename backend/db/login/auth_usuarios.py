"""
Módulo para autenticación de usuarios con MySQL utilizando la tabla 'usuarios'.
Proporciona funciones para login, verificación de tokens y gestión de sesiones.
"""
import jwt
import hashlib
from datetime import datetime, timedelta
from ..mysql_connection import MySQLConnection
from ..config import get_jwt_secret

db_conn = MySQLConnection()

def hash_password(password):
    """
    Genera un hash seguro para la contraseña.
    
    Args:
        password (str): Contraseña en texto plano
        
    Returns:
        str: Hash de la contraseña
    """
    return hashlib.sha256(password.encode()).hexdigest()

def generar_token(usuario_id, usuario, correo, nombre, cargo, grupo, rango, expiration_days=1):
    """
    Genera un token JWT para el usuario autenticado.
    
    Args:
        usuario_id (int): ID del usuario
        usuario (str): Nombre de usuario
        correo (str): Correo electrónico
        nombre (str): Nombre completo
        cargo (str): Cargo
        grupo (str): Grupo
        rango (str): Rango
        expiration_days (int): Días de validez del token
        
    Returns:
        str: Token JWT generado
    """
    payload = {
        'exp': datetime.utcnow() + timedelta(days=expiration_days),
        'iat': datetime.utcnow(),
        'sub': usuario_id,
        'usuario': usuario,
        'correo': correo,
        'nombre': nombre,
        'cargo': cargo,
        'grupo': grupo,
        'rango': rango
    }
    
    return jwt.encode(
        payload,
        get_jwt_secret(),
        algorithm='HS256'
    )

def verificar_token(token):
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

def login_usuario(usuario, password):
    """
    Autentica un usuario con su nombre de usuario y contraseña.
    
    Args:
        usuario (str): Nombre de usuario o correo electrónico
        password (str): Contraseña
        
    Returns:
        dict/None: Información del usuario y token si la autenticación es exitosa, None si falla
    """
    # No aplicamos hash a la contraseña, usamos directamente el valor recibido
    print(f"Login intento - Usando la contraseña directamente: '{password}'")
    
    # Consulta que busca tanto por usuario como por correo
    query = """
    SELECT id, correo, nombre, usuario, cargo, grupo, rango, pass
    FROM usuarios
    WHERE (usuario = %s OR correo = %s)
    """
    
    users = db_conn.execute_query(query, (usuario, usuario))
    
    if not users or len(users) == 0:
        print(f"No se encontró usuario con nombre/correo: {usuario}")
        return None
    
    user = users[0]
    print(f"Usuario encontrado: {user['usuario']}")
    print(f"Pass almacenado en BD: {user['pass']}")
    
    # Comprobar la contraseña directamente sin hash
    if user['pass'] != password:
        print(f"Las contraseñas no coinciden")
        return None
    
    print(f"¡Autenticación exitosa para {usuario}!")
    
    token = generar_token(
        user['id'], 
        user['usuario'], 
        user['correo'], 
        user['nombre'], 
        user['cargo'], 
        user['grupo'], 
        user['rango']
    )
    
    return {
        'token': token,
        'usuario': {
            'id': user['id'],
            'usuario': user['usuario'],
            'correo': user['correo'],
            'nombre': user['nombre'],
            'cargo': user['cargo'],
            'grupo': user['grupo'],
            'rango': user['rango']
        }
    }

def obtener_usuario_por_id(usuario_id):
    """
    Obtiene la información de un usuario por su ID.
    
    Args:
        usuario_id (int): ID del usuario
        
    Returns:
        dict/None: Información del usuario si existe, None si no existe
    """
    query = """
    SELECT id, correo, nombre, usuario, cargo, grupo, rango
    FROM usuarios
    WHERE id = %s
    """
    
    users = db_conn.execute_query(query, (usuario_id,))
    
    if not users or len(users) == 0:
        return None
    
    return users[0]

def verificar_tabla_usuarios():
    """
    Verifica si existe la tabla 'usuarios' y devuelve información sobre su estructura.
    Útil para diagnóstico y verificación.
    
    Returns:
        dict: Información sobre la tabla usuarios
    """
    # Verificar si la tabla existe
    check_table_query = """
    SELECT COUNT(*) as existe
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = 'usuarios'
    """
    
    table_exists = db_conn.execute_query(check_table_query)
    
    if not table_exists or table_exists[0]['existe'] == 0:
        return {
            'exists': False,
            'message': 'La tabla usuarios no existe en la base de datos'
        }
    
    # Obtener estructura de la tabla
    columns_query = """
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'usuarios'
    ORDER BY ORDINAL_POSITION
    """
    
    columns_data = db_conn.execute_query(columns_query)
    
    # Convertir objetos que puedan ser bytes a str para la serialización JSON
    columns = []
    if columns_data:
        for column in columns_data:
            serializable_column = {}
            for key, value in column.items():
                # Convertir bytes a str si es necesario
                if isinstance(value, bytes):
                    serializable_column[key] = value.decode('utf-8')
                else:
                    serializable_column[key] = value
            columns.append(serializable_column)
    
    # Contar registros
    count_query = "SELECT COUNT(*) as total FROM usuarios"
    count_result = db_conn.execute_query(count_query)
    total_users = count_result[0]['total'] if count_result else 0
    
    return {
        'exists': True,
        'total_records': total_users,
        'columns': columns
    } 