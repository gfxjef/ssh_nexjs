#!/usr/bin/env python3
"""
Script para agregar la columna 'grupo' a la tabla documentos existente.
"""

import sys
import os

# Agregar el directorio backend al path para importar módulos
backend_path = os.path.join(os.path.dirname(__file__), '..', '..')
sys.path.append(backend_path)

from db.mysql_connection import MySQLConnection

def migrate_add_grupo_column():
    """Agregar columna grupo a la tabla documentos."""
    
    db_ops = MySQLConnection()
    
    try:
        # Verificar si la columna ya existe
        check_column_query = """
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'documentos' 
        AND COLUMN_NAME = 'grupo'
        """
        
        existing_column = db_ops.execute_query(check_column_query)
        
        if existing_column:
            print("✅ La columna 'grupo' ya existe en la tabla documentos.")
            return True
        
        # Agregar la columna grupo
        alter_table_query = """
        ALTER TABLE documentos 
        ADD COLUMN grupo ENUM('kossodo', 'kossomet', 'grupo_kossodo') 
        DEFAULT 'grupo_kossodo' 
        AFTER estado
        """
        
        print("🔄 Agregando columna 'grupo' a la tabla documentos...")
        db_ops.execute_query(alter_table_query, fetch=False)
        
        print("✅ Columna 'grupo' agregada exitosamente.")
        
        # Actualizar registros existentes con valor por defecto
        update_existing_query = """
        UPDATE documentos 
        SET grupo = 'grupo_kossodo' 
        WHERE grupo IS NULL
        """
        
        print("🔄 Actualizando registros existentes...")
        result = db_ops.execute_query(update_existing_query, fetch=False)
        
        print("✅ Migración completada exitosamente.")
        return True
        
    except Exception as e:
        print(f"❌ Error durante la migración: {str(e)}")
        return False

if __name__ == "__main__":
    print("=== Migración: Agregar columna 'grupo' ===")
    success = migrate_add_grupo_column()
    
    if success:
        print("🎉 Migración completada con éxito.")
    else:
        print("💥 La migración falló.")
        sys.exit(1) 