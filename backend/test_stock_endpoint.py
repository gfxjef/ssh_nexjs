import requests
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde .env si existe en la carpeta backend
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    print("Variables de entorno cargadas desde .env")
else:
    print("Archivo .env no encontrado, usando variables de entorno del sistema si existen.")

# Configuración del servidor Flask (ajusta si es diferente)
FLASK_BASE_URL = os.getenv('FLASK_RUN_HOST_URL', 'http://localhost:3001')
STOCK_ENDPOINT_URL = f'{FLASK_BASE_URL}/api/marketing/stock'


def test_stock_endpoint(grupo):
    """Prueba el endpoint de stock para un grupo específico."""
    print(f"\nProbando endpoint para el grupo: {grupo}...")
    try:
        response = requests.get(STOCK_ENDPOINT_URL, params={'grupo': grupo})
        response.raise_for_status()  # Lanza una excepción para códigos de error HTTP (4xx o 5xx)
        
        print(f"Estado de la respuesta: {response.status_code}")
        try:
            stock_data = response.json()
            print("Datos de stock recibidos:")
            for producto, cantidad in stock_data.items():
                print(f"  {producto}: {cantidad}")
            if not stock_data:
                print("  (No se devolvió stock o el stock está vacío)")
        except requests.exceptions.JSONDecodeError:
            print("Error: La respuesta no es un JSON válido.")
            print(f"Contenido de la respuesta: {response.text}")
            
    except requests.exceptions.HTTPError as http_err:
        print(f"Error HTTP: {http_err}")
        print(f"Respuesta del servidor: {response.text}")
    except requests.exceptions.ConnectionError as conn_err:
        print(f"Error de conexión: {conn_err}")
        print(f"Asegúrate de que el servidor Flask esté corriendo en {FLASK_BASE_URL}")
    except requests.exceptions.RequestException as req_err:
        print(f"Error en la solicitud: {req_err}")

if __name__ == "__main__":
    print("Iniciando pruebas del endpoint de stock de merchandising...")
    print("--------------------------------------------------------")
    print(f"URL del endpoint: {STOCK_ENDPOINT_URL}")
    
    # Aquí puedes definir qué grupos probar
    grupos_a_probar = ['kossodo', 'kossomet', 'otro_grupo_invalido']
    
    for g in grupos_a_probar:
        test_stock_endpoint(g)
        print("--------------------------------------------------------")

    print("\nPruebas finalizadas.")
    print("Recuerda tener el servidor Flask corriendo y la base de datos configurada.")
    print("Verifica que las tablas 'inventario_merch_kossodo', 'inventario_merch_kossomet' y (opcionalmente) 'inventario_solicitudes_conf' existan y tengan datos.") 