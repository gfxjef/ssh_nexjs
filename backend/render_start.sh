#!/bin/bash

# Script de inicio específico para Render
echo "🚀 Iniciando aplicación en Render con configuración optimizada..."

# Configurar variables de entorno para optimización
export RENDER=true
export PYTHONUNBUFFERED=1
export PYTHONDONTWRITEBYTECODE=1

# Configurar límites de memoria para Python
export MALLOC_ARENA_MAX=2
export MALLOC_MMAP_THRESHOLD_=131072
export MALLOC_TRIM_THRESHOLD_=131072
export MALLOC_TOP_PAD_=131072
export MALLOC_MMAP_MAX_=65536

# Navegar al directorio del backend
cd /opt/render/project/src/backend

# Crear directorios necesarios
echo "📁 Creando directorios necesarios..."
mkdir -p db/pdf_manager/uploads
mkdir -p db/pdf_manager/pdf_files
mkdir -p uploads/posts
mkdir -p db/uploads/posts

# Verificar que el archivo de configuración existe
if [ ! -f "gunicorn.conf.py" ]; then
    echo "❌ Error: gunicorn.conf.py no encontrado"
    exit 1
fi

echo "✅ Configuración encontrada: gunicorn.conf.py"

# Iniciar con Gunicorn usando configuración optimizada
echo "🔧 Iniciando Gunicorn con configuración optimizada para Render..."
echo "📊 Puerto: $PORT"
echo "🧠 Memoria disponible: $(free -h | awk '/^Mem:/ {print $2}' 2>/dev/null || echo 'N/A')"

exec gunicorn --config gunicorn.conf.py app:app 