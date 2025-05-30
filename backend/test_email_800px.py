#!/usr/bin/env python3
"""
Script para probar el nuevo template de email de 800px de ancho.
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
        'titulo': 'PRUEBA: Nuevo Template de Email Optimizado - 800px',
        'autor': 'Sistema de Pruebas',
        'contenido': '''
        <p>Este es un artículo de prueba para verificar que el nuevo template de email funciona correctamente 
        con un ancho de 800px y es completamente compatible con todos los sistemas de correo.</p>
        
        <p>El nuevo template incluye las siguientes mejoras:</p>
        <ul>
            <li>✅ Ancho fijo de 800px para mejor compatibilidad</li>
            <li>✅ Estructura de tabla HTML para clientes de email</li>
            <li>✅ DOCTYPE XHTML para máxima compatibilidad</li>
            <li>✅ Eliminación de CSS moderno que no es compatible</li>
            <li>✅ Uso de estilos inline para garantizar renderizado</li>
            <li>✅ Compatibilidad con Outlook y otros clientes</li>
        </ul>
        
        <p>Este template está diseñado para funcionar perfectamente en Gmail, Outlook, Apple Mail, 
        y la mayoría de clientes de correo electrónico modernos y antiguos.</p>
        
        <p>El contenido se trunca automáticamente a 500 caracteres para mantener el email conciso 
        y dirigir a los usuarios al sitio web para leer el artículo completo.</p>
        ''',
        'imagen_url': 'https://via.placeholder.com/600x300/2e3954/ffffff?text=Imagen+de+Prueba'
    }
    
    # Nombre de categoría de prueba
    test_category_name = 'PRUEBAS DEL SISTEMA'
    
    print("🧪 INICIANDO PRUEBA DEL NUEVO TEMPLATE DE EMAIL")
    print("=" * 60)
    print(f"📧 Destinatario: jcamacho@kossodo.com")
    print(f"📝 Post de prueba: {test_post_data['titulo']}")
    print(f"🏷️ Categoría: {test_category_name}")
    print(f"📐 Ancho del template: 800px")
    print("=" * 60)
    
    # Crear instancia del servicio de email
    email_service = EmailService()
    print("✅ Servicio de email importado correctamente")
    
    # Enviar email de prueba
    print("\n📤 Enviando email de prueba...")
    success = email_service.send_post_notification(
        post_data=test_post_data,
        category_name=test_category_name,
        recipient_email='jcamacho@kossodo.com'
    )
    
    if success:
        print("✅ ¡EMAIL ENVIADO EXITOSAMENTE!")
        print("\n📋 DETALLES DEL TEMPLATE:")
        print("   • Ancho: 800px máximo")
        print("   • Estructura: Tabla HTML (compatible con todos los clientes)")
        print("   • DOCTYPE: XHTML 1.0 Transitional")
        print("   • Estilos: Inline para máxima compatibilidad")
        print("   • Fuente: Arial (universalmente soportada)")
        print("   • Compatibilidad: Outlook, Gmail, Apple Mail, etc.")
        print("\n🔍 Por favor, revisa tu bandeja de entrada para verificar")
        print("   que el email se vea correctamente con el nuevo template.")
        
    else:
        print("❌ Error al enviar el email")
        print("Verifica las credenciales y la configuración")
        
except ImportError as e:
    print(f"❌ Error al importar módulos: {e}")
    print("Asegúrate de estar en el directorio correcto")
    
except Exception as e:
    print(f"❌ Error inesperado: {e}")
    print("Revisa las credenciales de email y la configuración")

print(f"\n⏰ Prueba completada: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")