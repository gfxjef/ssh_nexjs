#!/usr/bin/env python3
"""
Prueba directa de INSERT para documentos.
"""

import sys
import os

# Agregar el directorio backend al path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from db.mysql_connection import MySQLConnection
from db.bienestar.documentos.queries import INSERT_DOCUMENT

def test_direct_insert():
    """Prueba INSERT directo de documento."""
    db = MySQLConnection()
    
    try:
        print("🔍 Probando INSERT directo de documento...")
        
        # Parámetros de prueba
        params = (
            'Documento de Prueba Directo',  # titulo
            'Descripción de prueba',        # descripcion
            'test.txt',                     # nombre_archivo
            '',                             # ruta_archivo
            0,                              # tamaño_archivo
            'text/plain',                   # tipo_mime
            1,                              # categoria_id
            149,                            # subido_por
            True,                           # es_publico
            'activo'                        # estado
        )
        
        print(f"Query: {INSERT_DOCUMENT}")
        print(f"Parámetros ({len(params)}): {params}")
        
        # Ejecutar INSERT
        result = db.execute_query(INSERT_DOCUMENT, params, fetch=False)
        print(f"Resultado del INSERT: {result}")
        
        # Obtener el ID del documento insertado
        last_id_result = db.execute_query("SELECT LAST_INSERT_ID() as id")
        last_id = last_id_result[0]['id'] if last_id_result else None
        print(f"ID del nuevo documento: {last_id}")
        
        if last_id:
            # Verificar que se insertó correctamente
            verify_result = db.execute_query("SELECT * FROM documentos WHERE id = %s", (last_id,))
            if verify_result:
                doc = verify_result[0]
                print(f"✅ Documento insertado exitosamente:")
                print(f"   - ID: {doc['id']}")
                print(f"   - Título: {doc['titulo']}")
                print(f"   - Estado: {doc['estado']}")
                return True
            else:
                print("❌ No se encontró el documento insertado")
                return False
        else:
            print("❌ No se obtuvo ID del documento insertado")
            return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Prueba directa de INSERT de documento\n")
    success = test_direct_insert()
    
    if success:
        print("\n🎉 Prueba exitosa!")
    else:
        print("\n💥 Prueba falló") 