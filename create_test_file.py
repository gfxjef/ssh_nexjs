#!/usr/bin/env python3
"""
Script para crear y subir un archivo de prueba real.
"""

import requests
import os
import json

def create_test_file():
    """Crea un archivo de prueba para subir."""
    test_content = """
    🧪 ARCHIVO DE PRUEBA PARA SISTEMA DE DESCARGA SEGURA
    
    Este es un archivo de prueba creado para verificar que el sistema
    de descarga segura funciona correctamente.
    
    Contenido:
    - Texto plano
    - Caracteres especiales: áéíóú ñ ¿¡
    - Emojis: 🔒 📄 ✅
    - Fecha de creación: {timestamp}
    
    Sistema: Gestión de Documentos - Módulo Bienestar
    """.format(timestamp="2025-05-24 20:45:00")
    
    filename = "archivo_prueba_descarga.txt"
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(test_content)
    
    print(f"📄 Archivo creado: {filename}")
    return filename

def upload_test_file():
    """Sube el archivo de prueba usando el endpoint de upload."""
    
    # Crear archivo de prueba
    filename = create_test_file()
    
    try:
        print("🔼 Subiendo archivo de prueba...")
        
        # Preparar datos del formulario
        files = {
            'file': (filename, open(filename, 'rb'), 'text/plain')
        }
        
        data = {
            'titulo': 'Archivo de Prueba para Descarga Segura',
            'descripcion': 'Archivo creado específicamente para probar el sistema de descarga segura',
            'categoria_id': '1',  # Asumiendo que existe categoría con ID 1
            'etiquetas': ''
        }
        
        response = requests.post(
            "http://localhost:3001/api/bienestar/documentos/upload",
            files=files,
            data=data,
            timeout=60
        )
        
        files['file'][1].close()  # Cerrar archivo
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                doc_data = result.get('data', {})
                print(f"✅ Archivo subido exitosamente:")
                print(f"  - ID: {doc_data.get('id')}")
                print(f"  - Título: {doc_data.get('titulo')}")
                print(f"  - Tamaño: {doc_data.get('tamaño')} bytes")
                
                # Eliminar archivo local
                os.remove(filename)
                print(f"  - Archivo local {filename} eliminado")
                
                return doc_data.get('id')
            else:
                print(f"❌ Error en respuesta: {result.get('error', 'Desconocido')}")
        else:
            print(f"❌ Error HTTP: {response.status_code}")
            try:
                error_data = response.json()
                print(f"  - Error: {error_data.get('error', 'Desconocido')}")
            except:
                print(f"  - Respuesta: {response.text[:200]}")
        
        # Limpiar archivo en caso de error
        if os.path.exists(filename):
            os.remove(filename)
        
        return None
        
    except Exception as e:
        print(f"❌ Error: {e}")
        
        # Limpiar archivo en caso de error
        if os.path.exists(filename):
            os.remove(filename)
        
        return None

if __name__ == "__main__":
    print("🧪 Creando archivo de prueba para sistema de descarga\n")
    
    document_id = upload_test_file()
    
    if document_id:
        print(f"\n🎉 Archivo listo para pruebas de descarga con ID: {document_id}")
    else:
        print("\n💥 Error al crear archivo de prueba") 