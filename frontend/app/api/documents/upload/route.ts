import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * API endpoint para subir archivos directamente a AWS S3
 * Formato de nombre: nombrearchivo_codigo.ext
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [UPLOAD] Starting file upload to S3...');
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const titulo = formData.get('titulo') as string;
    const descripcion = formData.get('descripcion') as string;
    const categoria_id = formData.get('categoria_id') as string;
    const etiquetas = formData.get('etiquetas') as string;
    const es_publico = formData.get('es_publico') === 'true';
    const autor = formData.get('autor') as string;
    const grupo = formData.get('grupo') as string || 'grupo_kossodo';

    if (!file) {
      return NextResponse.json({ error: 'No se encontró archivo' }, { status: 400 });
    }

    console.log(`📁 [UPLOAD] Processing file: ${file.name} (${file.size} bytes)`);

    // Validaciones básicas del archivo
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'El archivo es demasiado grande (máximo 50MB)' }, { status: 400 });
    }

    // Validar extensiones permitidas
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'zip', 'rar', '7z', 'mp4', 'avi', 'mov', 'wmv'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 });
    }

    // Generar código único
    const codigo = crypto.randomUUID();
    
    // Obtener extensión del archivo original
    const nombreSinExtension = file.name.replace(`.${extension}`, '');
    
    // IMPORTANTE: Reemplazar espacios y caracteres problemáticos con _ para URLs seguras
    const nombreLimpio = nombreSinExtension
      .replace(/\s+/g, '_')           // Espacios → _
      .replace(/[^\w\-_.]/g, '_')     // Caracteres especiales → _
      .replace(/_{2,}/g, '_');        // Múltiples _ → un solo _
    
    // Formato nuevo: nombrearchivo_codigo.ext (sin espacios ni caracteres especiales)
    const nuevoNombre = `${nombreLimpio}_${codigo}.${extension}`;
    
    console.log(`📝 [UPLOAD] New S3 filename format: ${nuevoNombre}`);

    // === SUBIR ARCHIVO A S3 ===
    try {
      // Configuración de S3
      const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
      const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
      const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
      const S3_REGION = process.env.S3_REGION || 'us-east-2';

      if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !S3_BUCKET_NAME) {
        console.error('❌ [S3] Missing S3 configuration environment variables');
        return NextResponse.json({ error: 'Configuración de S3 no disponible' }, { status: 500 });
      }

      // Convertir archivo a buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Preparar parámetros para S3
      const s3Key = `documentos/${nuevoNombre}`;
      
      // Crear firma para S3 (método simplificado usando fetch directo)
      const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
      const dateStamp = timestamp.substring(0, 8);
      const credentialScope = `${dateStamp}/${S3_REGION}/s3/aws4_request`;
      
      // Para simplificar, usar el método de presigned URL del backend
      console.log('📤 [S3] Requesting S3 upload from backend...');
      
      // Crear FormData para enviar al backend S3
      const s3FormData = new FormData();
      s3FormData.append('file', file);
      s3FormData.append('filename', nuevoNombre);
      s3FormData.append('folder', 'documentos');

      const authHeader = request.headers.get('Authorization') || '';
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      
      // Subir archivo a S3 a través del backend
      const s3Response = await fetch(`${backendUrl}/api/bienestar/documentos/api/documents/upload-file`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader
        },
        body: s3FormData
      });

      if (!s3Response.ok) {
        const s3Error = await s3Response.text();
        console.error('❌ [S3] Upload failed:', s3Error);
        return NextResponse.json({ error: 'Error al subir archivo a S3' }, { status: 500 });
      }

      const s3Result = await s3Response.json();
      const s3Url = s3Result.url;
      
      console.log(`✅ [S3] File uploaded successfully: ${s3Url}`);

      // === ENVIAR METADATOS AL BACKEND ===
      // Preparar datos para enviar al backend (con URL de S3)
      const documentData = {
        titulo,
        descripcion,
        categoria_id: parseInt(categoria_id),
        etiquetas: etiquetas ? etiquetas.split(',').map(id => parseInt(id)) : [],
        es_publico,
        autor,
        grupo,
        nombre_archivo: file.name, // Nombre original
        ruta_archivo: s3Url,       // URL de S3 completa
        tipo_mime: file.type,
        tamaño_archivo: file.size
      };

      console.log('📤 [UPLOAD] Sending metadata to backend...');
      console.log('📋 [UPLOAD] Document data:', JSON.stringify(documentData, null, 2));

      // Enviar metadata al backend con timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const backendResponse = await fetch(`${backendUrl}/api/bienestar/documentos/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(documentData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!backendResponse.ok) {
        const errorData = await backendResponse.text();
        console.error('❌ [UPLOAD] Backend error:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          error: errorData
        });
        
        // TODO: Eliminar archivo de S3 si el backend falla
        console.log('⚠️ [UPLOAD] File uploaded to S3 but backend failed. Consider cleanup.');
        
        let errorMessage = 'Error al guardar en la base de datos';
        if (backendResponse.status === 401) {
          errorMessage = 'Token de autorización inválido o expirado. Por favor, vuelve a iniciar sesión.';
        }
        
        return NextResponse.json(
          { error: errorMessage },
          { status: backendResponse.status }
        );
      }

      const resultado = await backendResponse.json();
      console.log('✅ [UPLOAD] Upload to S3 and backend completed successfully');

      return NextResponse.json({
        message: 'Archivo subido exitosamente a S3',
        file: {
          nombre_original: file.name,
          nombre_guardado: nuevoNombre,
          ruta: s3Url,
          tamaño: file.size,
          tipo: file.type,
          storage: 'S3'
        },
        documento: resultado
      });

    } catch (s3Error) {
      console.error('❌ [S3] Error uploading to S3:', s3Error);
      return NextResponse.json({ error: 'Error al subir archivo a S3' }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [UPLOAD] Error during upload:', error);
    
    // Identificar tipo de error específico
    let errorMessage = 'Error interno del servidor';
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout: La conexión tardó demasiado';
      } else if (error.message.includes('ECONNRESET')) {
        errorMessage = 'Error de conexión: El servidor cerró la conexión inesperadamente';
      } else if (error.message.includes('fetch failed')) {
        errorMessage = 'Error de red: No se pudo conectar con el servidor';
      } else {
        errorMessage = `Error: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Manejar OPTIONS para CORS
 */
export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 