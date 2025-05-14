"""
Script de demostración para la API de bienestar.
Este script inicia el servidor Flask, configura la base de datos y realiza algunas operaciones de ejemplo.
"""
import time
import threading
import subprocess
import requests
import sys
import json
import os

# Colores para la salida en consola
class Colors:
    OK = '\033[92m'
    ERROR = '\033[91m'
    WARNING = '\033[93m'
    INFO = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

BASE_URL = "http://localhost:5000/api/bienestar"
SERVER_PROCESS = None

def print_header(text):
    """Imprime un encabezado formateado"""
    print("\n" + "=" * 80)
    print(f"{Colors.BOLD}{Colors.INFO}{text}{Colors.END}")
    print("=" * 80)

def print_result(operation, data):
    """Imprime el resultado de una operación API"""
    print(f"\n{Colors.BOLD}▶ {operation}{Colors.END}")
    print(json.dumps(data, indent=2, ensure_ascii=False))
    print("-" * 40)

def wait_for_server():
    """Espera a que el servidor esté disponible"""
    print(f"{Colors.INFO}Esperando a que el servidor esté disponible...{Colors.END}")
    max_attempts = 20
    for attempt in range(max_attempts):
        try:
            response = requests.get("http://localhost:5000/")
            if response.status_code == 200:
                print(f"{Colors.OK}✓ Servidor disponible{Colors.END}")
                return True
        except requests.exceptions.ConnectionError:
            pass
        
        time.sleep(0.5)
        sys.stdout.write(".")
        sys.stdout.flush()
    
    print(f"\n{Colors.ERROR}✗ El servidor no está disponible después de {max_attempts} intentos{Colors.END}")
    return False

def start_server():
    """Inicia el servidor Flask en un proceso separado"""
    global SERVER_PROCESS
    
    print_header("INICIANDO SERVIDOR FLASK")
    
    # Cambiamos al directorio raíz del proyecto
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(script_dir, "../../.."))
    os.chdir(root_dir)
    
    # Construimos el comando para iniciar el servidor
    command = [sys.executable, "-m", "backend.db.bienestar.app"]
    
    # Iniciamos el servidor en un proceso separado
    try:
        SERVER_PROCESS = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Esperamos a que el servidor esté disponible
        if wait_for_server():
            return True
        else:
            stop_server()
            return False
    except Exception as e:
        print(f"{Colors.ERROR}Error al iniciar el servidor: {e}{Colors.END}")
        return False

def stop_server():
    """Detiene el servidor Flask"""
    global SERVER_PROCESS
    
    if SERVER_PROCESS:
        print(f"{Colors.INFO}Deteniendo el servidor...{Colors.END}")
        SERVER_PROCESS.terminate()
        SERVER_PROCESS = None

def demo_categories():
    """Demuestra las operaciones CRUD para categorías"""
    print_header("DEMOSTRACIÓN DE API DE CATEGORÍAS")
    
    try:
        # Obtener todas las categorías
        response = requests.get(f"{BASE_URL}/categories")
        categories = response.json()
        print_result("Obtener todas las categorías", categories)
        
        # Crear una nueva categoría
        new_category = {
            "nombre": f"Demo Categoría {int(time.time())}",
            "color": "#FF5733"
        }
        response = requests.post(f"{BASE_URL}/categories", json=new_category)
        created = response.json()
        print_result("Crear nueva categoría", created)
        
        if response.status_code == 201:
            category_id = created["data"]["id"]
            
            # Obtener la categoría creada
            response = requests.get(f"{BASE_URL}/categories/{category_id}")
            category = response.json()
            print_result(f"Obtener categoría {category_id}", category)
            
            # Actualizar la categoría
            update_data = {
                "nombre": f"Categoría Actualizada {int(time.time())}",
                "color": "#33FF57"
            }
            response = requests.put(f"{BASE_URL}/categories/{category_id}", json=update_data)
            updated = response.json()
            print_result(f"Actualizar categoría {category_id}", updated)
            
            # Eliminar la categoría
            response = requests.delete(f"{BASE_URL}/categories/{category_id}")
            deleted = response.json()
            print_result(f"Eliminar categoría {category_id}", deleted)
    
    except Exception as e:
        print(f"{Colors.ERROR}Error en demo de categorías: {e}{Colors.END}")

