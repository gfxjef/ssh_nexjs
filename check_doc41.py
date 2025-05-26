#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.mysql_connection import MySQLConnection

def check_document_41():
    """Verificar información del documento ID 41"""
    db_ops = MySQLConnection()
    
    try:
        # Obtener información del documento 41
        query = """
        SELECT id, titulo, nombre_archivo, ruta_archivo, tipo_mime, 
               tamaño_archivo, estado, created_at
        FROM documentos 
        WHERE id = %s
        """
        result = db_ops.execute_query(query, (41,))
        
        if result:
            doc = result[0]
            print(f"=== DOCUMENTO ID 41 ===")
            print(f"ID: {doc['id']}")
            print(f"Título: {doc['titulo']}")
            print(f"Nombre archivo: {doc['nombre_archivo']}")
            print(f"Ruta archivo: {doc['ruta_archivo']}")
            print(f"Tipo MIME: {doc['tipo_mime']}")
            print(f"Tamaño: {doc['tamaño_archivo']} bytes")
            print(f"Estado: {doc['estado']}")
            print(f"Creado: {doc['created_at']}")
            
            # Verificar si el archivo físico existe
            ruta_completa = doc['ruta_archivo']
            nombre_fisico = os.path.basename(ruta_completa)
            archivo_path = os.path.join('uploads', 'documentos', nombre_fisico)
            
            print(f"\n=== VERIFICACIÓN FÍSICA ===")
            print(f"Ruta calculada: {archivo_path}")
            print(f"¿Existe archivo?: {os.path.exists(archivo_path)}")
            
            if os.path.exists(archivo_path):
                tamaño_real = os.path.getsize(archivo_path)
                print(f"Tamaño real: {tamaño_real} bytes")
                print(f"¿Coincide tamaño?: {tamaño_real == doc['tamaño_archivo']}")
            
        else:
            print("❌ Documento ID 41 no encontrado en la base de datos")
            
    except Exception as e:
        print(f"❌ Error al verificar documento: {e}")

if __name__ == "__main__":
    check_document_41() 