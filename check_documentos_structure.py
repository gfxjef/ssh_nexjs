#!/usr/bin/env python3
"""
Script para verificar la estructura de la tabla documentos.
"""

import sys
import os

# Agregar el directorio backend al path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from db.mysql_connection import MySQLConnection

def check_documentos_structure():
    """Verifica la estructura de la tabla documentos."""
    db = MySQLConnection()
    
    try:
        print("🔍 Verificando estructura de la tabla documentos...")
        
        # Verificar estructura de la tabla documentos
        structure = db.execute_query("DESCRIBE documentos")
        print("\n📋 Estructura de la tabla documentos:")
        for field in structure:
            print(f"  - {field['Field']}: {field['Type']} (Default: {field['Default']})")
        
        # Verificar algunos documentos de ejemplo
        docs = db.execute_query("SELECT * FROM documentos LIMIT 2")
        print(f"\n📄 Documentos de ejemplo ({len(docs) if docs else 0} encontrados):")
        if docs:
            for doc in docs:
                print(f"  - ID: {doc.get('id')}, Título: {doc.get('titulo')}")
                print(f"    Categoria: {doc.get('categoria_id')}, Público: {doc.get('es_publico')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Verificando estructura de la tabla documentos\n")
    success = check_documentos_structure()
    
    if success:
        print("\n🎉 Verificación completada!")
    else:
        print("\n💥 Error en la verificación") 