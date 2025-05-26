#!/usr/bin/env python3
"""
Migración de base de datos: Agregar columna 'grupo' a la tabla documentos
para clasificación por grupos empresariales.

Este script:
1. Agrega columna 'grupo' tipo ENUM('kossodo', 'kossomet', 'grupo_kossodo')
2. Establece valor por defecto 'grupo_kossodo'
3. Crea índice para optimización de consultas
4. Migra documentos existentes con el valor por defecto
"""

import sys
import os
import datetime

# Agregar el directorio padre al path para poder importar módulos
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
sys.path.insert(0, parent_dir)

from db.mysql_connection import MySQLConnection

# SQL para agregar la columna grupo
ADD_GRUPO_COLUMN = """
ALTER TABLE documentos 
ADD COLUMN grupo ENUM('kossodo', 'kossomet', 'grupo_kossodo') 
NOT NULL DEFAULT 'grupo_kossodo'
AFTER estado;
"""

# SQL para crear índice en la columna grupo
CREATE_GRUPO_INDEX = """
CREATE INDEX idx_documentos_grupo ON documentos(grupo);
"""

# SQL para verificar si la columna ya existe
CHECK_GRUPO_COLUMN = """
SELECT COUNT(*) as column_exists
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'documentos' 
AND COLUMN_NAME = 'grupo';
"""

# SQL para contar documentos existentes
COUNT_EXISTING_DOCUMENTS = """
SELECT COUNT(*) as total_documents FROM documentos;
"""

# SQL para verificar documentos con grupo asignado
CHECK_DOCUMENTS_WITH_GRUPO = """
SELECT COUNT(*) as documents_with_group FROM documentos WHERE grupo IS NOT NULL;
"""

def check_if_column_exists(db_connection):
    """
    Verifica si la columna 'grupo' ya existe en la tabla documentos.
    
    Args:
        db_connection: Instancia de MySQLConnection
        
    Returns:
        bool: True si la columna existe, False en caso contrario
    """
    try:
        result = db_connection.execute_query(CHECK_GRUPO_COLUMN)
        if result and len(result) > 0:
            return result[0]['column_exists'] > 0
        return False
    except Exception as e:
        print(f"❌ Error al verificar existencia de columna: {e}")
        return False

def add_grupo_column(db_connection):
    """
    Agrega la columna 'grupo' a la tabla documentos.
    
    Args:
        db_connection: Instancia de MySQLConnection
        
    Returns:
        bool: True si la operación fue exitosa, False en caso contrario
    """
    try:
        print("📝 Agregando columna 'grupo' a la tabla documentos...")
        result = db_connection.execute_query(ADD_GRUPO_COLUMN, fetch=False)
        
        if result is not None:
            print("✅ Columna 'grupo' agregada exitosamente")
            return True
        else:
            print("❌ Error al agregar la columna 'grupo'")
            return False
            
    except Exception as e:
        print(f"❌ Error al agregar columna 'grupo': {e}")
        return False

def create_grupo_index(db_connection):
    """
    Crea un índice en la columna 'grupo' para optimizar consultas.
    
    Args:
        db_connection: Instancia de MySQLConnection
        
    Returns:
        bool: True si la operación fue exitosa, False en caso contrario
    """
    try:
        print("📝 Creando índice en la columna 'grupo'...")
        result = db_connection.execute_query(CREATE_GRUPO_INDEX, fetch=False)
        
        if result is not None:
            print("✅ Índice 'idx_documentos_grupo' creado exitosamente")
            return True
        else:
            print("❌ Error al crear el índice")
            return False
            
    except Exception as e:
        # El índice puede ya existir, esto es normal
        if "Duplicate key name" in str(e):
            print("⚠️  El índice 'idx_documentos_grupo' ya existe")
            return True
        print(f"❌ Error al crear índice: {e}")
        return False

