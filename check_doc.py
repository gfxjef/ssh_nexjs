from db.mysql_connection import MySQLConnection

try:
    db = MySQLConnection()
    doc = db.execute_query('SELECT id, titulo, nombre_archivo FROM documentos WHERE id = 33')
    
    if doc:
        print(f"Documento 33 encontrado:")
        print(f"  ID: {doc[0]['id']}")
        print(f"  Titulo: {doc[0]['titulo']}")  
        print(f"  Nombre archivo: '{doc[0]['nombre_archivo']}'")
    else:
        print("Documento 33 no encontrado")
        
    # Ver todos los documentos
    print("\nTodos los documentos:")
    docs = db.execute_query('SELECT id, titulo, nombre_archivo FROM documentos ORDER BY id DESC LIMIT 5')
    for d in docs:
        print(f"  ID {d['id']}: {d['titulo']} -> '{d['nombre_archivo']}'")
        
except Exception as e:
    print(f"Error: {e}") 