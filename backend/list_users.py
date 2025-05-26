#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.mysql_connection import MySQLConnection

def list_users():
    """Listar usuarios existentes en la base de datos"""
    db_ops = MySQLConnection()
    
    try:
        # Obtener información de usuarios
        query = """
        SELECT id, usuario, correo, nombre, cargo, grupo, rango, pass
        FROM usuarios 
        ORDER BY id
        LIMIT 10
        """
        result = db_ops.execute_query(query)
        
        if result:
            print(f"=== USUARIOS EN LA BASE DE DATOS ===")
            print(f"Total encontrados: {len(result)}")
            print()
            
            for user in result:
                print(f"ID: {user['id']}")
                print(f"Usuario: {user['usuario']}")
                print(f"Correo: {user['correo']}")
                print(f"Nombre: {user['nombre']}")
                print(f"Cargo: {user['cargo']}")
                print(f"Grupo: {user['grupo']}")
                print(f"Rango: {user['rango']}")
                print(f"Password: {user['pass']}")
                print("-" * 50)
                
        else:
            print("❌ No se encontraron usuarios en la base de datos")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    list_users() 