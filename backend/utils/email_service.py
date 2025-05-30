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
        Extrae texto hasta la primera imagen + primera imagen + "Ver más".
        Estrategia simple y efectiva para email marketing.
        """
        if not html_content:
            return ""
        
        # Limpiar referencias a elementos multimedia de texto
        clean_html = re.sub(r'\[imagen\s+numero?\s*\d*[^\]]*\]', '', html_content, flags=re.IGNORECASE)
        clean_html = re.sub(r'\[video[^\]]*\]', '', clean_html, flags=re.IGNORECASE)
        clean_html = re.sub(r'\[audio[^\]]*\]', '', clean_html, flags=re.IGNORECASE)
        clean_html = re.sub(r'\[archivo[^\]]*\]', '', clean_html, flags=re.IGNORECASE)
        clean_html = re.sub(r'\[documento[^\]]*\]', '', clean_html, flags=re.IGNORECASE)
        
        # Limpiar etiquetas font y estilos innecesarios
        clean_html = re.sub(r'<font[^>]*>', '', clean_html, flags=re.IGNORECASE)
        clean_html = re.sub(r'</font>', '', clean_html, flags=re.IGNORECASE)
        clean_html = re.sub(r'<div[^>]*>', '<p>', clean_html, flags=re.IGNORECASE)
        clean_html = re.sub(r'</div>', '</p>', clean_html, flags=re.IGNORECASE)
        
        # Limpiar etiquetas básicas
        clean_html = re.sub(r'<p[^>]*>', '<p style="margin:0 0 10px 0;line-height:1.6;">', clean_html, flags=re.IGNORECASE)
        clean_html = re.sub(r'<b[^>]*>', '<strong>', clean_html, flags=re.IGNORECASE)
        clean_html = re.sub(r'</b>', '</strong>', clean_html, flags=re.IGNORECASE)
        clean_html = re.sub(r'<br[^>]*>', '<br>', clean_html, flags=re.IGNORECASE)
        
        # Eliminar otros elementos multimedia problemáticos
        clean_html = re.sub(r'<video[^>]*>.*?</video>', '', clean_html, flags=re.IGNORECASE | re.DOTALL)
        clean_html = re.sub(r'<audio[^>]*>.*?</audio>', '', clean_html, flags=re.IGNORECASE | re.DOTALL)
        clean_html = re.sub(r'<iframe[^>]*>.*?</iframe>', '', clean_html, flags=re.IGNORECASE | re.DOTALL)
        
        # Eliminar párrafos vacíos
        clean_html = re.sub(r'<p[^>]*>\s*</p>', '', clean_html, flags=re.IGNORECASE)
        clean_html = re.sub(r'<p[^>]*>\s*<br>\s*</p>', '', clean_html, flags=re.IGNORECASE)
        clean_html = re.sub(r'(<br>\s*){3,}', '<br><br>', clean_html, flags=re.IGNORECASE)
        
        # ESTRATEGIA SIMPLE: TEXTO HASTA PRIMERA IMAGEN + PRIMERA IMAGEN + "VER MÁS"
        
        # Buscar la primera imagen
        first_img_match = re.search(r'<img[^>]*>', clean_html, flags=re.IGNORECASE)
        
        if first_img_match:
            # Dividir en: [texto antes de imagen] + [primera imagen] + [resto]
            text_before_img = clean_html[:first_img_match.start()]
            first_img_tag = first_img_match.group(0)
            
            # Extraer src de la primera imagen
            src_match = re.search(r'src=["\']([^"\']+)["\']', first_img_tag)
            if src_match:
                first_img_src = src_match.group(1)
                
                # Crear HTML optimizado para email
                first_img_html = f'<img src="{first_img_src}" style="max-width:100%;height:auto;display:block;margin:15px 0;border-radius:8px;">'
                
                # Limpiar texto antes de la imagen
                text_content = re.sub(r'<[^>]+>', '', text_before_img)
                text_content = re.sub(r'\s+', ' ', text_content).strip()
                
                # Construir resultado final
                if len(text_content) > max_chars - 50:  # Reservar espacio para "Ver más"
                    # Truncar texto inteligentemente
                    truncate_point = max_chars - 50
                    
                    # Buscar punto de corte natural
                    cut_positions = [
                        text_content.rfind('.', 0, truncate_point),
                        text_content.rfind(',', 0, truncate_point),
                        text_content.rfind(' ', 0, truncate_point - 20)
                    ]
                    
                    best_cut = max([pos for pos in cut_positions if pos > truncate_point * 0.7])
                    if best_cut > 0:
                        truncate_point = best_cut
                    
                    text_content = text_content[:truncate_point].strip()
                
                # Generar HTML final: [Texto] + [Imagen] (sin mensaje redundante)
                final_html = f'''
                <p style="margin:0 0 15px 0;line-height:1.6;color:#555;font-size:16px;">
                    {text_content}
                </p>
                {first_img_html}
                '''
                
                return final_html.strip()
        
        # Si no hay imágenes, solo devolver texto truncado
        text_content = re.sub(r'<[^>]+>', '', clean_html)
        text_content = re.sub(r'\s+', ' ', text_content).strip()
        
        if len(text_content) > max_chars:
            truncate_point = max_chars - 3
            
            cut_positions = [
                text_content.rfind('.', 0, truncate_point),
                text_content.rfind(',', 0, truncate_point),
                text_content.rfind(' ', 0, truncate_point - 20)
            ]
            
            best_cut = max([pos for pos in cut_positions if pos > truncate_point * 0.7])
            if best_cut > 0:
                truncate_point = best_cut
            
            text_content = text_content[:truncate_point].strip() + "..."
        
        return f'<p style="margin:0 0 15px 0;line-height:1.6;color:#555;font-size:16px;">{text_content}</p>'
    
    def create_post_notification_email(self, post_data: dict, category_name: str) -> str:
        """
        Crea el HTML del correo para notificación de nuevo post.
        """
        # Limpiar y truncar contenido
        content_preview = self.clean_html_content(post_data.get('contenido', ''), 500)
        
        # URL del post
        post_url = f"{self.frontend_base_url}/dashboard/bienestar/posts/{post_data['id']}"
        
        # Template HTML del correo optimizado para 600px y compatibilidad con clientes de email
        html_template = f"""
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml" lang="es">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nuevo Post: {post_data['titulo']}</title>
            <!--[if mso]>
            <noscript>
                <xml>
                    <o:OfficeDocumentSettings>
                        <o:AllowPNG/>
                        <o:PixelsPerInch>96</o:PixelsPerInch>
                    </o:OfficeDocumentSettings>
                </xml>
            </noscript>
            <![endif]-->
        </head>
        <body style="margin:0;padding:0;background-color:#f8f9fa;font-family:Arial,sans-serif;">
            <!-- Wrapper table para centrar el contenido -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;background-color:#f8f9fa;">
                <tr>
                    <td align="center" valign="top" style="padding:20px 0;">
                        <!-- Contenedor principal de 600px -->
                        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                            <!-- Header con imagen -->
                            <tr>
                                <td style="padding:0;text-align:center">
                                    <img src="https://redkossodo.s3.us-east-2.amazonaws.com/extras/headmail.png" 
                                         alt="Header Kossodo" 
                                         style="width:100%;max-width:600px;height:auto;display:block;margin:0;">
                                </td>
                            </tr>
                            
                            <!-- Imagen del post (si existe) -->
                            {f'''
                            <tr>
                                <td style="padding:20px 40px;text-align:center;">
                                    <img src="{post_data['imagen_url']}" alt="{post_data['titulo']}" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);display:block;margin:0 auto;">
                                </td>
                            </tr>
                            ''' if post_data.get('imagen_url') else ''}
                            
                            <!-- Título del post -->
                            <tr>
                                <td style="padding:20px 40px 15px 40px;">
                                    <h2 style="margin:0;color:#2e3954;font-size:24px;font-weight:bold;line-height:1.3;font-family:Arial,sans-serif;">
                                        {post_data['titulo']}
                                    </h2>
                                </td>
                            </tr>
                            
                            <!-- Meta información del post -->
                            <tr>
                                <td style="padding:0 40px 20px 40px;">
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td style="text-align:left;">
                                                <span style="color:#666;font-size:14px;font-weight:500;font-family:Arial,sans-serif;">
                                                    👤 Por {post_data['autor']}
                                                </span>
                                            </td>
                                            <td style="text-align:right;">
                                                <span style="background-color:#2e3954;color:white;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;font-family:Arial,sans-serif;">
                                                    {category_name}
                                                </span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Contenido del post -->
                            <tr>
                                <td style="padding:0 40px 25px 40px;">
                                    <div style="color:#555;font-size:16px;line-height:1.7;font-family:Arial,sans-serif;">
                                        {content_preview}
                                        <br><br>
                                        <em style="color:#2e3954;font-weight:500;">Ve el artículo completo haciendo clic en el botón de abajo ⬇️</em>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Botón para ver artículo completo -->
                            <tr>
                                <td style="padding:30px 40px;text-align:center;">
                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                                        <tr>
                                            <td style="background-color:#2e3954;border-radius:8px;text-align:center;">
                                                <a href="{post_url}" style="display:inline-block;padding:16px 32px;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;font-family:Arial,sans-serif;">
                                                    📖 Ver Artículo Completo
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="padding:20px 40px 30px 40px;border-top:1px solid #eee;text-align:center;">
                                    <div style="color:#888;font-size:12px;line-height:1.5;font-family:Arial,sans-serif;">
                                        <strong style="color:#666;">📧 Correo Automático</strong><br>
                                        Este es un correo automático del sistema de notificaciones de Grupo Kossodo.<br>
                                        <strong>No responder a este mensaje.</strong><br><br>
                                        Si no deseas recibir estas notificaciones, ponte en contacto con el administrador del sistema.
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        return html_template
    
    def send_post_notification(self, post_data: dict, category_name: str, recipient_emails: list = None) -> bool:
        """
        Envía notificación de nuevo post publicado a múltiples destinatarios.
        
        Args:
            post_data (dict): Datos del post
            category_name (str): Nombre de la categoría
            recipient_emails (list): Lista de emails destinatarios
            
        Returns:
            bool: True si se envió correctamente, False en caso contrario
        """
        # Destinatarios por defecto (PRODUCCIÓN)
        if recipient_emails is None:
            recipient_emails = ["personal@kossodo.com", "personal@kossomet.com"]
        
        try:
            # Crear contenido HTML una sola vez
            html_content = self.create_post_notification_email(post_data, category_name)
            
            # Conectar al servidor una sola vez
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.email_user, self.email_password)
            
            # Enviar a cada destinatario
            success_count = 0
            for recipient_email in recipient_emails:
                try:
                    # Crear mensaje individual para cada destinatario
                    msg = MIMEMultipart('alternative')
                    msg['Subject'] = f"📝 Nuevo Post: {post_data['titulo']}"
                    msg['From'] = self.email_user
                    msg['To'] = recipient_email
                    
                    # Agregar contenido HTML
                    html_part = MIMEText(html_content, 'html', 'utf-8')
                    msg.attach(html_part)
                    
                    # Enviar email individual
                    text = msg.as_string()
                    server.sendmail(self.email_user, recipient_email, text)
                    
                    print(f"✅ Correo enviado exitosamente a {recipient_email} para el post: {post_data['titulo']}")
                    success_count += 1
                    
                except Exception as individual_error:
                    print(f"❌ Error enviando correo a {recipient_email}: {str(individual_error)}")
            
            # Cerrar conexión
            server.quit()
            
            # Considerar exitoso si se envió al menos a un destinatario
            if success_count > 0:
                print(f"📧 Total enviados: {success_count}/{len(recipient_emails)} emails")
                return True
            else:
                print("❌ No se pudo enviar ningún email")
                return False
            
        except Exception as e:
            print(f"❌ Error general enviando correos: {str(e)}")
            return False

# Instancia global del servicio
email_service = EmailService() 