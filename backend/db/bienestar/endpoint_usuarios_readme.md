# Documentación de API - Administración de Usuarios

## URL Base
```
http://localhost:5000/api/bienestar
```

## Endpoints de Usuarios

### Obtener todos los usuarios
- **Método:** GET
- **URL:** `/users`
- **Parámetros opcionales:**
  - `search`: Término de búsqueda (nombre, correo, cargo)
- **Ejemplos:**
  - `/users` - Obtener todos los usuarios
  - `/users?search=juan` - Buscar usuarios por término
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "correo": "juan.perez@empresa.com",
        "nombre": "Juan Pérez",
        "usuario": "jperez",
        "cargo": "Desarrollador Senior",
        "grupo": "Tecnología",
        "rango": "Empleado"
      },
      {
        "id": 2,
        "correo": "maria.garcia@empresa.com",
        "nombre": "María García",
        "usuario": "mgarcia",
        "cargo": "Gerente de Recursos Humanos",
        "grupo": "RRHH",
        "rango": "Gerente"
      }
    ],
    "total": 2
  }
  ```

### Obtener un usuario específico
- **Método:** GET
- **URL:** `/users/{id}`
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "correo": "juan.perez@empresa.com",
      "nombre": "Juan Pérez",
      "usuario": "jperez",
      "cargo": "Desarrollador Senior",
      "grupo": "Tecnología",
      "rango": "Empleado"
    }
  }
  ```

### Actualizar un usuario
- **Método:** PUT
- **URL:** `/users/{id}`
- **Campos editables:** `correo`, `nombre`, `cargo`, `grupo`
- **Campos no editables (solo lectura):** `id`, `usuario`, `rango`
- **Cuerpo:**
  ```json
  {
    "correo": "juan.perez.nuevo@empresa.com",
    "nombre": "Juan Carlos Pérez",
    "cargo": "Desarrollador Lead",
    "grupo": "Tecnología Avanzada"
  }
  ```
- **Respuesta exitosa:**
  ```json
  {
    "success": true,
    "message": "Usuario actualizado correctamente",
    "data": {
      "id": 1,
      "correo": "juan.perez.nuevo@empresa.com",
      "nombre": "Juan Carlos Pérez",
      "usuario": "jperez",
      "cargo": "Desarrollador Lead",
      "grupo": "Tecnología Avanzada",
      "rango": "Empleado"
    }
  }
  ```

## Códigos de estado HTTP

- **200:** Operación completada con éxito
- **400:** Error en la solicitud (datos inválidos)
- **404:** Usuario no encontrado
- **500:** Error interno del servidor

## Estructura de respuestas de error

```json
{
  "success": false,
  "error": "Mensaje descriptivo del error"
}
```

## Validaciones

### Campos obligatorios en actualización:
- `correo`: Debe ser un email válido
- `nombre`: Mínimo 2 caracteres

### Límites de longitud:
- `correo`: Máximo 255 caracteres
- `nombre`: Máximo 100 caracteres
- `cargo`: Máximo 100 caracteres
- `grupo`: Máximo 255 caracteres

### Campos opcionales:
- `cargo`: Puede ser vacío o null
- `grupo`: Puede ser vacío o null

## Estructura de datos

### Usuario
```json
{
  "id": 1,
  "correo": "usuario@empresa.com",
  "nombre": "Nombre Completo",
  "usuario": "nombreusuario",
  "cargo": "Cargo del Usuario",
  "grupo": "Grupo al que pertenece",
  "rango": "Rango en la organización"
}
```

## Funcionalidades del sistema

### Búsqueda
- Permite buscar usuarios por nombre, correo electrónico o cargo
- La búsqueda es insensible a mayúsculas/minúsculas
- Utiliza coincidencias parciales (LIKE con %)

### Seguridad
- Los campos críticos (`id`, `usuario`, `rango`) están protegidos contra edición
- La validación de datos se realiza tanto en frontend como backend
- Se valida la existencia del usuario antes de realizar actualizaciones

### Gestión de errores
- Respuestas estructuradas con indicadores de éxito/error
- Mensajes de error descriptivos para facilitar el debugging
- Manejo de errores de base de datos y validación 