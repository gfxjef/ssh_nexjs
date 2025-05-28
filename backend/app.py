from flask import Flask, request, jsonify, send_file, send_from_directory, current_app
from flask_cors import CORS
import jwt
import hashlib
import os
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
# from db.pdf_manager import pdf_manager_bp, init_pdf_module # COMENTADO: Sistema local
# Importar el blueprint del gestor de PDFs con S3 (nueva arquitectura)
from db.pdf_manager.routes_s3 import pdf_manager_s3_bp

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
            "origins": [
                "http://localhost:3000", 
                "http://localhost:5000",
                "http://www.grupokossodo.com:5000",
                "*"
            ],  # Permitir localhost y dominio de producción
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
# app.register_blueprint(pdf_manager_bp) # COMENTADO: Sistema local
# Registrar el blueprint del gestor de PDFs con S3 (nueva arquitectura)
app.register_blueprint(pdf_manager_s3_bp) # Removido el url_prefix duplicado

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
    # print("APP: Llamando a init_pdf_module()") # COMENTADO: Inicialización del sistema local
    # init_pdf_module(app) # COMENTADO: Inicialización del sistema local
    # print("APP: init_pdf_module() finalizado.") # COMENTADO
    print("PDF_MANAGER: Configurado para usar S3. No se requiere init_pdf_module() local.")
    
    # Inicializar la base de datos del sistema S3
    from db.pdf_manager.models import init_pdf_s3_db
    print("APP: Llamando a init_pdf_s3_db()")
    init_pdf_s3_db()
    print("APP: init_pdf_s3_db() finalizado.")

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

# Endpoint para servir archivos estáticos (uploads centralizados)
@app.route('/uploads/<path:filename>')
def serve_uploaded_file(filename):
    """
    Sirve archivos estáticos desde el sistema centralizado de uploads
    """
    try:
        import os
        from flask import send_from_directory
        
        # Usar el sistema centralizado para obtener la ruta base
        # Priorizar el directorio centralizado
        centralized_upload_dir = os.path.join('frontend', 'public', 'uploads')
        
        # Verificar si existe en el sistema centralizado
        centralized_file_path = os.path.join(centralized_upload_dir, filename)
        
        if os.path.exists(centralized_file_path):
            # Servir desde sistema centralizado
            file_dir = os.path.dirname(centralized_file_path)
            file_name = os.path.basename(centralized_file_path)
            print(f"✅ Sirviendo archivo desde sistema centralizado: {centralized_file_path}")
            return send_from_directory(file_dir, file_name)
        
        # Fallback: buscar en directorios legacy para compatibilidad
        legacy_upload_dirs = [
            '/opt/render/project/src/uploads',
            os.path.join(os.getcwd(), 'uploads'),
            os.path.join(os.getcwd(), 'backend', 'uploads'),
            os.path.join(os.path.dirname(__file__), 'uploads')
        ]
        
        for upload_dir in legacy_upload_dirs:
            if os.path.exists(upload_dir):
                file_path = os.path.join(upload_dir, filename)
                if os.path.exists(file_path):
                    file_dir = os.path.dirname(file_path)
                    file_name = os.path.basename(file_path)
                    print(f"⚠️ Sirviendo archivo desde sistema legacy: {file_path}")
                    return send_from_directory(file_dir, file_name)
        
        # Archivo no encontrado en ningún sistema
        print(f"❌ Archivo no encontrado: {filename}")
        print(f"   Buscado en centralizado: {centralized_file_path}")
        print(f"   Buscado en legacy: {[os.path.join(d, filename) for d in legacy_upload_dirs if os.path.exists(d)]}")
        
        return jsonify({'error': 'Archivo no encontrado'}), 404
        
        # Obtener el directorio padre del archivo y el nombre del archivo
        file_dir = os.path.dirname(filename)
        file_name = os.path.basename(filename)
        
        # Si hay subdirectorio, construir la ruta completa
        if file_dir:
            serve_dir = os.path.join(upload_dir, file_dir)
        else:
            serve_dir = upload_dir
            
        # Servir el archivo desde el directorio correcto
        return send_from_directory(serve_dir, file_name)
        
    except Exception as e:
        print(f"Error al servir archivo {filename}: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

# Configurar el manejo de archivos estáticos globales
@app.route('/images/<path:filename>')
def serve_global_images(filename):
    """Sirve archivos de imágenes globales"""
    try:
        # Buscar primero en la carpeta de pdf_manager
        static_path = os.path.join(current_app.root_path, 'db', 'pdf_manager', 'static', 'images', filename)
        if os.path.exists(static_path):
            return send_file(static_path)
        
        # Si es el pdf-icon.svg que falta, crearlo dinámicamente
        if filename == 'pdf-icon.svg':
            pdf_icon_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
            <rect x="5" y="5" width="40" height="50" fill="#e74c3c" rx="3" stroke="#c0392b" stroke-width="1"/>
            <path d="M35 5 L35 15 L45 15 Z" fill="#c0392b"/>
            <rect x="10" y="20" width="25" height="3" fill="#ffffff" rx="1"/>
            <rect x="10" y="26" width="20" height="2" fill="#ffffff" rx="1"/>
            <rect x="10" y="30" width="22" height="2" fill="#ffffff" rx="1"/>
            <rect x="10" y="34" width="18" height="2" fill="#ffffff" rx="1"/>
            <text x="22" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#ffffff" font-weight="bold">PDF</text>
            </svg>'''
            
            from flask import Response
            return Response(pdf_icon_svg, mimetype='image/svg+xml', headers={
                'Cache-Control': 'public, max-age=86400',  # Cache por 24 horas
                'Content-Type': 'image/svg+xml'
            })
        
        # Para otros archivos, devolver 404
        return "Imagen no encontrada", 404
        
    except Exception as e:
        print(f"Error sirviendo imagen global {filename}: {str(e)}")
        # Devolver un SVG de fallback genérico
        fallback_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
        <rect x="5" y="5" width="50" height="50" fill="#cccccc" rx="5"/>
        <text x="30" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#666">?</text>
        </svg>'''
        from flask import Response
        return Response(fallback_svg, mimetype='image/svg+xml')

# Configurar el manejo de archivos estáticos del PDF manager
@app.route('/api/pdfs/static/<path:filename>')
def serve_pdf_static(filename):
    """Sirve archivos estáticos del PDF manager"""
    try:
        static_path = os.path.join(current_app.root_path, 'db', 'pdf_manager', 'static')
        return send_from_directory(static_path, filename)
    except Exception as e:
        print(f"Error sirviendo archivo estático {filename}: {str(e)}")
        return "Archivo no encontrado", 404

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