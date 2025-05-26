#!/usr/bin/env python3

import requests
import json

def test_api_documents_endpoint():
    """Prueba el endpoint /api/documents específicamente."""
    
    try:
        print("🔍 Probando endpoint /api/documents...")
        response = requests.get("http://localhost:3001/api/bienestar/documentos/api/documents", timeout=60)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Documentos API obtenidos: {len(data.get('data', []))}")
            if data.get('data'):
                for doc in data['data'][:2]:  # Mostrar solo 2 primeros
                    print(f"  - ID: {doc.get('id')}, Título: {doc.get('titulo')}")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_api_documents_with_filters():
    """Prueba el endpoint con filtros simples."""
    
    try:
        print("\n🔍 Probando endpoint /api/documents con filtros...")
        response = requests.get("http://localhost:3001/api/bienestar/documentos/api/documents?limit=2", timeout=60)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Documentos con filtros obtenidos: {len(data.get('data', []))}")
            print(f"Paginación: {data.get('pagination', {})}")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_create_document():
    """Prueba crear un documento."""
    
    try:
        print("\n🔍 Probando creación de documento...")
        
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        
        doc_data = {
            "titulo": f"Documento de Prueba API {timestamp}",
            "descripcion": "Descripción de prueba para API",
            "categoria_id": 1,
            "etiquetas": [],
            "es_publico": True
        }
        
        response = requests.post(
            "http://localhost:3001/api/bienestar/documentos/api/documents",
            json=doc_data,
            timeout=60
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Documento creado: ID {data.get('data', {}).get('id')}")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Pruebas específicas del endpoint /api/documents\n")
    
    test_api_documents_endpoint()
    test_api_documents_with_filters()
    test_create_document()
    
    print("\n🎉 Pruebas terminadas!") 