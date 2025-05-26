import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Endpoint para servir archivos estáticos desde public/uploads
 * Maneja rutas como /api/uploads/image-123.jpg
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await params para obtener los parámetros
    const resolvedParams = await params;
    
    // Construir la ruta del archivo
    const filePath = resolvedParams.path.join('/');
    const fullPath = join(process.cwd(), 'public', 'uploads', filePath);
    
    console.log(`📁 [STATIC] Serving file: ${filePath}`);
    console.log(`📁 [STATIC] Full path: ${fullPath}`);
    
    // Verificar que el archivo existe
    if (!existsSync(fullPath)) {
      console.log(`❌ [STATIC] File not found: ${fullPath}`);
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }
    
    // Leer el archivo
    const fileBuffer = await readFile(fullPath);
    
    // Determinar el tipo MIME basado en la extensión
    const extension = filePath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'svg':
        contentType = 'image/svg+xml';
        break;
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'txt':
        contentType = 'text/plain';
        break;
      case 'json':
        contentType = 'application/json';
        break;
    }
    
    console.log(`✅ [STATIC] Serving ${filePath} as ${contentType}`);
    
    // Retornar el archivo con headers apropiados
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache por 1 año
        'Content-Disposition': `inline; filename="${filePath.split('/').pop()}"`,
      },
    });
    
  } catch (error) {
    console.error('❌ [STATIC] Error serving file:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 