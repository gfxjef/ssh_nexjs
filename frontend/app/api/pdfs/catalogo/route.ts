import { NextResponse } from 'next/server';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const catalogoUrl = `${BACKEND_BASE_URL}/api/pdfs/catalogo`;
    return NextResponse.redirect(catalogoUrl);
  } catch (error) {
    console.error('Error en redirección al catálogo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 