# Documentación de API para el módulo de Bienestar

## URL Base
```
http://localhost:5000/api/bienestar
```

## Endpoints de Categorías

### Obtener todas las categorías
- **Método:** GET
- **URL:** `/categories`
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 4,
        "nombre": "Bienestar Laboral",
        "color": "#2e3954",
        "createdAt": "2025-05-13T19:55:44",
        "updatedAt": "2025-05-13T19:55:44"
      },
      ...
    ]
  }
  ```

### Obtener una categoría específica
- **Método:** GET
- **URL:** `/categories/{id}`
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "data": {
      "id": 4,
      "nombre": "Bienestar Laboral",
      "color": "#2e3954",
      "createdAt": "2025-05-13T19:55:44",
      "updatedAt": "2025-05-13T19:55:44"
    }
  }
  ```

### Crear una nueva categoría
- **Método:** POST
- **URL:** `/categories`
- **Cuerpo:**
  ```json
  {
    "nombre": "Nueva Categoría",
    "color": "#FFA500"
  }
  ```
- **Respuesta exitosa (201):**
  ```json
  {
    "success": true,
    "message": "Categoría creada correctamente",
    "data": {
      "id": 12,
      "nombre": "Nueva Categoría",
      "color": "#FFA500",
      "createdAt": "2025-05-13T19:55:44",
      "updatedAt": "2025-05-13T19:55:44"
    }
  }
  ```

### Actualizar una categoría
- **Método:** PUT
- **URL:** `/categories/{id}`
- **Cuerpo:**
  ```json
  {
    "nombre": "Categoría Actualizada",
    "color": "#800080"
  }
  ```
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "message": "Categoría actualizada correctamente",
    "data": {
      "id": 12,
      "nombre": "Categoría Actualizada",
      "color": "#800080",
      "createdAt": "2025-05-13T19:55:44",
      "updatedAt": "2025-05-13T19:55:44"
    }
  }
  ```

### Eliminar una categoría
- **Método:** DELETE
- **URL:** `/categories/{id}`
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "message": "Categoría eliminada correctamente"
  }
  ```

## Endpoints de Posts

### Obtener todos los posts
- **Método:** GET
- **URL:** `/posts`
- **Parámetros opcionales:**
  - `status`: Filtrar por estado (publicado, borrador, archivado)
  - `category`: ID de categoría para filtrar
  - `search`: Término para buscar en título, extracto o contenido
  - `destacados`: true para mostrar sólo posts destacados
- **Ejemplos:**
  - `/posts?status=publicado`
  - `/posts?category=4`
  - `/posts?search=salud`
  - `/posts?destacados=true`
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 15,
        "titulo": "Título del Post",
        "extracto": "Extracto del post",
        "contenido": "<p>Contenido completo</p>",
        "autor": "Nombre del Autor",
        "fecha": "2025-05-13T18:55:42",
        "estado": "publicado",
        "destacado": true,
        "vistas": 5,
        "categoriaId": 4,
        "categoria": "Bienestar Laboral",
        "imagenUrl": "",
        "createdAt": "2025-05-13T19:55:44",
        "updatedAt": "2025-05-13T19:55:44"
      },
      ...
    ]
  }
  ```

### Obtener un post específico
- **Método:** GET
- **URL:** `/posts/{id}`
- **Parámetros opcionales:**
  - `increment_views`: true para incrementar contador de vistas
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "data": {
      "id": 15,
      "titulo": "Título del Post",
      "extracto": "Extracto del post",
      "contenido": "<p>Contenido completo</p>",
      "autor": "Nombre del Autor",
      "fecha": "2025-05-13T18:55:42",
      "estado": "publicado",
      "destacado": true,
      "vistas": 6,
      "categoriaId": 4,
      "categoria": "Bienestar Laboral",
      "imagenUrl": "",
      "createdAt": "2025-05-13T19:55:44",
      "updatedAt": "2025-05-13T19:55:44"
    }
  }
  ```

### Crear un nuevo post
- **Método:** POST
- **URL:** `/posts`
- **Cuerpo:**
  ```json
  {
    "titulo": "Nuevo Post",
    "extracto": "Este es un extracto de prueba",
    "contenido": "<p>Este es el contenido completo</p>",
    "autor": "Nombre del Autor",
    "categoriaId": 4,
    "estado": "borrador",
    "destacado": false,
    "imagenUrl": ""
  }
  ```