def verify_migration(db_connection):
    """
    Verifica que la migración fue exitosa.
    
    Args:
        db_connection: Instancia de MySQLConnection
        
    Returns:
        bool: True si la verificación fue exitosa, False en caso contrario
    """
    try:
        print("🔍 Verificando migración...")
        
        # Verificar que la columna existe
        if not check_if_column_exists(db_connection):
            print("❌ La columna 'grupo' no existe después de la migración")
            return False
        
        # Contar documentos totales
        total_docs = db_connection.execute_query(COUNT_EXISTING_DOCUMENTS)
        total_count = total_docs[0]['total_documents'] if total_docs else 0
        
        # Verificar documentos con grupo asignado
        docs_with_group = db_connection.execute_query(CHECK_DOCUMENTS_WITH_GRUPO)
        group_count = docs_with_group[0]['documents_with_group'] if docs_with_group else 0
        
        print(f"📊 Documentos totales: {total_count}")
        print(f"📊 Documentos con grupo asignado: {group_count}")
        
        if total_count == group_count:
            print("✅ Todos los documentos tienen un grupo asignado")
            return True
        else:
            print(f"⚠️  {total_count - group_count} documentos sin grupo asignado")
            return False
            
    except Exception as e:
        print(f"❌ Error durante la verificación: {e}")
        return False

def run_migration():
    """
    Ejecuta la migración completa para agregar la columna 'grupo'.
    
    Returns:
        bool: True si toda la migración fue exitosa, False en caso contrario
    """
    print("🚀 Iniciando migración: Agregar columna 'grupo' a tabla documentos")
    print(f"⏰ Fecha y hora: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    try:
        # Conectar a la base de datos
        db_connection = MySQLConnection()
        print("✅ Conexión a base de datos establecida")
        
        # Verificar si la columna ya existe
        if check_if_column_exists(db_connection):
            print("⚠️  La columna 'grupo' ya existe en la tabla documentos")
            print("🔍 Verificando integridad...")
            if verify_migration(db_connection):
                print("✅ La migración ya fue aplicada correctamente")
                return True
            else:
                print("⚠️  La columna existe pero hay problemas de integridad")
                return False
        
        # Paso 1: Agregar columna 'grupo'
        if not add_grupo_column(db_connection):
            return False
        
        # Paso 2: Crear índice
        if not create_grupo_index(db_connection):
            print("⚠️  El índice no se pudo crear, pero la migración puede continuar")
        
        # Paso 3: Verificar migración
        if not verify_migration(db_connection):
            print("❌ La verificación de migración falló")
            return False
        
        print("=" * 70)
        print("✅ Migración completada exitosamente")
        print("📋 Resumen:")
        print("   - ✅ Columna 'grupo' agregada con ENUM('kossodo', 'kossomet', 'grupo_kossodo')")
        print("   - ✅ Valor por defecto establecido: 'grupo_kossodo'")
        print("   - ✅ Índice 'idx_documentos_grupo' creado")
        print("   - ✅ Documentos existentes migrados con valor por defecto")
        
        return True
        
    except Exception as e:
        print(f"❌ Error durante la migración: {e}")
        return False

def rollback_migration():
    """
    Función para revertir la migración (eliminar columna y índice).
    USAR CON CUIDADO - Esto eliminarán datos permanentemente.
    
    Returns:
        bool: True si el rollback fue exitoso, False en caso contrario
    """
    print("⚠️  ATENCIÓN: Iniciando rollback de migración")
    print("⚠️  Esto eliminará la columna 'grupo' y todos sus datos")
    
    confirmation = input("¿Está seguro que desea continuar? (escriba 'SI' para confirmar): ")
    if confirmation != 'SI':
        print("❌ Rollback cancelado")
        return False
    
    try:
        db_connection = MySQLConnection()
        
        # Eliminar índice primero
        try:
            db_connection.execute_query("DROP INDEX idx_documentos_grupo ON documentos", fetch=False)
            print("✅ Índice eliminado")
        except Exception as e:
            print(f"⚠️  Error al eliminar índice (puede no existir): {e}")
        
        # Eliminar columna
        result = db_connection.execute_query("ALTER TABLE documentos DROP COLUMN grupo", fetch=False)
        if result is not None:
            print("✅ Columna 'grupo' eliminada exitosamente")
            return True
        else:
            print("❌ Error al eliminar la columna")
            return False
            
    except Exception as e:
        print(f"❌ Error durante rollback: {e}")
        return False

if __name__ == "__main__":
    print("🗃️  Migración de Base de Datos - Sistema de Grupos Empresariales")
    print("=" * 70)
    
    if len(sys.argv) > 1 and sys.argv[1] == "--rollback":
        success = rollback_migration()
    else:
        success = run_migration()
    
    if success:
        print("\n🎉 Operación completada exitosamente")
        sys.exit(0)
    else:
        print("\n💥 Operación falló")
        sys.exit(1) 