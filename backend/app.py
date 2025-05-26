from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import hashlib
from datetime import datetime, timedelta
import db.login
from db.mysql_connection import MySQLConnection

# Importar el blueprint de bienestar
from db.bienestar import bienestar_bp, init_bienestar_db

# Importar el blueprint de documentos de bienestar
from db.bienestar.documentos import documentos_bp

# Importar el blueprint de encuestas
from db.encuestas import encuestas_bp, init_encuestas_db

# Importar el blueprint del gestor de PDFs
from db.pdf_manager import pdf_manager_bp, init_pdf_module

# Importar el blueprint de marketing (stock)
from db.marketing import stock_bp
from db.marketing import solicitudes_bp
from db.marketing import historial_bp

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

# Registrar el blueprint de documentos de bienestar 
app.register_blueprint(documentos_bp)

# Registrar el blueprint de encuestas con el prefijo correcto
app.register_blueprint(encuestas_bp, url_prefix='/api/encuestas')

# Registrar el blueprint del gestor de PDFs
app.register_blueprint(pdf_manager_bp) # El prefijo ya está en el blueprint

# Registrar el blueprint de marketing (stock)
app.register_blueprint(stock_bp) # El prefijo ya está en el blueprint (url_prefix='/api/marketing')
app.register_blueprint(solicitudes_bp) # <-- AÑADIR ESTA LÍNEA. El prefijo ya está en el blueprint (url_prefix='/api/marketing')
app.register_blueprint(historial_bp) # <-- AÑADIR ESTA LÍNEA. El prefijo ya está en el blueprint (url_prefix='/api/marketing')

# Inicializar la base de datos del módulo de bienestar
with app.app_context(): # Asegurarse de que se ejecuta en el contexto de la aplicación
    print("APP: Llamando a init_bienestar_db()")
    init_bienestar_db()
    print("APP: init_bienestar_db() finalizado.")

    # Inicializar la base de datos del módulo de encuestas
    print("APP: Llamando a init_encuestas_db()")
    init_encuestas_db()
    print("APP: init_encuestas_db() finalizado.")

    # Inicializar el módulo PDF (crear directorios y el procesador)
    print("APP: Llamando a init_pdf_module()")
    init_pdf_module(app) # Pasar la instancia de la app
    print("APP: init_pdf_module() finalizado.")

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

@app.route('/api/auth/recuperar-password', methods=['POST'])
def recuperar_password():
    """
    Endpoint para recuperar contraseña por correo electrónico.
    Recibe el correo del usuario y envía sus credenciales por email.
    """
    data = request.get_json()
    correo = data.get('email')
    
    print(f"Solicitud de recuperación de contraseña para: {correo}")
    
    if not correo:
        return jsonify({'message': 'Correo electrónico es requerido'}), 400
    
    # Usar nuestra función de recuperación de contraseña
    resultado = db.login.procesar_recuperacion_password(correo)
    
    if resultado['success']:
        print(f"ÉXITO: Proceso de recuperación completado para {correo}")
        return jsonify({
            'message': resultado['message'],
            'success': True
        }), 200
    else:
        print(f"ERROR: Proceso de recuperación falló para {correo}: {resultado['message']}")
        return jsonify({
            'message': resultado['message'],
            'success': False
        }), 400

@app.route('/api/auth/cambiar-password', methods=['POST'])
def cambiar_password():
    """
    Endpoint para cambiar la contraseña de un usuario autenticado.
    Requiere token JWT válido y contraseña actual.
    """
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        return jsonify({'message': 'Token no proporcionado'}), 401
    
    try:
        token = auth_header.split(' ')[1]
        data = request.get_json()
        
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')
        
        print(f"Solicitud de cambio de contraseña recibida")
        
        if not current_password or not new_password:
            return jsonify({'message': 'Contraseña actual y nueva contraseña son requeridas'}), 400
        
        # Usar nuestra función de cambio de contraseña
        resultado = db.login.procesar_cambio_password(token, current_password, new_password)
        
        if resultado['success']:
            print(f"ÉXITO: Contraseña cambiada exitosamente")
            return jsonify({
                'message': resultado['message'],
                'success': True
            }), 200
        else:
            print(f"ERROR: {resultado['message']}")
            return jsonify({
                'message': resultado['message'],
                'success': False
            }), 400
            
    except (IndexError, KeyError):
        return jsonify({'message': 'Token inválido'}), 401

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
    from dotenv import load_dotenv
    load_dotenv()
    import os

    print("Iniciando servidor principal con autenticación MySQL...")
    print("Para probar la autenticación:")
    print("1. POST /api/auth/login - Body: {'usuario': 'xxx', 'pass': 'xxx'}")
    print("2. GET /api/user/profile - Headers: {'Authorization': 'Bearer xxxxx'}")
    print("3. GET /api/verify/table - Para verificar la estructura de la tabla")
    print("4. GET /api/usuarios - Para listar los primeros 10 usuarios")
    print("5. POST /api/auth/recuperar-password - Body: {'email': 'usuario@correo.com'}")
    print("6. POST /api/auth/cambiar-password - Headers: {'Authorization': 'Bearer xxxxx'} Body: {'currentPassword': 'xxx', 'newPassword': 'xxx'}")

    host = os.getenv('FLASK_RUN_HOST', '0.0.0.0')
    port = int(os.getenv('PORT', os.getenv('FLASK_RUN_PORT', 5000)))
    debug_str = os.getenv('FLASK_DEBUG', 'False')
    debug = debug_str.lower() in ['true', '1', 't', 'y', 'yes']

    print(f"Servidor ejecutándose en {host}:{port} con debug={debug}")
    app.run(debug=debug, host=host, port=port) 