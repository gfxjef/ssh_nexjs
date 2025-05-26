# Configuración de Gunicorn optimizada para procesamiento de PDFs
import multiprocessing
import os

# Configuración del servidor
bind = "0.0.0.0:8000"
workers = 1  # Reducir workers para evitar problemas de memoria en Render
worker_class = "sync"

# Configuración de timeouts (CRÍTICO para PDFs grandes)
timeout = 300  # 5 minutos para requests normales
keepalive = 5
max_requests = 100  # Reiniciar worker después de 100 requests para liberar memoria
max_requests_jitter = 10

# Configuración de memoria y recursos
worker_memory_limit = 512 * 1024 * 1024  # 512MB por worker
preload_app = True  # Cargar app antes de fork para ahorrar memoria

# Configuración de logging
loglevel = "info"
accesslog = "-"  # Log a stdout
errorlog = "-"   # Log a stderr
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Configuración específica para Render
if os.getenv('RENDER'):
    # En Render, usar configuración más conservadora
    workers = 1
    timeout = 600  # 10 minutos para PDFs grandes
    worker_memory_limit = 400 * 1024 * 1024  # 400MB en Render
    
# Configuración de señales
def when_ready(server):
    server.log.info("Gunicorn server is ready. Listening on: %s", server.address)

def worker_int(worker):
    worker.log.info("Worker received INT or QUIT signal")

def pre_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)
    
def worker_abort(worker):
    worker.log.info("Worker received SIGABRT signal") 