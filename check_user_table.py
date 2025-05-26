#!/usr/bin/env python3
"""
Script para verificar la tabla de usuarios y crear usuario de prueba.
"""

import sys
import os

# Agregar el directorio backend al path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from db.mysql_connection import MySQLConnection

def check_and_create_user():
    """Verifica la tabla de usuarios y crea un usuario de prueba."""
    db = MySQLConnection()
    
    try:
        print("🔍 Verificando tabla de usuarios...")
        
        # Verificar estructura de la tabla usuarios
        structure = db.execute_query("DESCRIBE usuarios")
        print("📋 Estructura de la tabla usuarios:")
        for field in structure:
            print(f"  - {field['Field']}: {field['Type']}")
        
        # Verificar si existe el usuario admin
        admin_user = db.execute_query("SELECT id FROM usuarios WHERE usuario = 'admin'")
        
        if not admin_user:
            print("🔧 Creando usuario admin...")
            
            insert_admin = """
            INSERT INTO usuarios (usuario, pass, nombre, correo, cargo, grupo, rango) 
            VALUES ('admin', 'admin!1', 'Administrador', 'admin@sistema.com', 'Administrador', 'Administradores', 'Admin')
            """
            
            db.execute_query(insert_admin, fetch=False)
            print("✅ Usuario admin creado")
        else:
            print("✅ Usuario admin existe")
        
        # Mostrar usuarios existentes
        users = db.execute_query("SELECT id, usuario, nombre, correo FROM usuarios LIMIT 5")
        print(f"\n👥 Usuarios en la base de datos:")
        for user in users:
            print(f"  ID: {user['id']}, Usuario: {user['usuario']}, Nombre: {user['nombre']}")
        
        # Obtener el ID del usuario admin para usar en los documentos
        admin_data = db.execute_query("SELECT id FROM usuarios WHERE usuario = 'admin'")
        if admin_data:
            admin_id = admin_data[0]['id']
            print(f"\n🎯 ID del usuario admin: {admin_id}")
            return admin_id
        
        return None
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    print("🧪 Verificando y configurando usuarios del sistema\n")
    admin_id = check_and_create_user()
    
    if admin_id:
        print(f"\n🎉 Configuración completada! ID del admin: {admin_id}")
    else:
        print("\n💥 Error en la configuración") 