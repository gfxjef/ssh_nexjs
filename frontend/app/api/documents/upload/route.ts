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

    // === ENVIAR ARCHIVO Y METADATOS AL BACKEND S3 ===
    try {
      const authHeader = request.headers.get('Authorization') || '';
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      
      // Crear FormData para enviar al backend S3 (archivo + metadatos en una sola llamada)
      const s3FormData = new FormData();
      s3FormData.append('file', file);
      s3FormData.append('titulo', titulo);
      s3FormData.append('descripcion', descripcion);
      s3FormData.append('categoria_id', categoria_id);
      s3FormData.append('etiquetas', etiquetas);
      s3FormData.append('es_publico', es_publico.toString());
      s3FormData.append('autor', autor);
      s3FormData.append('grupo', grupo);

      console.log('📤 [S3] Uploading file and metadata to S3 backend...');
      
      // Subir archivo a S3 a través del backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos para archivos grandes
      
      const backendResponse = await fetch(`${backendUrl}/api/bienestar/documentos/api/documents/create-with-file`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader
        },
        body: s3FormData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!backendResponse.ok) {
        const errorData = await backendResponse.text();
        console.error('❌ [UPLOAD] Backend S3 error:', {
          status: backendResponse.status,
          statusText: backendResponse.statusText,
          error: errorData
        });
        
        let errorMessage = 'Error al subir archivo a S3';
        if (backendResponse.status === 401) {
          errorMessage = 'Token de autorización inválido o expirado. Por favor, vuelve a iniciar sesión.';
        }
        
        return NextResponse.json(
          { error: errorMessage },
          { status: backendResponse.status }
        );
      }

      const resultado = await backendResponse.json();
      console.log('✅ [UPLOAD] Upload to S3 completed successfully:', resultado);

      return NextResponse.json({
        message: 'Archivo subido exitosamente a S3',
        file: {
          nombre_original: file.name,
          nombre_guardado: nuevoNombre,
          ruta: resultado.url || resultado.ruta_archivo,
          tamaño: file.size,
          tipo: file.type,
          storage: 'S3'
        },
        documento: resultado
      });

    } catch (s3Error) {
      console.error('❌ [S3] Error uploading to S3:', s3Error);
      
      let errorMessage = 'Error al subir archivo a S3';
      if (s3Error instanceof Error) {
        if (s3Error.name === 'AbortError') {
          errorMessage = 'Timeout: La subida tardó demasiado (máximo 60 segundos)';
        } else if (s3Error.message.includes('fetch failed')) {
          errorMessage = 'Error de conexión con el servidor S3';
        }
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 500 });
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