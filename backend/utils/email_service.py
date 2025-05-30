"""
Servicio de correo electrónico para notificaciones automáticas.
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
import re
from typing import Optional

class EmailService:
    def __init__(self):
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.email_user = os.getenv('EMAIL_USER')
        self.email_password = os.getenv('EMAIL_PASSWORD')
        self.frontend_base_url = os.getenv('FRONTEND_BASE_URL', 'http://www.grupokossodo.com:5000')
        
        if not self.email_user or not self.email_password:
            raise ValueError("EMAIL_USER y EMAIL_PASSWORD deben estar configurados en las variables de entorno")
    
    def clean_html_content(self, html_content: str, max_chars: int = 500) -> str:
        """
        Limpia el contenido HTML y lo trunca a max_chars caracteres.
        """
        if not html_content:
            return ""
        
        # Remover tags HTML básicos pero mantener saltos de línea
        clean_text = re.sub(r'<[^>]+>', '', html_content)
        
        # Limpiar espacios extra y saltos de línea múltiples
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        # Truncar si es necesario
        if len(clean_text) > max_chars:
            clean_text = clean_text[:max_chars].rsplit(' ', 1)[0] + "..."
        
        return clean_text
    
    def create_post_notification_email(self, post_data: dict, category_name: str) -> str:
        """
        Crea el HTML del correo para notificación de nuevo post.
        """
        # Limpiar y truncar contenido
        content_preview = self.clean_html_content(post_data.get('contenido', ''), 500)
        
        # URL del post
        post_url = f"{self.frontend_base_url}/dashboard/bienestar/posts/{post_data['id']}"
        
        # Imagen del post (si existe)
        image_section = ""
        if post_data.get('imagen_url'):
            image_section = f"""
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="{post_data['imagen_url']}" alt="{post_data['titulo']}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            </div>
            """
        
        # Template HTML del correo
        html_template = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nuevo Post: {post_data['titulo']}</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                }}
                .container {{
                    background-color: white;
                    border-radius: 12px;
                    padding: 30px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #2e3954;
                }}
                .header h1 {{
                    color: #2e3954;
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                }}
                .post-title {{
                    color: #2e3954;
                    font-size: 22px;
                    font-weight: bold;
                    margin: 20px 0 15px 0;
                    line-height: 1.3;
                }}
                .post-meta {{
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    gap: 10px;
                }}
                .author {{
                    color: #666;
                    font-size: 14px;
                    font-weight: 500;
                }}
                .category-badge {{
                    background-color: #2e3954;
                    color: white;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }}
                .content {{
                    color: #555;
                    font-size: 16px;
                    line-height: 1.7;
                    margin-bottom: 25px;
                    text-align: justify;
                }}
                .read-more {{
                    text-align: center;
                    margin: 30px 0;
                }}
                .btn {{
                    display: inline-block;
                    background: linear-gradient(135deg, #2e3954 0%, #4a5568 100%);
                    color: white;
                    text-decoration: none;
                    padding: 14px 30px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 16px;
                    transition: transform 0.2s ease;
                    box-shadow: 0 4px 12px rgba(46, 57, 84, 0.3);
                }}
                .btn:hover {{
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(46, 57, 84, 0.4);
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    text-align: center;
                    color: #888;
                    font-size: 12px;
                    line-height: 1.5;
                }}
                .footer strong {{
                    color: #666;
                }}
                @media (max-width: 600px) {{
                    body {{
                        padding: 10px;
                    }}
                    .container {{
                        padding: 20px;
                    }}
                    .post-meta {{
                        flex-direction: column;
                        align-items: flex-start;
                    }}
                    .btn {{
                        padding: 12px 24px;
                        font-size: 14px;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🌟 Nuevo Artículo de Bienestar</h1>
                </div>
                
                {image_section}
                
                <h2 class="post-title">{post_data['titulo']}</h2>
                
                <div class="post-meta">
                    <span class="author">👤 Por {post_data['autor']}</span>
                    <span class="category-badge">{category_name}</span>
                </div>
                
                <div class="content">
                    {content_preview}
                    <br><br>
                    <em style="color: #2e3954; font-weight: 500;">Ve el artículo completo haciendo clic en el botón de abajo ⬇️</em>
                </div>
                
                <div class="read-more">
                    <a href="{post_url}" class="btn">📖 Ver Artículo Completo</a>
                </div>
                
                <div class="footer">
                    <strong>📧 Correo Automático</strong><br>
                    Este es un correo automático del sistema de notificaciones de Grupo Kossodo.<br>
                    <strong>No responder a este mensaje.</strong><br><br>
                    Si no deseas recibir estas notificaciones, ponte en contacto con el administrador del sistema.
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_template
    
    def send_post_notification(self, post_data: dict, category_name: str, recipient_email: str = "jcamacho@kossodo.com") -> bool:
        """
        Envía notificación de nuevo post publicado.
        
        Args:
            post_data (dict): Datos del post
            category_name (str): Nombre de la categoría
            recipient_email (str): Email del destinatario
            
        Returns:
            bool: True si se envió correctamente, False en caso contrario
        """
        try:
            # Crear mensaje
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"📝 Nuevo Post: {post_data['titulo']}"
            msg['From'] = self.email_user
            msg['To'] = recipient_email
            
            # Crear contenido HTML
            html_content = self.create_post_notification_email(post_data, category_name)
            html_part = MIMEText(html_content, 'html', 'utf-8')
            
            # Agregar contenido al mensaje
            msg.attach(html_part)
            
            # Conectar y enviar
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.email_user, self.email_password)
            
            text = msg.as_string()
            server.sendmail(self.email_user, recipient_email, text)
            server.quit()
            
            print(f"✅ Correo enviado exitosamente a {recipient_email} para el post: {post_data['titulo']}")
            return True
            
        except Exception as e:
            print(f"❌ Error enviando correo: {str(e)}")
            return False

# Instancia global del servicio
email_service = EmailService() 