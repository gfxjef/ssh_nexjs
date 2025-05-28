# Configuración de S3 para acceso público

## 🚨 URGENTE: Configurar permisos S3

### Paso 1: Bloqueo de acceso público del bucket
1. Ve a **AWS S3 Console** → Tu bucket `redkossodo`
2. Ve a **Permisos** → **Bloquear acceso público**
3. **DESACTIVAR** estas opciones:
   - ✅ Bloquear acceso público ACL
   - ✅ Ignorar ACL públicas  
   - ✅ Bloquear acceso público mediante políticas
   - ✅ Bloquear acceso público y entre cuentas

### Paso 2: Aplicar política del bucket
1. Ve a **Permisos** → **Política del bucket**
2. Pega esta política (reemplaza con tu bucket):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::redkossodo/*"
    }
  ]
}
```

### Paso 3: Verificar archivos individuales
1. Ve a los archivos específicos en S3
2. Para cada archivo, ve a **Permisos** → **Lista de control de acceso (ACL)**
3. Otorgar permisos de **Lectura** a **Todos (acceso público)**

### Paso 4: Test de acceso
Prueba acceder directamente a esta URL en tu navegador:
```
https://redkossodo.s3.us-east-2.amazonaws.com/pdf/2/thumbnail.webp
```

Si aún da "Access Denied", el problema es de configuración AWS.

## ⚡ Alternativa temporal (Solo desarrollo)

Si no puedes configurar S3 inmediatamente, puedes usar el endpoint de fallback:
```
GET /api/pdfs/processed_files/[ruta-archivo]
```

Este endpoint redirige a S3 o sirve un placeholder si S3 no está disponible.

## 🔍 Verificar configuración actual

Ejecuta este comando para verificar que las variables de entorno estén correctas:

```bash
# En Render, verificar variables de entorno:
# AWS_ACCESS_KEY_ID
# AWS_SECRET_ACCESS_KEY  
# AWS_REGION=us-east-2
# AWS_BUCKET_NAME=redkossodo
``` 