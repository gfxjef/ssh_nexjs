# Sistema Centralizado de Uploads

## 📁 Estructura de Carpetas

El sistema de uploads ha sido centralizado en `frontend/public/uploads/` con la siguiente estructura:

```
frontend/public/uploads/
├── posts/           # Imágenes y archivos de publicaciones
├── pdf/             # Documentos PDF
├── documentos/      # Documentos generales (PDF, DOC, XLS, etc.)
├── profiles/        # Imágenes de perfil de usuarios
└── temp/            # Archivos temporales
```

## 🚀 Características Principales

### ✅ Auto-creación de Carpetas
- Las carpetas se crean automáticamente cuando no existen
- No hay dependencia de carpetas pre-existentes en el repositorio
- Elimina conflictos con `git pull`

### 🔒 Validación Robusta
- Validación de tipos MIME estricta
- Límites de tamaño por tipo de archivo
- Sanitización de nombres de archivo
- Prevención de path traversal

### 📊 Configuración por Tipo

| Tipo | Tamaño Máx | Extensiones | Múltiples |
|------|------------|-------------|-----------|
| **Posts** | 10MB | .jpg, .jpeg, .png, .webp, .gif | ✅ |
| **PDF** | 30MB | .pdf | ❌ |
| **Documentos** | 20MB | .pdf, .doc, .docx, .xls, .xlsx | ✅ |
| **Profiles** | 2MB | .jpg, .jpeg, .png | ❌ |
| **Temp** | 20MB | Cualquiera | ✅ |

## 🛠️ Uso en Backend (Python)

```python
from backend.utils.upload_utils import UploadManager, UploadType

# Crear directorio automáticamente
upload_dir = UploadManager.ensure_upload_directory(UploadType.POSTS)

# Validar archivo
is_valid, error = UploadManager.validate_file(
    file_size=1024*1024,  # 1MB
    filename="imagen.jpg",
    mime_type="image/jpeg",
    upload_type=UploadType.POSTS
)

# Obtener ruta para guardar
file_path = UploadManager.get_upload_path(UploadType.POSTS, "imagen.jpg")

# Obtener URL relativa
url = UploadManager.get_relative_path(UploadType.POSTS, "imagen.jpg")
# Resultado: "/uploads/posts/imagen.jpg"
```

## 🎨 Uso en Frontend (TypeScript/React)

```typescript
import { uploadFile, UploadType, validateFile } from '@/lib/upload-utils';

// Validar archivo antes de subir
const validation = validateFile(file, UploadType.POSTS);
if (!validation.isValid) {
  console.error(validation.error);
  return;
}

// Subir archivo con progreso
const result = await uploadFile(file, UploadType.POSTS, (progress) => {
  console.log(`Progreso: ${progress}%`);
});

if (result.success) {
  console.log(`Archivo subido: ${result.url}`);
} else {
  console.error(`Error: ${result.error}`);
}
```

## 🔧 Migración desde Sistema Anterior

### Pasos Realizados:
1. ✅ Creada estructura de carpetas centralizada
2. ✅ Implementadas utilidades backend y frontend
3. ✅ Sistema de validación robusto
4. ✅ Auto-creación de directorios

### Próximos Pasos:
1. 🔄 Actualizar configuración Git (.gitignore)
2. 🔄 Migrar APIs backend
3. 🔄 Crear componente React centralizado
4. 🔄 Migrar datos existentes
5. 🔄 Actualizar componentes frontend

## 🧪 Testing

Para verificar que el sistema funciona correctamente:

```bash
python test_upload_utils.py
```

Este script prueba:
- ✅ Creación automática de directorios
- ✅ Validación de archivos
- ✅ Sanitización de nombres
- ✅ Generación de rutas
- ✅ Verificación de estructura

## 🚫 Configuración Git

**IMPORTANTE**: Las carpetas de uploads ya no deben estar en el repositorio Git.

```gitignore
# Uploads centralizados (agregar al .gitignore)
frontend/public/uploads/
!frontend/public/uploads/.gitkeep
```

## 🔄 Limpieza Automática

El sistema incluye limpieza automática de archivos temporales:

```python
# Limpiar archivos temp más antiguos de 24 horas
deleted_count = UploadManager.cleanup_temp_files(max_age_hours=24)
```

## 📈 Beneficios

### ✅ Resuelve Problemas Actuales:
- ❌ Sin más conflictos en `git pull`
- ❌ Sin imágenes perdidas al actualizar
- ❌ Sin dependencias de carpetas en repo

### ✅ Mejoras Adicionales:
- 🔒 Seguridad mejorada
- 📊 Organización lógica
- 🚀 Auto-configuración
- 🧪 Testing completo
- 📚 Documentación clara

## 🆘 Troubleshooting

### Problema: "No se puede crear la carpeta"
**Solución**: Verificar permisos de escritura en `frontend/public/uploads/`

### Problema: "Archivo muy grande"
**Solución**: Verificar límites en `UPLOAD_CONFIG` según tipo de archivo

### Problema: "Extensión no permitida"
**Solución**: Revisar extensiones permitidas para el tipo de upload específico

---

**✨ Sistema implementado siguiendo mejores prácticas de seguridad y organización.** 