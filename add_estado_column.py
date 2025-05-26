#!/usr/bin/env python3
"""
Script para agregar la columna estado a la tabla documentos.
"""

import sys
import os

# Agregar el directorio backend al path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from db.mysql_connection import MySQLConnection

def add_estado_column():
    """Agrega la columna estado a la tabla documentos."""
    db = MySQLConnection()
    
    try:
        print("🔍 Verificando si la columna estado existe...")
        
        # Verificar si la columna estado ya existe
        structure = db.execute_query("DESCRIBE documentos")
        estado_exists = any(field['Field'] == 'estado' for field in structure)
        
        if estado_exists:
            print("✅ La columna 'estado' ya existe")
        else:
            print("🔧 Agregando columna 'estado' a la tabla documentos...")
            
            # Agregar la columna estado
            alter_query = """
            ALTER TABLE documentos 
            ADD COLUMN estado ENUM('activo', 'inactivo', 'archivado', 'eliminado') 
            DEFAULT 'activo' 
            AFTER es_publico
            """
            
            db.execute_query(alter_query, fetch=False)
            print("✅ Columna 'estado' agregada exitosamente")
        
        # Actualizar documentos existentes que no tengan estado
        print("🔄 Actualizando documentos existentes...")
        update_query = """
        UPDATE documentos 
        SET estado = 'activo' 
        WHERE estado IS NULL OR estado = ''
        """
        
        db.execute_query(update_query, fetch=False)
        print("✅ Documentos existentes actualizados")
        
        # Verificar el resultado
        print("\n📋 Nueva estructura de la tabla documentos:")
        new_structure = db.execute_query("DESCRIBE documentos")
        for field in new_structure:
            print(f"  - {field['Field']}: {field['Type']}")
        
        # Verificar documentos
        docs = db.execute_query("SELECT id, titulo, estado FROM documentos LIMIT 3")
        print(f"\n📄 Documentos con estado:")
        for doc in docs:
            print(f"  - ID: {doc['id']}, Título: {doc['titulo']}, Estado: {doc['estado']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Agregando columna estado a la tabla documentos\n")
    success = add_estado_column()
    
    if success:
        print("\n🎉 Migración completada exitosamente!")
    else:
        print("\n💥 Error en la migración") 