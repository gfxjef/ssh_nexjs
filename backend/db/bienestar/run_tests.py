"""
Script para ejecutar todas las pruebas del módulo de bienestar.
Este script inicializa la base de datos y ejecuta las pruebas de API en un orden lógico.
"""
import os
import sys
import time
import subprocess
import requests
import threading
from .setup_db import main as setup_db

def stream_output(process, prefix=""):
    """Muestra la salida del proceso en tiempo real"""
    for line in iter(process.stdout.readline, ""):
        if not line:
            break
        sys.stdout.write(f"{prefix} {line}")
        sys.stdout.flush()
    process.stdout.close()

def run_command(command):
    """Ejecuta un comando y muestra su salida en tiempo real"""
    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True
    )
    
    for line in process.stdout:
        sys.stdout.write(line)
        sys.stdout.flush()
    
    process.wait()
    return process.returncode

def wait_for_server(max_attempts=30, delay=1):
    """Espera a que el servidor esté disponible"""
    print("Esperando a que el servidor esté disponible...")
    base_url = "http://localhost:5000/"
    
    for attempt in range(max_attempts):
        try:
            response = requests.get(base_url)
            if response.status_code == 200:
                print(f"[OK] Servidor disponible después de {attempt + 1} intentos")
                return True
        except requests.exceptions.ConnectionError:
            sys.stdout.write(".")
            sys.stdout.flush()
            time.sleep(delay)
    
    print(f"\n[ERROR] El servidor no está disponible después de {max_attempts} intentos")
    return False

def main():
    """Función principal que ejecuta todas las pruebas"""
    print("\n===== INICIANDO PRUEBAS DEL MÓDULO DE BIENESTAR =====\n")
    
    # 1. Inicializar la base de datos
    print("\n----- Inicializando base de datos -----\n")
    db_result = setup_db()
    if not db_result:
        print("Error al inicializar la base de datos. No se pueden continuar las pruebas.")
        return False
    
    # 2. Iniciar el servidor Flask
    print("\n----- Iniciando servidor Flask en segundo plano -----\n")
    server_process = subprocess.Popen(
        [sys.executable, "-m", "backend.db.bienestar.app"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True
    )
    
    # Iniciar un hilo para mostrar la salida del servidor
    output_thread = threading.Thread(
        target=stream_output, 
        args=(server_process, "[Servidor]")
    )
    output_thread.daemon = True
    output_thread.start()
    
    # Esperar a que el servidor esté listo
    if not wait_for_server(max_attempts=30, delay=1):
        print("ERROR: El servidor no pudo iniciarse correctamente.")
        server_process.terminate()
        server_process.wait()
        return False
    
    try:
        # 3. Ejecutar las pruebas de API
        print("\n----- Ejecutando pruebas de API -----\n")
        run_command([sys.executable, "-m", "backend.db.bienestar.test_api"])
        
        print("\n===== PRUEBAS COMPLETADAS =====\n")
        
    except KeyboardInterrupt:
        print("\nPruebas interrumpidas por el usuario.")
    finally:
        # Asegurarse de que el servidor se detenga al finalizar
        print("\nDeteniendo el servidor Flask...")
        server_process.terminate()
        server_process.wait()
        print("Servidor detenido.")

if __name__ == "__main__":
    main() 