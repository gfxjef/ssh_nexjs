#!/bin/bash

# Script de inicio optimizado para Render
echo "🚀 Iniciando aplicación Flask con Gunicorn optimizado..."

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

# Instalar dependencias si es necesario
echo "📦 Verificando dependencias..."
pip install -r requirements.txt

# Crear directorios necesarios
echo "📁 Creando directorios necesarios..."
mkdir -p db/pdf_manager/uploads
mkdir -p db/pdf_manager/pdf_files
mkdir -p uploads/posts
mkdir -p db/uploads/posts

# Iniciar con Gunicorn usando configuración optimizada
echo "🔧 Iniciando Gunicorn con configuración optimizada..."
exec gunicorn --config gunicorn.conf.py app:app 