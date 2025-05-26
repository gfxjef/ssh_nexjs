#!/usr/bin/env python3
"""
Script para verificar AUTO_INCREMENT en la tabla documentos.
"""

import sys
import os

# Agregar el directorio backend al path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from db.mysql_connection import MySQLConnection

def check_auto_increment():
    """Verifica si la tabla documentos tiene AUTO_INCREMENT."""
    db = MySQLConnection()
    
    try:
        print("🔍 Verificando AUTO_INCREMENT en tabla documentos...")
        
        # Verificar información completa de la tabla
        table_info = db.execute_query("SHOW CREATE TABLE documentos")
        if table_info:
            create_statement = table_info[0]['Create Table']
            print("\n📋 CREATE TABLE statement:")
            print(create_statement)
            
            if 'AUTO_INCREMENT' in create_statement:
                print("\n✅ La tabla SÍ tiene AUTO_INCREMENT")
            else:
                print("\n❌ La tabla NO tiene AUTO_INCREMENT")
                print("🔧 Necesitamos agregar AUTO_INCREMENT")
                
                # Agregar AUTO_INCREMENT
                print("Agregando AUTO_INCREMENT a la columna id...")
                alter_query = "ALTER TABLE documentos MODIFY id INT AUTO_INCREMENT"
                db.execute_query(alter_query, fetch=False)
                print("✅ AUTO_INCREMENT agregado")
        
        # Verificar el último ID insertado
        last_docs = db.execute_query("SELECT id FROM documentos ORDER BY id DESC LIMIT 3")
        print(f"\n📄 Últimos IDs de documentos:")
        for doc in last_docs:
            print(f"  - ID: {doc['id']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Verificando AUTO_INCREMENT\n")
    success = check_auto_increment()
    
    if success:
        print("\n🎉 Verificación completada!")
    else:
        print("\n💥 Error en la verificación") 