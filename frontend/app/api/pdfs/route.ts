import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pdf = searchParams.get('pdf');
    
    // Si hay un parámetro PDF, redirigir al visor específico
    if (pdf) {
      const backendUrl = `${BACKEND_BASE_URL}/api/pdfs/?pdf=${encodeURIComponent(pdf)}`;
      return NextResponse.redirect(backendUrl);
    }
    
    // Si no hay parámetro PDF, redirigir al catálogo general
    const catalogoUrl = `${BACKEND_BASE_URL}/api/pdfs/catalogo`;
    return NextResponse.redirect(catalogoUrl);
    
  } catch (error) {
    console.error('Error en redirección de PDFs:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 