"""
Script para inicializar la base de datos de bienestar.
Ejecutar este script antes de realizar pruebas para asegurar que la base de datos esté correctamente configurada.
"""
from .setup import setup_database, seed_initial_data

def main():
    """
    Función principal que inicializa la base de datos.
    """
    print("Inicializando base de datos para el módulo de bienestar...")
    
    # Crear tablas
    setup_result = setup_database()
    if not setup_result:
        print("Error al crear las tablas. Verifique la conexión a la base de datos.")
        return False
    
    # Cargar datos iniciales
    seed_result = seed_initial_data()
    if not seed_result:
        print("Error al cargar los datos iniciales.")
        return False
    
    print("Base de datos inicializada correctamente.")
    return True

if __name__ == "__main__":
    main() 