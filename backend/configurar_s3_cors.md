# Configuración CORS para S3

## 🚨 Configurar CORS en el bucket S3

### Pasos para configurar CORS:

1. **Ve a AWS S3 Console** → Tu bucket `redkossodo`
2. **Ve a Permisos** → **Cross-origin resource sharing (CORS)**
3. **Haz clic en "Editar"**
4. **Pega esta configuración CORS:**

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "HEAD"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [
            "Content-Length",
            "Content-Type",
            "Content-Disposition"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

5. **Guardar cambios**

## ✅ Esto permitirá:
- Descargas directas desde el frontend
- Visualización de PDFs sin errores CORS
- Acceso desde cualquier origen 