"""
Script para verificar si el servidor Flask de bienestar está en funcionamiento.
"""
import requests
import sys

def check_server():
    """
    Verifica si el servidor Flask está respondiendo en localhost:5000.
    
    Returns:
        bool: True si el servidor está disponible, False en caso contrario
    """
    try:
        response = requests.get("http://localhost:5000/")
        if response.status_code == 200:
            print("[OK] El servidor está funcionando correctamente")
            print(f"Respuesta: {response.json()}")
            return True
        else:
            print(f"[ERROR] El servidor está respondiendo, pero con código {response.status_code}")
            print(f"Respuesta: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("[ERROR] No se puede conectar al servidor. ¿Está ejecutándose en localhost:5000?")
        return False
    except Exception as e:
        print(f"[ERROR] Error al verificar el servidor: {e}")
        return False

def main():
    """Función principal"""
    print("Verificando conexión con el servidor Flask...")
    
    if check_server():
        # Verificar también el endpoint de bienestar
        try:
            response = requests.get("http://localhost:5000/api/bienestar/categories")
            if response.status_code == 200:
                print("[OK] El módulo de bienestar está funcionando correctamente")
                categories = response.json().get('data', [])
                print(f"Se encontraron {len(categories)} categorías en la base de datos")
                return True
            else:
                print(f"[ERROR] Error en el endpoint de bienestar: Código {response.status_code}")
                print(f"Respuesta: {response.text}")
                return False
        except Exception as e:
            print(f"[ERROR] Error al verificar el módulo de bienestar: {e}")
            return False
    
    return False

if __name__ == "__main__":
    result = main()
    sys.exit(0 if result else 1) 