import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import hashlib
from datetime import datetime, timedelta
import db.login
from db.mysql_connection import MySQLConnection

# Importar el blueprint de bienestar
from db.bienestar import bienestar_bp

# Initialize Flask app
app = Flask(__name__)

# Configuración CORS más explícita y específica
CORS(
    app, 
    resources={
        r"/api/*": {
            "origins": ["http://localhost:3000", "*"],  # Permitir localhost:3000 y fallback a todos
            "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"]
        }
    },
    supports_credentials=True # Si planeas usar cookies o sesiones con CORS
)

# Secret key for JWT tokens from config
from db.config import get_jwt_secret

# Crear instancia de conexión a BD
# db_conn = MySQLConnection() # ELIMINADO

# Registrar el blueprint de bienestar con el prefijo correcto
app.register_blueprint(bienestar_bp, url_prefix='/api/bienestar')

# Authentication routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    """
    Endpoint para autenticar a un usuario.
    Recibe usuario/correo y pass, devuelve token JWT e información del usuario.
    """
    data = request.get_json()
    usuario = data.get('usuario')
    password = data.get('pass')
    
    print(f"Intento de login - Usuario: {usuario}, Pass: {password}")
    
    if not usuario or not password:
        return jsonify({'message': 'Usuario y contraseña son requeridos'}), 400
    
    # Verificación manual para usuario 'admin'
    if usuario == 'admin':
        # Consultar la contraseña almacenada
        query = "SELECT pass FROM usuarios WHERE usuario = %s"
        db_ops = MySQLConnection() # AÑADIDO
        result = db_ops.execute_query(query, (usuario,)) # MODIFICADO
        if result and len(result) > 0:
            stored_pass = result[0]['pass']
            print(f"Contraseña almacenada para admin: {stored_pass}")
            print(f"Contraseña proporcionada: {password}")
            print(f"¿Coinciden? {stored_pass == password}")
    
    # Usar nuestra función de autenticación
    auth_result = db.login.login_usuario(usuario, password)
    
    if not auth_result:
        print("ERROR: Credenciales inválidas")
        return jsonify({'message': 'Credenciales inválidas'}), 401
    
    print(f"ÉXITO: Usuario {usuario} autenticado correctamente")
    return jsonify(auth_result)

@app.route('/api/user/profile', methods=['GET'])
def profile():
    """
    Endpoint protegido para obtener el perfil del usuario.
    Requiere token JWT válido.
    """
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        return jsonify({'message': 'Token no proporcionado'}), 401
    
    try:
        token = auth_header.split(' ')[1]
        payload = db.login.verificar_token(token)
        
        if not payload:
            return jsonify({'message': 'Token inválido o expirado'}), 401
        
        # Obtener información actualizada del usuario
        usuario_id = payload['sub']
        usuario = db.login.obtener_usuario_por_id(usuario_id)
        
        if not usuario:
            return jsonify({'message': 'Usuario no encontrado'}), 404
        
        return jsonify(usuario)
        
    except (IndexError, KeyError):
        return jsonify({'message': 'Token inválido'}), 401

@app.route('/api/verify/table', methods=['GET'])
def verify_table():
    """
    Endpoint para verificar la existencia y estructura de la tabla 'usuarios'.
    Útil para diagnóstico.
    """
    from db.login.auth_usuarios import verificar_tabla_usuarios
    
    tabla_info = verificar_tabla_usuarios()
    return jsonify(tabla_info)

@app.route('/api/usuarios', methods=['GET'])
def list_usuarios():
    """
    Endpoint para listar usuarios (sólo para pruebas).
    En producción, este endpoint debería estar protegido.
    """
    query = """
    SELECT id, correo, nombre, usuario, cargo, grupo, rango, creado_en
    FROM usuarios
    LIMIT 10
    """
    
    db_ops = MySQLConnection() # AÑADIDO
    usuarios = db_ops.execute_query(query) # MODIFICADO
    
    if not usuarios:
        return jsonify({'message': 'No se encontraron usuarios'}), 404
    
    return jsonify({
        'total': len(usuarios),
        'usuarios': usuarios
    })

# Run the app
if __name__ == '__main__':
    print("Iniciando servidor con autenticación MySQL...")
    print("Para probar la autenticación:")
    print("1. POST /api/auth/login - Body: {'usuario': 'xxx', 'pass': 'xxx'}")
    print("2. GET /api/user/profile - Headers: {'Authorization': 'Bearer xxxxx'}")
    print("3. GET /api/verify/table - Para verificar la estructura de la tabla")
    print("4. GET /api/usuarios - Para listar los primeros 10 usuarios")
    app.run(debug=True, host='0.0.0.0', port=5000)
