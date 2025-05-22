import requests
import os
import json
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Cargar variables de entorno desde .env si existe en la carpeta backend
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    print("Variables de entorno cargadas desde .env para test_solicitudes_endpoints")
else:
    print("Archivo .env no encontrado en backend/, usando variables de entorno del sistema si existen.")

# Configuración del servidor Flask
FLASK_BASE_URL = os.getenv('FLASK_RUN_HOST_URL', 'http://localhost:3001')
CREAR_SOLICITUD_URL = f'{FLASK_BASE_URL}/api/marketing/solicitud' # Endpoint de stock_handler.py
OBTENER_SOLICITUDES_URL = f'{FLASK_BASE_URL}/api/marketing/solicitudes'
CONFIRMAR_SOLICITUD_BASE_URL = f'{FLASK_BASE_URL}/api/marketing/solicitudes' # /<id>/confirm se añade luego

DEFAULT_HEADERS = {'Content-Type': 'application/json'}

# --- Funciones de Ayuda para Pruebas ---

def print_response(response):
    print(f"Status: {response.status_code}")
    try:
        print(f"Response JSON: {response.json()}")
    except requests.exceptions.JSONDecodeError:
        print(f"Response Text: {response.text}")
    print("--------------------------------------------------------")

def crear_solicitud_test_data():
    """Genera datos de prueba para crear una solicitud."""
    return {
        "solicitante": "Usuario de Prueba Script",
        "grupo": "kossodo", # o kossomet
        "ruc": "12345678901",
        "fechaVisita": (datetime.now() + timedelta(days=5)).strftime('%Y-%m-%d'),
        "cantidad_packs": 2,
        "productos": ["merch_lapicero_esco_nor", "merch_polo_kossodo_nor"], # Asegúrate que estos productos existan en tu BD de stock
        "catalogos": "Binder de prueba, Catálogo Esco"
    }

# --- Pruebas de Endpoints ---

def test_crear_solicitud(data):
    print(f"\nProbando CREAR solicitud: {CREAR_SOLICITUD_URL}")
    print(f"Payload: {json.dumps(data, indent=2)}")
    try:
        response = requests.post(CREAR_SOLICITUD_URL, json=data, headers=DEFAULT_HEADERS)
        print_response(response)
        if response.status_code == 201:
            return response.json().get('id_solicitud')
    except requests.exceptions.RequestException as e:
        print(f"Error en la solicitud POST: {e}")
    return None

def test_obtener_solicitudes(params=None):
    print(f"\nProbando OBTENER solicitudes: {OBTENER_SOLICITUDES_URL}")
    if params:
        print(f"Con parámetros: {params}")
    try:
        response = requests.get(OBTENER_SOLICITUDES_URL, params=params)
        print_response(response)
    except requests.exceptions.RequestException as e:
        print(f"Error en la solicitud GET: {e}")

def test_confirmar_solicitud(solicitud_id, confirm_data):
    if not solicitud_id:
        print("\nCONFIRMAR solicitud omitido: No se proporcionó ID de solicitud (probablemente la creación falló).")
        return
    
    url = f"{CONFIRMAR_SOLICITUD_BASE_URL}/{solicitud_id}/confirm"
    print(f"\nProbando CONFIRMAR solicitud: {url}")
    print(f"Payload: {json.dumps(confirm_data, indent=2)}")
    try:
        response = requests.put(url, json=confirm_data, headers=DEFAULT_HEADERS)
        print_response(response)
    except requests.exceptions.RequestException as e:
        print(f"Error en la solicitud PUT: {e}")

if __name__ == "__main__":
    print("Iniciando pruebas de los endpoints de solicitudes de merchandising...")
    print("Asegúrate de que el servidor Flask esté corriendo y la base de datos configurada.")
    print(f"URL base: {FLASK_BASE_URL}")
    print("--------------------------------------------------------")

    # 1. Intentar crear una nueva solicitud para tener un ID para las otras pruebas
    solicitud_payload = crear_solicitud_test_data()
    nueva_solicitud_id = test_crear_solicitud(solicitud_payload)

    # 2. Obtener todas las solicitudes (debería incluir la recién creada si tuvo éxito)
    test_obtener_solicitudes()

    # 3. Obtener solicitudes filtrando por el ID de la recién creada (si se creó)
    if nueva_solicitud_id:
        test_obtener_solicitudes(params={'id': nueva_solicitud_id})
    
    # 4. Obtener solicitudes filtrando por estado 'pending'
    test_obtener_solicitudes(params={'status': 'pending'})

    # 5. Intentar confirmar la solicitud recién creada (si se creó)
    if nueva_solicitud_id:
        datos_confirmacion = {
            "confirmador": "Script de Prueba Automatizado",
            "observaciones": "Confirmación automática realizada por script de prueba.",
            "productos": {"merch_lapicero_esco_nor": 1, "merch_polo_kossodo_nor": 1} # Productos y cantidades finales
        }
        test_confirmar_solicitud(nueva_solicitud_id, datos_confirmacion)
        
        # 5.1. Obtener la solicitud confirmada por ID para verificar el cambio de estado
        test_obtener_solicitudes(params={'id': nueva_solicitud_id})
        
        # 5.2. Obtener solicitudes filtrando por estado 'confirmed'
        test_obtener_solicitudes(params={'status': 'confirmed'})

    else:
        print("\nNo se pudo obtener un ID de solicitud para las pruebas de confirmación y obtención por ID.")

    print("\nPruebas de endpoints de solicitudes finalizadas.")
    print("Verifica que las tablas 'inventario_solicitudes' e 'inventario_solicitudes_conf' existan y se hayan actualizado.") 