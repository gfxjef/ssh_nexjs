# Módulo de Bienestar - Backend API

Este módulo proporciona una API RESTful para la gestión del blog de bienestar, permitiendo crear, editar, listar y eliminar posts y categorías.

## Estructura del proyecto

```
bienestar/
├── __init__.py         # Inicialización del módulo y blueprint
├── app.py              # Aplicación Flask para desarrollo
├── models.py           # Esquemas y validación de datos
├── queries.py          # Consultas SQL
├── setup.py            # Configuración de base de datos
├── test_api.py         # Script para probar los endpoints
├── routes/
│   ├── __init__.py     # Inicialización del paquete de rutas
│   ├── categories.py   # Endpoints para categorías
│   └── posts.py        # Endpoints para posts
└── README.md           # Este archivo
```

## Requisitos

- Python 3.8+
- Flask
- MySQL
- Bibliotecas adicionales: flask-cors, requests (para pruebas)

## Instalación

1. Asegúrate de tener instaladas las dependencias:

```bash
pip install flask flask-cors requests
```

2. Configura tus credenciales de base de datos en `backend/db/config.py`.

## Ejecución del servidor

Para iniciar el servidor de desarrollo:

```bash
python -m backend.db.bienestar.app
```

El servidor estará disponible en `http://localhost:5000`.

## Endpoints disponibles

### Categorías

- `GET /api/bienestar/categories` - Obtener todas las categorías
- `GET /api/bienestar/categories/{id}` - Obtener una categoría por ID
- `POST /api/bienestar/categories` - Crear una nueva categoría
- `PUT /api/bienestar/categories/{id}` - Actualizar una categoría
- `DELETE /api/bienestar/categories/{id}` - Eliminar una categoría

### Posts

- `GET /api/bienestar/posts` - Obtener todos los posts
- `GET /api/bienestar/posts?status=publicado` - Obtener posts por estado
- `GET /api/bienestar/posts?destacados=true` - Obtener posts destacados
- `GET /api/bienestar/posts?search=término` - Buscar posts por término
- `GET /api/bienestar/posts?category=1` - Obtener posts por categoría
- `GET /api/bienestar/posts/{id}` - Obtener un post por ID
- `POST /api/bienestar/posts` - Crear un nuevo post
- `PUT /api/bienestar/posts/{id}` - Actualizar un post
- `PATCH /api/bienestar/posts/{id}/status` - Cambiar el estado de un post
- `PATCH /api/bienestar/posts/{id}/highlight` - Marcar/desmarcar un post como destacado
- `DELETE /api/bienestar/posts/{id}` - Eliminar un post

## Pruebas

Para verificar el funcionamiento de la API, puedes utilizar el script `test_api.py`:

```bash
# Configurar la base de datos y cargar datos iniciales
python -m backend.db.bienestar.test_api --setup

# Probar todos los endpoints
python -m backend.db.bienestar.test_api

# Probar solo endpoints específicos
python -m backend.db.bienestar.test_api --categories
python -m backend.db.bienestar.test_api --posts

# Usar una URL base diferente
python -m backend.db.bienestar.test_api --url=http://otra-url:puerto/api/bienestar
```

## Integración con el frontend

Para conectar el frontend a esta API:

1. Asegúrate de que el servidor backend esté en ejecución
2. Configura la URL base en el frontend para apuntar a `http://localhost:5000/api/bienestar`
3. Asegúrate de que las solicitudes incluyan los encabezados CORS adecuados

## Estructura de la base de datos

### Tabla: categorias_bienestar

| Campo       | Tipo         | Descripción                       |
|-------------|--------------|-----------------------------------|
| id          | INT          | ID único (clave primaria)         |
| nombre      | VARCHAR(100) | Nombre de la categoría (único)    |
| color       | VARCHAR(7)   | Código de color HEX (#RRGGBB)     |
| created_at  | TIMESTAMP    | Fecha de creación                 |
| updated_at  | TIMESTAMP    | Fecha de última actualización     |

### Tabla: posts_bienestar

| Campo        | Tipo         | Descripción                           |
|--------------|--------------|---------------------------------------|
| id           | INT          | ID único (clave primaria)             |
| titulo       | VARCHAR(255) | Título del post                       |
| extracto     | TEXT         | Resumen breve del contenido           |
| contenido    | TEXT         | Contenido completo (HTML)             |
| autor        | VARCHAR(100) | Nombre del autor                      |
| fecha        | DATETIME     | Fecha de publicación                  |
| estado       | ENUM         | Estado: 'publicado', 'borrador', 'archivado' |
| destacado    | BOOLEAN      | Si el post está destacado             |
| vistas       | INT          | Contador de visualizaciones           |
| categoria_id | INT          | ID de categoría (clave foránea)       |
| imagen_url   | VARCHAR(255) | URL de la imagen destacada (opcional) |
| created_at   | TIMESTAMP    | Fecha de creación                     |
| updated_at   | TIMESTAMP    | Fecha de última actualización         | 