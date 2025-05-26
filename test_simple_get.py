#!/usr/bin/env python3

import requests
import json

def test_basic_connectivity():
    """Prueba conectividad básica."""
    
    # Probar endpoint más simple primero
    try:
        print("🔍 Probando conectividad básica...")
        response = requests.get("http://localhost:3001/api/bienestar/documentos/categorias", timeout=15)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Categorías obtenidas: {len(data.get('data', []))}")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_simple_documents():
    """Prueba obtener documentos con query simplificada."""
    
    try:
        print("\n🔍 Probando documentos con query simple...")
        # Usar el endpoint más simple de documentos
        response = requests.get("http://localhost:3001/api/bienestar/documentos/", timeout=15)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Documentos obtenidos: {len(data.get('data', []))}")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Pruebas de conectividad básica\n")
    
    basic_ok = test_basic_connectivity()
    if basic_ok:
        test_simple_documents()
    
    print("\n🎉 Pruebas terminadas!") 