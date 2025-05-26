import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint de debugging para verificar token de autorización
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    
    console.log('🔍 [DEBUG] Auth check requested');
    console.log('🔑 [DEBUG] Auth header:', authHeader ? `Present (${authHeader.substring(0, 30)}...)` : 'Missing');
    
    if (!authHeader) {
      return NextResponse.json({
        hasToken: false,
        message: 'No authorization header found'
      });
    }
    
    // Probar token con el backend
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      const backendResponse = await fetch(`${backendUrl}/api/bienestar/documentos/categorias`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        }
      });
      
      const isValid = backendResponse.ok;
      console.log('🔍 [DEBUG] Token validation result:', isValid ? 'Valid' : 'Invalid');
      
      return NextResponse.json({
        hasToken: true,
        isValid,
        status: backendResponse.status,
        statusText: backendResponse.statusText
      });
      
    } catch (error) {
      console.error('🔍 [DEBUG] Error testing token:', error);
      return NextResponse.json({
        hasToken: true,
        isValid: false,
        error: 'Could not reach backend'
      });
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Error in auth check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 