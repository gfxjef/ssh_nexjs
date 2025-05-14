"""
Script para probar los endpoints de la API de bienestar.
Ejecutar este script para verificar el funcionamiento de todos los endpoints.
"""
import time
import json
import requests
import argparse

# Configuración
BASE_URL = "http://localhost:5000/api/bienestar"  # Debe adaptarse según la configuración de tu API

# Colores para la salida en consola
class Colors:
    OK = '\033[92m'  # Verde
    ERROR = '\033[91m'  # Rojo
    WARNING = '\033[93m'  # Amarillo
    INFO = '\033[94m'  # Azul
    BOLD = '\033[1m'  # Negrita
    END = '\033[0m'  # Fin de formato

def print_result(message, success=True, extra_data=None):
    """Imprime un resultado con formato y colores"""
    # Usando caracteres ASCII en lugar de Unicode para compatibilidad con Windows
    status = f"{Colors.OK}[OK]{Colors.END}" if success else f"{Colors.ERROR}[ERROR]{Colors.END}"
    print(f"{status} {message}")
    
    if extra_data and not success:
        print(f"{Colors.INFO}Detalles:{Colors.END}")
        print(json.dumps(extra_data, indent=2, ensure_ascii=False))
    
    print()  # Línea en blanco para separar resultados

def test_create_tables():
    """Prueba la creación de tablas en la base de datos"""
    print(f"{Colors.BOLD}Probando creación de tablas...{Colors.END}")
    
    # Importar módulo después de definir las funciones para evitar problemas de importación
    from .setup import setup_database
    result = setup_database()
    
    if result:
        print_result("Tablas creadas correctamente")
    else:
        print_result("Error al crear tablas", False)
    
def test_seed_data():
    """Prueba la carga inicial de datos"""
    print(f"{Colors.BOLD}Probando carga de datos iniciales...{Colors.END}")
    
    from .setup import seed_initial_data
    result = seed_initial_data()
    
    if result:
        print_result("Datos iniciales cargados correctamente")
    else:
        print_result("Error al cargar datos iniciales", False)

def test_categories_endpoints(url=BASE_URL):
    """Prueba todos los endpoints relacionados con categorías"""
    print(f"{Colors.BOLD}Probando endpoints de categorías...{Colors.END}")
    endpoint = f"{url}/categories"
    
    # 1. Obtener todas las categorías
    print(f"{Colors.INFO}GET {endpoint}{Colors.END}")
    response = requests.get(endpoint)
    success = response.status_code == 200 and response.json().get('success', False)
    print_result("Obtener todas las categorías", success, response.json() if not success else None)
    
    if success:
        categories = response.json().get('data', [])
        
        if categories:
            # 2. Obtener una categoría específica
            category_id = categories[0]['id']
            print(f"{Colors.INFO}GET {endpoint}/{category_id}{Colors.END}")
            response = requests.get(f"{endpoint}/{category_id}")
            success = response.status_code == 200 and response.json().get('success', False)
            print_result(f"Obtener categoría con ID {category_id}", success, response.json() if not success else None)
            
            # 3. Crear una nueva categoría
            new_category = {
                "nombre": f"Nueva Categoría {int(time.time())}",
                "color": "#FFA500"
            }
            print(f"{Colors.INFO}POST {endpoint}{Colors.END}")
            response = requests.post(endpoint, json=new_category)
            success = response.status_code == 201 and response.json().get('success', False)
            print_result("Crear nueva categoría", success, response.json() if not success else None)
            
            if success:
                created_category = response.json().get('data', {})
                
                # 4. Actualizar una categoría
                updated_data = {
                    "nombre": f"Categoría Actualizada {int(time.time())}",
                    "color": "#800080"
                }
                print(f"{Colors.INFO}PUT {endpoint}/{created_category['id']}{Colors.END}")
                response = requests.put(f"{endpoint}/{created_category['id']}", json=updated_data)
                success = response.status_code == 200 and response.json().get('success', False)
                print_result(f"Actualizar categoría con ID {created_category['id']}", success, response.json() if not success else None)
                
                # 5. Eliminar una categoría
                print(f"{Colors.INFO}DELETE {endpoint}/{created_category['id']}{Colors.END}")
                response = requests.delete(f"{endpoint}/{created_category['id']}")
                success = response.status_code == 200 and response.json().get('success', False)
                print_result(f"Eliminar categoría con ID {created_category['id']}", success, response.json() if not success else None)
        else:
            print(f"{Colors.WARNING}No se encontraron categorías para probar los endpoints restantes{Colors.END}")
    else:
        print(f"{Colors.WARNING}No se pudieron probar más endpoints de categorías debido a un error inicial{Colors.END}")