- **Respuesta exitosa (201):**
  ```json
  {
    "success": true,
    "message": "Post creado correctamente",
    "data": {
      "id": 18,
      "titulo": "Nuevo Post",
      "extracto": "Este es un extracto de prueba",
      "contenido": "<p>Este es el contenido completo</p>",
      "autor": "Nombre del Autor",
      "fecha": "2025-05-13T19:01:59",
      "estado": "borrador",
      "destacado": false,
      "vistas": 0,
      "categoriaId": 4,
      "categoria": "Bienestar Laboral",
      "imagenUrl": "",
      "createdAt": "2025-05-13T20:02:00",
      "updatedAt": "2025-05-13T20:02:00"
    }
  }
  ```

### Actualizar un post
- **Método:** PUT
- **URL:** `/posts/{id}`
- **Cuerpo:**
  ```json
  {
    "titulo": "Post Actualizado",
    "extracto": "Este es un extracto actualizado",
    "contenido": "<p>Este es el contenido actualizado</p>",
    "autor": "Nombre del Autor",
    "categoriaId": 4,
    "imagenUrl": ""
  }
  ```
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "message": "Post actualizado correctamente",
    "data": {
      "id": 18,
      "titulo": "Post Actualizado",
      "extracto": "Este es un extracto actualizado",
      "contenido": "<p>Este es el contenido actualizado</p>",
      "autor": "Nombre del Autor",
      "fecha": "2025-05-13T19:01:59",
      "estado": "borrador",
      "destacado": false,
      "vistas": 0,
      "categoriaId": 4,
      "categoria": "Bienestar Laboral",
      "imagenUrl": "",
      "createdAt": "2025-05-13T20:02:00",
      "updatedAt": "2025-05-13T20:02:24"
    }
  }
  ```

### Cambiar estado de un post
- **Método:** PATCH
- **URL:** `/posts/{id}/status`
- **Cuerpo:**
  ```json
  {
    "status": "publicado"
  }
  ```
- **Estados válidos:** `publicado`, `borrador`, `archivado`
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "message": "Estado del post actualizado correctamente",
    "data": {
      "id": 18,
      "titulo": "Post Actualizado",
      "estado": "publicado",
      "destacado": false,
      "...": "..."
    }
  }
  ```

### Marcar/desmarcar post como destacado
- **Método:** PATCH
- **URL:** `/posts/{id}/highlight`
- **Cuerpo:**
  ```json
  {
    "destacado": true
  }
  ```
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "message": "Estado destacado del post actualizado correctamente",
    "data": {
      "id": 18,
      "titulo": "Post Actualizado",
      "estado": "publicado",
      "destacado": true,
      "...": "..."
    }
  }
  ```

### Eliminar un post
- **Método:** DELETE
- **URL:** `/posts/{id}`
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "message": "Post eliminado correctamente"
  }
  ```

## Códigos de estado HTTP

- **200:** Operación completada con éxito
- **201:** Recurso creado con éxito
- **400:** Error en la solicitud (datos inválidos)
- **404:** Recurso no encontrado
- **500:** Error interno del servidor

## Estructura de respuestas de error

```json
{
  "success": false,
  "error": "Mensaje descriptivo del error"
}
```

## Estructura de datos

### Categoría
```json
{
  "id": 4,
  "nombre": "Bienestar Laboral",
  "color": "#2e3954",
  "createdAt": "2025-05-13T19:55:44",
  "updatedAt": "2025-05-13T19:55:44"
}
```

### Post
```json
{
  "id": 15,
  "titulo": "Título del Post",
  "extracto": "Extracto del post",
  "contenido": "<p>Contenido completo</p>",
  "autor": "Nombre del Autor",
  "fecha": "2025-05-13T18:55:42",
  "estado": "publicado",
  "destacado": true,
  "vistas": 5,
  "categoriaId": 4,
  "categoria": "Bienestar Laboral",
  "imagenUrl": "",
  "createdAt": "2025-05-13T19:55:44",
  "updatedAt": "2025-05-13T19:55:44"
}
``` 