import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

/**
 * API endpoint para subir archivos directamente al frontend (public/uploads)
 * Formato de nombre: nombrearchivo_codigo.ext
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [UPLOAD] Starting file upload to frontend...');
    
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

    // Generar código único
    const codigo = crypto.randomUUID();
    
    // Obtener extensión del archivo original
    const extension = file.name.split('.').pop() || '';
    const nombreSinExtension = file.name.replace(`.${extension}`, '');
    
    // IMPORTANTE: Reemplazar espacios y caracteres problemáticos con _ para URLs seguras
    const nombreLimpio = nombreSinExtension
      .replace(/\s+/g, '_')           // Espacios → _
      .replace(/[^\w\-_.]/g, '_')     // Caracteres especiales → _
      .replace(/_{2,}/g, '_');        // Múltiples _ → un solo _
    
    // Formato nuevo: nombrearchivo_codigo.ext (sin espacios ni caracteres especiales)
    const nuevoNombre = `${nombreLimpio}_${codigo}.${extension}`;
    
    console.log(`📝 [UPLOAD] New filename format: ${nuevoNombre}`);

    // Crear carpeta si no existe
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Convertir archivo a buffer y guardarlo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = join(uploadsDir, nuevoNombre);
    
    await writeFile(filePath, buffer);
    console.log(`✅ [UPLOAD] File saved locally: ${filePath}`);

    // Preparar datos para enviar al backend (solo metadata)
    const documentData = {
      titulo,
      descripcion,
      categoria_id: parseInt(categoria_id),
      etiquetas: etiquetas ? etiquetas.split(',').map(id => parseInt(id)) : [],
      es_publico,
      autor,
      grupo, // Grupo enviado desde el frontend
      nombre_archivo: file.name, // Nombre original
      ruta_archivo: `uploads/${nuevoNombre}`, // Ruta relativa desde public
      tipo_mime: file.type,
      tamaño_archivo: file.size
    };

    console.log('📤 [UPLOAD] Sending metadata to backend...');
    
    const authHeader = request.headers.get('Authorization') || '';
    console.log('🔑 [UPLOAD] Auth header:', authHeader ? `Present (${authHeader.substring(0, 20)}...)` : 'Missing');
    console.log('📋 [UPLOAD] Document data:', JSON.stringify(documentData, null, 2));

    // Enviar metadata al backend con timeout y mejor manejo de errores
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
    
    const backendResponse = await fetch('http://localhost:3001/api/bienestar/documentos/upload', {
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
      
      // Mantener archivo si es error de autorización (puede resolverse re-logueando)
      if (backendResponse.status !== 401) {
        try {
          const fs = await import('fs/promises');
          await fs.unlink(filePath);
          console.log('🗑️ [UPLOAD] Cleaned up local file due to backend error');
        } catch (cleanupError) {
          console.error('❌ [UPLOAD] Error cleaning up file:', cleanupError);
        }
      } else {
        console.log('🔄 [UPLOAD] File preserved due to auth error - user may re-login');
      }
      
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
    console.log('✅ [UPLOAD] Upload completed successfully');

    return NextResponse.json({
      message: 'Archivo subido exitosamente',
      file: {
        nombre_original: file.name,
        nombre_guardado: nuevoNombre,
        ruta: `uploads/${nuevoNombre}`,
        tamaño: file.size,
        tipo: file.type
      },
      documento: resultado
    });

  } catch (error) {
    console.error('❌ [UPLOAD] Error during upload:', error);
    
    // Identificar tipo de error específico
    let errorMessage = 'Error interno del servidor';
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout: La conexión con el backend tardó demasiado';
      } else if (error.message.includes('ECONNRESET')) {
        errorMessage = 'Error de conexión: El backend cerró la conexión inesperadamente';
      } else if (error.message.includes('fetch failed')) {
        errorMessage = 'Error de red: No se pudo conectar con el backend';
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