def test_posts_endpoints(url=BASE_URL):
    """Prueba todos los endpoints relacionados con posts"""
    print(f"{Colors.BOLD}Probando endpoints de posts...{Colors.END}")
    endpoint = f"{url}/posts"
    
    # 1. Obtener todos los posts
    print(f"{Colors.INFO}GET {endpoint}{Colors.END}")
    response = requests.get(endpoint)
    success = response.status_code == 200 and response.json().get('success', False)
    print_result("Obtener todos los posts", success, response.json() if not success else None)
    
    if success:
        posts = response.json().get('data', [])
        
        if posts:
            # 2. Obtener un post específico
            post_id = posts[0]['id']
            print(f"{Colors.INFO}GET {endpoint}/{post_id}{Colors.END}")
            response = requests.get(f"{endpoint}/{post_id}")
            success = response.status_code == 200 and response.json().get('success', False)
            print_result(f"Obtener post con ID {post_id}", success, response.json() if not success else None)
            
            # 3. Obtener posts por estado
            print(f"{Colors.INFO}GET {endpoint}?status=publicado{Colors.END}")
            response = requests.get(f"{endpoint}?status=publicado")
            success = response.status_code == 200 and response.json().get('success', False)
            print_result("Obtener posts publicados", success, response.json() if not success else None)
            
            # 4. Obtener posts destacados
            print(f"{Colors.INFO}GET {endpoint}?destacados=true{Colors.END}")
            response = requests.get(f"{endpoint}?destacados=true")
            success = response.status_code == 200 and response.json().get('success', False)
            print_result("Obtener posts destacados", success, response.json() if not success else None)
            
            # 5. Buscar posts por término
            print(f"{Colors.INFO}GET {endpoint}?search=salud{Colors.END}")
            response = requests.get(f"{endpoint}?search=salud")
            success = response.status_code == 200 and response.json().get('success', False)
            print_result("Buscar posts con término 'salud'", success, response.json() if not success else None)
        else:
            print(f"{Colors.WARNING}No se encontraron posts para probar las operaciones de búsqueda{Colors.END}")
        
        # 6. Obtener una categoría para el nuevo post
        print(f"{Colors.INFO}GET {url}/categories{Colors.END}")
        response_categories = requests.get(f"{url}/categories")
        success_categories = response_categories.status_code == 200 and response_categories.json().get('success', False)
        
        if not success_categories:
            print_result("Obtener categorías para crear post", False, response_categories.json())
            print(f"{Colors.WARNING}No se pudieron obtener categorías para crear un post{Colors.END}")
            return
            
        categories = response_categories.json().get('data', [])
        
        if not categories:
            print_result("Verificar categorías disponibles", False)
            print(f"{Colors.WARNING}No hay categorías disponibles. Creando una categoría de prueba...{Colors.END}")
            
            # Crear una categoría si no hay ninguna
            new_category = {
                "nombre": f"Categoría de Prueba {int(time.time())}",
                "color": "#FFA500"
            }
            response = requests.post(f"{url}/categories", json=new_category)
            
            if response.status_code == 201 and response.json().get('success', False):
                print_result("Crear categoría para pruebas", True)
                category_id = response.json().get('data', {}).get('id')
                if not category_id:
                    print_result("Obtener ID de categoría", False)
                    print(f"{Colors.WARNING}No se pudo obtener el ID de la categoría creada{Colors.END}")
                    return
            else:
                print_result("Crear categoría para pruebas", False, response.json())
                print(f"{Colors.WARNING}No se pudo crear una categoría para las pruebas{Colors.END}")
                return
        else:
            category_id = categories[0]['id']
                
        # 7. Crear un nuevo post
        new_post = {
            "titulo": f"Nuevo Post de Prueba {int(time.time())}",
            "extracto": "Este es un extracto de prueba para el nuevo post.",
            "contenido": "<p>Este es el contenido completo del post de prueba.</p>",
            "autor": "API Tester",
            "categoriaId": category_id,
            "estado": "borrador"
        }
        print(f"{Colors.INFO}POST {endpoint}{Colors.END}")
        response = requests.post(endpoint, json=new_post)
        success = response.status_code == 201 and response.json().get('success', False)
        
        # Imprimir siempre la respuesta completa para diagnóstico
        response_json = response.json()
        print(f"{Colors.INFO}Respuesta completa de creación de post:{Colors.END}")
        print(json.dumps(response_json, indent=2, ensure_ascii=False))
        
        print_result("Crear nuevo post", success, None if success else response_json)
        
        if success:
            created_post = response_json.get('data', {})
            created_post_id = created_post.get('id')
            
            print(f"{Colors.INFO}Datos del post creado:{Colors.END}")
            print(json.dumps(created_post, indent=2, ensure_ascii=False))
            print(f"{Colors.INFO}ID del post: {created_post_id}{Colors.END}")
            
            if not created_post_id:
                print(f"{Colors.WARNING}No se pudo obtener el ID del post creado. No se probarán las operaciones relacionadas.{Colors.END}")
                return
                
            # 8. Actualizar un post
            updated_post = {
                "titulo": f"Post Actualizado {int(time.time())}",
                "extracto": "Este es un extracto actualizado.",
                "contenido": "<p>Este es el contenido actualizado del post de prueba.</p>",
                "autor": "API Tester",
                "categoriaId": category_id
            }
            print(f"{Colors.INFO}PUT {endpoint}/{created_post_id}{Colors.END}")
            response = requests.put(f"{endpoint}/{created_post_id}", json=updated_post)
            success = response.status_code == 200 and response.json().get('success', False)
            print_result(f"Actualizar post con ID {created_post_id}", success, response.json() if not success else None)
            
            # 9. Cambiar estado del post
            print(f"{Colors.INFO}PATCH {endpoint}/{created_post_id}/status{Colors.END}")
            response = requests.patch(f"{endpoint}/{created_post_id}/status", json={"status": "publicado"})
            success = response.status_code == 200 and response.json().get('success', False)
            print_result(f"Cambiar estado del post {created_post_id} a 'publicado'", success, response.json() if not success else None)
            
            # 10. Cambiar destacado del post
            print(f"{Colors.INFO}PATCH {endpoint}/{created_post_id}/highlight{Colors.END}")
            response = requests.patch(f"{endpoint}/{created_post_id}/highlight", json={"destacado": True})
            success = response.status_code == 200 and response.json().get('success', False)
            print_result(f"Marcar post {created_post_id} como destacado", success, response.json() if not success else None)
            
            # 11. Eliminar el post
            print(f"{Colors.INFO}DELETE {endpoint}/{created_post_id}{Colors.END}")
            response = requests.delete(f"{endpoint}/{created_post_id}")
            success = response.status_code == 200 and response.json().get('success', False)
            print_result(f"Eliminar post con ID {created_post_id}", success, response.json() if not success else None)
    else:
        print(f"{Colors.WARNING}No se pudieron probar más endpoints de posts debido a un error inicial{Colors.END}")

def main():
    parser = argparse.ArgumentParser(description='Prueba los endpoints de la API de bienestar')
    parser.add_argument('--setup', action='store_true', help='Configurar tablas y datos iniciales')
    parser.add_argument('--url', type=str, default=BASE_URL, help='URL base de la API')
    parser.add_argument('--categories', action='store_true', help='Probar solo endpoints de categorías')
    parser.add_argument('--posts', action='store_true', help='Probar solo endpoints de posts')
    args = parser.parse_args()
    
    print(f"{Colors.BOLD}{Colors.INFO}INICIANDO PRUEBAS DE API BIENESTAR{Colors.END}")
    print(f"URL base: {args.url}")
    print("=" * 50)
    
    if args.setup:
        test_create_tables()
        test_seed_data()
    
    # Si no se especifica ninguna prueba, ejecutar todas
    run_all = not (args.categories or args.posts)
    
    if args.categories or run_all:
        test_categories_endpoints(args.url)
    
    if args.posts or run_all:
        test_posts_endpoints(args.url)
    
    print(f"{Colors.BOLD}{Colors.INFO}PRUEBAS FINALIZADAS{Colors.END}")
    print("=" * 50)

if __name__ == "__main__":
    main() 