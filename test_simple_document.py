#!/usr/bin/env python3
"""
Script simple para probar la creación de documentos.
"""

import requests
import json

# Configuración
BASE_URL = "http://localhost:3001/api/bienestar/documentos"
API_URL = f"{BASE_URL}/api/documents"

def test_create_document():
    """Prueba crear un documento simple."""
    print("🚀 Probando creación de documento...")
    
    new_document = {
        "titulo": "Documento de Prueba Simple",
        "descripcion": "Test básico de la API",
        "categoria_id": 1,
        "etiquetas": [1],
        "es_publico": True
    }
    
    try:
        response = requests.post(
            API_URL, 
            json=new_document,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Documento creado con ID: {data.get('data', {}).get('id')}")
            return data.get('data', {}).get('id')
        else:
            print("❌ Error al crear documento")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_get_documents():
    """Prueba obtener documentos."""
    print("\n🔍 Probando obtener documentos...")
    
    try:
        response = requests.get(API_URL, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            docs = data.get('data', [])
            print(f"✅ Encontrados {len(docs)} documentos")
            
            for doc in docs[:3]:  # Mostrar primeros 3
                print(f"  📄 {doc.get('id')}: {doc.get('titulo')} - {doc.get('estado')}")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🧪 Pruebas simples de API de documentos\n")
    
    # Probar obtener documentos
    test_get_documents()
    
    # Probar crear documento
    doc_id = test_create_document()
    
    # Obtener documentos de nuevo para ver el nuevo
    if doc_id:
        test_get_documents()
        
    print("\n🎉 Pruebas terminadas!") 