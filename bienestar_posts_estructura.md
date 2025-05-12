# Estructura de Archivos para Sistema de Administración de Posts de Bienestar

```
frontend/
│
├── lib/
│   └── bienestar/
│       ├── types.ts                   # Tipos e interfaces para Posts y Categorías
│       ├── storage.ts                 # Funciones de localStorage para persistencia
│       └── api.ts                     # Preparación para futura API (fase 4)
│
├── app/
│   └── dashboard/
│       └── bienestar/
│           ├── posts/
│           │   └── page.tsx           # Vista pública de posts (ya existente, a modificar)
│           │
│           ├── admin-posts/
│           │   └── page.tsx           # Vista de administración (ya existente, a modificar)
│           │
│           └── context/
│               ├── PostsContext.tsx   # Contexto y provider para gestión de posts
│               └── NotificationsContext.tsx # Contexto para sistema de notificaciones
│
├── components/
│   └── bienestar/
│       ├── PostForm.tsx               # Componente de formulario para crear/editar posts
│       ├── PostList.tsx               # Componente de lista de posts reutilizable
│       ├── PostFilters.tsx            # Componente de filtros para posts
│       ├── CategoryBadge.tsx          # Componente para mostrar categorías
│       ├── Notifications.tsx          # Componente de notificaciones tipo toast
│       └── Pagination.tsx             # Componente de paginación (fase 4)
│
└── docs/
    └── bienestar-posts.md            # Documentación del sistema (fase 4)
```

## Descripción de los Componentes Principales

### Capa de Datos (Data Layer)

- **types.ts**: Define todas las interfaces y tipos TypeScript para Posts, Categorías y Estados.
- **storage.ts**: Implementa funciones para guardar/recuperar datos usando localStorage, con funciones organizadas para Posts y Categorías.
- **api.ts**: (Fase 4) Prepara la estructura para integración futura con API real.

### Capa de Estado (State Layer)

- **PostsContext.tsx**: Crea un contexto de React con estado global y funciones CRUD para posts y categorías.
- **NotificationsContext.tsx**: Gestiona las notificaciones del sistema.

### Capa de Presentación (UI Layer)

- **PostForm.tsx**: Componente de formulario reutilizable para crear y editar posts.
- **PostList.tsx**: Componente para mostrar listas de posts con opciones de formateo.
- **PostFilters.tsx**: Componente de filtros y búsqueda para posts.
- **CategoryBadge.tsx**: Componente pequeño para mostrar categorías con sus colores.
- **Notifications.tsx**: Componente visual para mostrar notificaciones.
- **Pagination.tsx**: (Fase 4) Componente para paginar resultados.

### Vistas Principales (Pages)

- **posts/page.tsx**: Vista pública de blog con posts filtrados (ya existe, requiere modificación).
- **admin-posts/page.tsx**: Panel de administración para gestionar posts (ya existe, requiere modificación). 