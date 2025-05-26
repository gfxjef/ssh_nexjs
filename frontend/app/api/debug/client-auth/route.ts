import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint que simula una llamada del cliente para debuggear auth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;
    
    console.log('🔍 [DEBUG] Client auth test requested');
    console.log('🔑 [DEBUG] Received token:', token ? `Present (${token.substring(0, 30)}...)` : 'Missing');
    
    if (!token) {
      return NextResponse.json({
        hasToken: false,
        message: 'No token provided from client'
      });
    }
    
    // Probar token con el backend
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      const backendResponse = await fetch(`${backendUrl}/api/bienestar/documentos/categorias`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const isValid = backendResponse.ok;
      console.log('🔍 [DEBUG] Token validation result:', isValid ? 'Valid' : 'Invalid');
      
      if (!isValid) {
        const errorText = await backendResponse.text();
        console.log('🔍 [DEBUG] Backend error response:', errorText);
      }
      
      return NextResponse.json({
        hasToken: true,
        isValid,
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        tokenPreview: token.substring(0, 30) + '...'
      });
      
    } catch (error) {
      console.error('🔍 [DEBUG] Error testing token:', error);
      return NextResponse.json({
        hasToken: true,
        isValid: false,
        error: 'Could not reach backend',
        tokenPreview: token.substring(0, 30) + '...'
      });
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Error in client auth check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 