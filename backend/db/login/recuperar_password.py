"""
Módulo para recuperación de contraseñas por correo electrónico.
Permite a los usuarios recuperar sus credenciales mediante correo electrónico.
"""
import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from ..mysql_connection import MySQLConnection

# Configurar logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def buscar_usuario_por_correo(correo):
    """
    Busca un usuario en la base de datos por su correo electrónico.
    
    Args:
        correo (str): Correo electrónico del usuario
        
    Returns:
        dict/None: Información del usuario si existe, None si no existe
    """
    query = """
    SELECT id, correo, pass, nombre, usuario, cargo, grupo, rango
    FROM usuarios
    WHERE correo = %s
    """
    
    db_ops = MySQLConnection()
    users = db_ops.execute_query(query, (correo,))
    
    if not users or len(users) == 0:
        logger.info(f"No se encontró usuario con correo: {correo}")
        return None
    
    logger.info(f"Usuario encontrado: {users[0]['usuario']}")
    return users[0]

def generar_plantilla_correo(usuario_data):
    """
    Genera el contenido HTML del correo de recuperación de contraseña.
    
    Args:
        usuario_data (dict): Datos del usuario
        
    Returns:
        str: Contenido HTML del correo
    """
    html_content = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de Contraseña - Grupo Kossodo</title>
        <style>
            .email-container {{ 
                max-width: 600px; 
                margin: 20px auto; 
                background-color: #ffffff; 
                border: 1px solid #e0e0e0; 
                border-radius: 8px; 
                overflow: hidden; 
                font-family: Arial, sans-serif;
            }}
            .email-header {{ 
                background-color: #6CBA9D; 
                color: white; 
                padding: 20px; 
                text-align: center; 
            }}
            .email-header h2 {{ 
                margin: 0; 
                font-size: 24px; 
            }}
            .email-content {{ 
                padding: 20px; 
                line-height: 1.6;
            }}
            .credentials-box {{
                background-color: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
            }}
            .credential-item {{
                margin: 10px 0;
                font-weight: bold;
            }}
            .credential-label {{
                color: #6c757d;
                font-weight: normal;
            }}
            .credential-value {{
                color: #3C4262;
                background-color: #ffffff;
                padding: 5px 10px;
                border-radius: 3px;
                border: 1px solid #ced4da;
                display: inline-block;
                min-width: 150px;
            }}
            .footer {{
                background-color: #f8f9fa;
                padding: 15px;
                text-align: center;
                color: #6c757d;
                font-size: 12px;
            }}
            .warning {{
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 10px;
                border-radius: 5px;
                margin: 15px 0;
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="email-header">
                <h2>🔑 Recuperación de Contraseña</h2>
                <p style="margin: 5px 0 0 0;">Grupo Kossodo - Intranet</p>
            </div>
            
            <div class="email-content">
                <p>Hola <strong>{usuario_data['nombre']}</strong>,</p>
                
                <p>Hemos recibido una solicitud para recuperar tu contraseña. A continuación encontrarás tus credenciales de acceso:</p>
                
                <div class="credentials-box">
                    <h3 style="margin-top: 0; color: #3C4262;">📋 Tus Credenciales</h3>
                    
                    <div class="credential-item">
                        <span class="credential-label">👤 Usuario:</span><br>
                        <span class="credential-value">{usuario_data['usuario']}</span>
                    </div>
                    
                    <div class="credential-item">
                        <span class="credential-label">📧 Correo:</span><br>
                        <span class="credential-value">{usuario_data['correo']}</span>
                    </div>
                    
                    <div class="credential-item">
                        <span class="credential-label">🔐 Contraseña:</span><br>
                        <span class="credential-value">{usuario_data['pass']}</span>
                    </div>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña después de iniciar sesión. Mantén tus credenciales seguras y no las compartas con nadie.
                </div>
                
                <p><strong>📊 Información adicional:</strong></p>
                <ul>
                    <li><strong>Cargo:</strong> {usuario_data['cargo']}</li>
                    <li><strong>Grupo:</strong> {usuario_data['grupo']}</li>
                    <li><strong>Rango:</strong> {usuario_data['rango']}</li>
                </ul>
                
                <p>Puedes acceder a la plataforma utilizando cualquiera de estos métodos:</p>
                <ul>
                    <li>Tu nombre de usuario: <strong>{usuario_data['usuario']}</strong></li>
                    <li>Tu correo electrónico: <strong>{usuario_data['correo']}</strong></li>
                </ul>
                
                <p>Si no solicitaste esta recuperación de contraseña, por favor contacta al administrador del sistema inmediatamente.</p>
                
                <p>Saludos cordiales,<br>
                <strong>Equipo de TI - Grupo Kossodo</strong></p>
            </div>
            
            <div class="footer">
                <p>Este es un correo automático, por favor no responder.</p>
                <p>📧 Generado el {datetime.now().strftime('%d/%m/%Y a las %H:%M:%S')}</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html_content

def enviar_correo_recuperacion(correo_destino, usuario_data):
    """
    Envía el correo de recuperación de contraseña.
    
    Args:
        correo_destino (str): Correo electrónico de destino
        usuario_data (dict): Datos del usuario
        
    Returns:
        dict: Resultado del envío (success: bool, message: str)
    """
    try:
        # Obtener credenciales de correo desde variables de entorno
        email_user = os.environ.get('EMAIL_USER')
        email_password = os.environ.get('EMAIL_PASSWORD')
        
        if not email_user or not email_password:
            logger.error("EMAIL_USER o EMAIL_PASSWORD no están configuradas en las variables de entorno.")
            return {
                "success": False,
                "message": "Configuración de correo no disponible"
            }
        
        # Crear mensaje
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"🔑 Recuperación de Contraseña - {usuario_data['nombre']}"
        msg['From'] = email_user
        msg['To'] = correo_destino
        
        # Generar contenido HTML
        html_content = generar_plantilla_correo(usuario_data)
        
        # Crear parte HTML del mensaje
        html_part = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(html_part)
        
        # Enviar correo usando Gmail SMTP
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(email_user, email_password)
        server.sendmail(email_user, correo_destino, msg.as_string())
        server.quit()
        
        logger.info(f"Correo de recuperación enviado exitosamente a {correo_destino}")
        return {
            "success": True,
            "message": f"Correo de recuperación enviado a {correo_destino}"
        }
        
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"Error de autenticación SMTP: {e}")
        return {
            "success": False,
            "message": "Error de autenticación con el servidor de correo"
        }
    except Exception as e:
        logger.error(f"Error general al enviar correo de recuperación: {e}", exc_info=True)
        return {
            "success": False,
            "message": f"Error al enviar correo: {str(e)}"
        }

def procesar_recuperacion_password(correo):
    """
    Proceso completo de recuperación de contraseña.
    
    Args:
        correo (str): Correo electrónico del usuario
        
    Returns:
        dict: Resultado del proceso (success: bool, message: str)
    """
    try:
        # Validar formato de correo básico
        if not correo or '@' not in correo:
            return {
                "success": False,
                "message": "Correo electrónico inválido"
            }
        
        # Buscar usuario en la base de datos
        usuario_data = buscar_usuario_por_correo(correo)
        
        if not usuario_data:
            # Por seguridad, no revelamos si el correo existe o no
            return {
                "success": True,
                "message": "Si el correo está registrado, recibirás las instrucciones en breve"
            }
        
        # Enviar correo de recuperación
        resultado_envio = enviar_correo_recuperacion(correo, usuario_data)
        
        if resultado_envio["success"]:
            logger.info(f"Recuperación de contraseña procesada exitosamente para {correo}")
            return {
                "success": True,
                "message": "Se han enviado tus credenciales por correo electrónico"
            }
        else:
            logger.error(f"Error al enviar correo de recuperación a {correo}: {resultado_envio['message']}")
            return {
                "success": False,
                "message": "Error al enviar el correo de recuperación"
            }
            
    except Exception as e:
        logger.error(f"Error en proceso de recuperación para {correo}: {e}", exc_info=True)
        return {
            "success": False,
            "message": "Error interno del servidor"
        }

def verificar_configuracion_correo():
    """
    Verifica que las variables de entorno de correo estén configuradas.
    
    Returns:
        dict: Estado de la configuración
    """
    email_user = os.environ.get('EMAIL_USER')
    email_password = os.environ.get('EMAIL_PASSWORD')
    
    return {
        "email_configured": bool(email_user and email_password),
        "email_user": email_user if email_user else "No configurado",
        "email_password_set": bool(email_password)
    } 