def demo_posts():
    """Demuestra las operaciones CRUD para posts"""
    print_header("DEMOSTRACIÓN DE API DE POSTS")
    
    try:
        # Obtener todos los posts
        response = requests.get(f"{BASE_URL}/posts")
        posts = response.json()
        print_result("Obtener todos los posts", posts)
        
        # Obtener posts destacados
        response = requests.get(f"{BASE_URL}/posts?destacados=true")
        highlighted = response.json()
        print_result("Obtener posts destacados", highlighted)
        
        # Obtener posts por estado
        response = requests.get(f"{BASE_URL}/posts?status=publicado")
        published = response.json()
        print_result("Obtener posts publicados", published)
        
        # Buscar posts
        response = requests.get(f"{BASE_URL}/posts?search=salud")
        search_results = response.json()
        print_result("Buscar posts con 'salud'", search_results)
        
        # Obtener categorías para usar en nuevo post
        response = requests.get(f"{BASE_URL}/categories")
        categories = response.json()
        
        if response.status_code == 200 and categories["data"]:
            category_id = categories["data"][0]["id"]
            
            # Crear nuevo post
            new_post = {
                "titulo": f"Post de Demostración {int(time.time())}",
                "extracto": "Este es un post de prueba creado por el script de demostración.",
                "contenido": "<p>Contenido de prueba para el post de demostración.</p>",
                "autor": "Script Demo",
                "categoriaId": category_id,
                "estado": "borrador"
            }
            response = requests.post(f"{BASE_URL}/posts", json=new_post)
            created = response.json()
            print_result("Crear nuevo post", created)
            
            if response.status_code == 201:
                post_id = created["data"]["id"]
                
                # Obtener el post creado
                response = requests.get(f"{BASE_URL}/posts/{post_id}")
                post = response.json()
                print_result(f"Obtener post {post_id}", post)
                
                # Actualizar el post
                update_data = {
                    "titulo": f"Post Actualizado {int(time.time())}",
                    "extracto": "Extracto actualizado.",
                    "contenido": "<p>Contenido actualizado para el post de demostración.</p>",
                    "autor": "Script Demo",
                    "categoriaId": category_id
                }
                response = requests.put(f"{BASE_URL}/posts/{post_id}", json=update_data)
                updated = response.json()
                print_result(f"Actualizar post {post_id}", updated)
                
                # Cambiar estado del post
                response = requests.patch(f"{BASE_URL}/posts/{post_id}/status", json={"status": "publicado"})
                status_changed = response.json()
                print_result(f"Cambiar estado del post {post_id} a 'publicado'", status_changed)
                
                # Marcar como destacado
                response = requests.patch(f"{BASE_URL}/posts/{post_id}/highlight", json={"destacado": True})
                highlight_changed = response.json()
                print_result(f"Marcar post {post_id} como destacado", highlight_changed)
                
                # Eliminar el post
                response = requests.delete(f"{BASE_URL}/posts/{post_id}")
                deleted = response.json()
                print_result(f"Eliminar post {post_id}", deleted)
        else:
            print(f"{Colors.WARNING}No se encontraron categorías para crear un post{Colors.END}")
    
    except Exception as e:
        print(f"{Colors.ERROR}Error en demo de posts: {e}{Colors.END}")

def main():
    """Función principal que ejecuta la demostración completa"""
    try:
        # Iniciar el servidor
        if not start_server():
            print(f"{Colors.ERROR}No se pudo iniciar el servidor. La demostración no puede continuar.{Colors.END}")
            return
        
        # Dar tiempo para que el servidor se inicialice completamente
        time.sleep(1)
        
        # Ejecutar demostraciones
        demo_categories()
        demo_posts()
        
    except Exception as e:
        print(f"{Colors.ERROR}Error durante la demostración: {e}{Colors.END}")
    finally:
        # Detener el servidor
        stop_server()

if __name__ == "__main__":
    main() 