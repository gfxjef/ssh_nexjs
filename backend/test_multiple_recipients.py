#!/usr/bin/env python3
"""
Script para probar el envío de emails a múltiples destinatarios.
"""

import os
import sys
from datetime import datetime

# Agregar el directorio padre al path para importar los módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configurar variables de entorno antes de importar
os.environ['EMAIL_USER'] = 'jcamacho@kossodo.com'
os.environ['EMAIL_PASSWORD'] = 'kfmklqrzzrengbhk'
os.environ['FRONTEND_BASE_URL'] = 'http://www.grupokossodo.com:5000'

try:
    # Importar el servicio de email
    from utils.email_service import EmailService
    
    # Datos de prueba simulando un post real
    test_post_data = {
        'id': 1,
        'titulo': 'PRUEBA: Envío a Múltiples Destinatarios',
        'autor': 'Sistema de Pruebas',
        'contenido': '''
        <p>Este es un email de prueba para verificar que el sistema puede enviar notificaciones a múltiples destinatarios simultáneamente.</p>
        
        <p><strong>Nuevos destinatarios configurados:</strong></p>
        <ul>
            <li>✉️ personal@kossodo.com</li>
            <li>✉️ personal@kossomet.com</li>
        </ul>
        
        <p>Esta funcionalidad asegura que ambos equipos reciban las notificaciones automáticamente cuando se publique un nuevo artículo.</p>
        
        <p>¡Sistema de notificaciones múltiples funcionando correctamente!</p>
        ''',
        'imagen_url': 'https://redkossodo.s3.us-east-2.amazonaws.com/posts/ejemplo_post.jpg',
        'categoria_id': 1
    }
    
    # Crear instancia del servicio
    email_service = EmailService()
    print("✅ [EMAIL] Servicio de email inicializado correctamente")
    
    # Mostrar destinatarios por defecto
    print("📧 [EMAIL] Destinatarios configurados por defecto:")
    print("   • personal@kossodo.com")
    print("   • personal@kossomet.com")
    
    # Enviar email de prueba a destinatarios por defecto
    print(f"\n📤 [EMAIL] Enviando email de prueba a múltiples destinatarios...")
    
    email_success = email_service.send_post_notification(
        post_data=test_post_data,
        category_name="Pruebas - Múltiples Destinatarios"
    )
    
    if email_success:
        print("\n🎉 [EMAIL] ¡Emails de prueba enviados exitosamente!")
        print("📬 [EMAIL] Revisa las bandejas de entrada de ambos destinatarios")
    else:
        print("\n❌ [EMAIL] Error al enviar emails de prueba")
        
    # Opcional: Probar con destinatarios personalizados
    print(f"\n🔧 [EMAIL] Probando con destinatario personalizado...")
    
    custom_recipients = ["jcamacho@kossodo.com"]  # Para probar que también funciona con lista personalizada
    
    custom_email_success = email_service.send_post_notification(
        post_data={
            **test_post_data,
            'titulo': 'PRUEBA: Destinatario Personalizado'
        },
        category_name="Pruebas - Destinatario Custom",
        recipient_emails=custom_recipients
    )
    
    if custom_email_success:
        print("✅ [EMAIL] Envío con destinatarios personalizados exitoso")
    else:
        print("❌ [EMAIL] Error en envío con destinatarios personalizados")
        
except ImportError as e:
    print(f"❌ [EMAIL] Error importando servicio de email: {e}")
except Exception as e:
    print(f"❌ [EMAIL] Error general: {e}") 