#!/usr/bin/env python3
"""
Script de migración para crear las tablas del sistema de catálogos
Ejecuta el archivo SQL de migración
"""

import os
import sys
import logging
from pathlib import Path

# Agregar el directorio backend al path
backend_dir = Path(__file__).parent.parent.parent
sys.path.append(str(backend_dir))

from mysql_connection import MySQLConnection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_migration():
    """Ejecuta la migración de base de datos"""
    try:
        # Ruta al archivo SQL
        sql_file = Path(__file__).parent / "create_catalogos_tables.sql"
        
        if not sql_file.exists():
            logger.error(f"❌ Archivo SQL no encontrado: {sql_file}")
            return False
        
        # Leer archivo SQL
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        logger.info("📊 Iniciando migración de base de datos...")
        
        # Conectar a la base de datos
        db = MySQLConnection()
        
        # Dividir el contenido en statements individuales
        # Separar por punto y coma, pero ignorar los que están dentro de procedimientos
        statements = []
        current_statement = ""
        in_procedure = False
        
        for line in sql_content.split('\n'):
            line = line.strip()
            
            # Detectar inicio de procedimiento
            if line.upper().startswith('DELIMITER'):
                in_procedure = True
                current_statement += line + '\n'
                continue
            
            # Detectar fin de procedimiento
            if in_procedure and line == 'DELIMITER ;':
                in_procedure = False
                current_statement += line + '\n'
                statements.append(current_statement.strip())
                current_statement = ""
                continue
            
            # Agregar línea al statement actual
            current_statement += line + '\n'
            
            # Si no estamos en un procedimiento y la línea termina con ;
            if not in_procedure and line.endswith(';') and not line.startswith('--'):
                statements.append(current_statement.strip())
                current_statement = ""
        
        # Agregar último statement si existe
        if current_statement.strip():
            statements.append(current_statement.strip())
        
        # Ejecutar cada statement
        success_count = 0
        error_count = 0
        
        for i, statement in enumerate(statements):
            if not statement or statement.startswith('--') or statement.startswith('/*'):
                continue
            
            try:
                logger.info(f"🔄 Ejecutando statement {i+1}/{len(statements)}")
                
                # Para procedimientos almacenados, usar execute_raw
                if 'DELIMITER' in statement or 'CREATE PROCEDURE' in statement.upper():
                    # Limpiar delimiters para MySQL
                    clean_statement = statement.replace('DELIMITER //', '').replace('DELIMITER ;', '').strip()
                    if clean_statement:
                        db.execute_raw(clean_statement)
                else:
                    db.execute_query(statement, fetch=False)
                
                success_count += 1
                
            except Exception as e:
                logger.error(f"❌ Error ejecutando statement {i+1}: {str(e)}")
                logger.debug(f"Statement problemático: {statement[:100]}...")
                error_count += 1
                
                # Si es un error crítico (tabla principal), fallar
                if 'catalogos' in statement and 'CREATE TABLE' in statement.upper():
                    logger.error("❌ Error crítico creando tabla principal")
                    return False
        
        logger.info(f"✅ Migración completada:")
        logger.info(f"   - Statements exitosos: {success_count}")
        logger.info(f"   - Statements con error: {error_count}")
        
        # Verificar que las tablas se crearon correctamente
        if verify_tables(db):
            logger.info("✅ Verificación de tablas exitosa")
            return True
        else:
            logger.error("❌ Error en verificación de tablas")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error ejecutando migración: {str(e)}", exc_info=True)
        return False


def verify_tables(db):
    """Verifica que las tablas se crearon correctamente"""
    try:
        required_tables = ['catalogos', 'catalogos_docs', 'catalogos_accesos']
        
        for table in required_tables:
            query = f"SHOW TABLES LIKE '{table}'"
            result = db.execute_query(query)
            
            if not result:
                logger.error(f"❌ Tabla '{table}' no encontrada")
                return False
            else:
                logger.info(f"✅ Tabla '{table}' creada correctamente")
        
        # Verificar vistas
        required_views = ['vista_catalogos_completos', 'vista_catalogos_paginas']
        
        for view in required_views:
            query = f"SHOW FULL TABLES WHERE Table_type = 'VIEW' AND Tables_in_database LIKE '{view}'"
            result = db.execute_query(query)
            
            if not result:
                logger.warning(f"⚠️ Vista '{view}' no encontrada")
            else:
                logger.info(f"✅ Vista '{view}' creada correctamente")
        
        # Verificar procedimientos
        required_procedures = ['GetCatalogoCompleto', 'LimpiarArchivosHuerfanos']
        
        for procedure in required_procedures:
            query = f"SHOW PROCEDURE STATUS WHERE Name = '{procedure}'"
            result = db.execute_query(query)
            
            if not result:
                logger.warning(f"⚠️ Procedimiento '{procedure}' no encontrado")
            else:
                logger.info(f"✅ Procedimiento '{procedure}' creado correctamente")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error verificando tablas: {str(e)}")
        return False


def rollback_migration():
    """Rollback de la migración (eliminar tablas)"""
    try:
        logger.warning("⚠️ Iniciando rollback de migración...")
        
        db = MySQLConnection()
        
        # Eliminar en orden inverso por las foreign keys
        tables_to_drop = [
            'catalogos_accesos',
            'catalogos_docs', 
            'catalogos'
        ]
        
        views_to_drop = [
            'vista_catalogos_completos',
            'vista_catalogos_paginas'
        ]
        
        procedures_to_drop = [
            'GetCatalogoCompleto',
            'LimpiarArchivosHuerfanos'
        ]
        
        # Eliminar vistas
        for view in views_to_drop:
            try:
                db.execute_query(f"DROP VIEW IF EXISTS {view}", fetch=False)
                logger.info(f"✅ Vista '{view}' eliminada")
            except Exception as e:
                logger.warning(f"⚠️ Error eliminando vista '{view}': {str(e)}")
        
        # Eliminar procedimientos
        for procedure in procedures_to_drop:
            try:
                db.execute_query(f"DROP PROCEDURE IF EXISTS {procedure}", fetch=False)
                logger.info(f"✅ Procedimiento '{procedure}' eliminado")
            except Exception as e:
                logger.warning(f"⚠️ Error eliminando procedimiento '{procedure}': {str(e)}")
        
        # Eliminar tablas
        for table in tables_to_drop:
            try:
                db.execute_query(f"DROP TABLE IF EXISTS {table}", fetch=False)
                logger.info(f"✅ Tabla '{table}' eliminada")
            except Exception as e:
                logger.warning(f"⚠️ Error eliminando tabla '{table}': {str(e)}")
        
        logger.info("✅ Rollback completado")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error en rollback: {str(e)}")
        return False


def main():
    """Función principal"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Migración de base de datos para sistema de catálogos')
    parser.add_argument('--rollback', action='store_true', help='Ejecutar rollback (eliminar tablas)')
    parser.add_argument('--verify', action='store_true', help='Solo verificar tablas existentes')
    
    args = parser.parse_args()
    
    if args.rollback:
        success = rollback_migration()
    elif args.verify:
        db = MySQLConnection()
        success = verify_tables(db)
    else:
        success = run_migration()
    
    if success:
        logger.info("🎉 Operación completada exitosamente")
        sys.exit(0)
    else:
        logger.error("💥 Operación falló")
        sys.exit(1)


if __name__ == "__main__":
    main() 