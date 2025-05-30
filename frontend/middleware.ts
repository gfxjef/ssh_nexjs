import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Rutas que requieren autenticación
  const protectedRoutes = ['/dashboard'];
  
  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/login', '/', '/test-redirect'];
  
  // Verificar si la ruta actual está protegida
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route));
  
  console.log(`🛣️ [MIDDLEWARE] Procesando ruta: ${pathname}, Protegida: ${isProtectedRoute}, Pública: ${isPublicRoute}`);
  
  if (isProtectedRoute) {
    // Verificar token en cookies (más seguro que localStorage en middleware)
    const token = request.cookies.get('auth-token')?.value;
    
    console.log(`🔐 [MIDDLEWARE] Token presente: ${!!token}`);
    
    if (!token) {
      // Guardar la URL actual para redirección después del login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname + request.nextUrl.search);
      
      console.log(`🔒 [MIDDLEWARE] Redirigiendo a login desde: ${pathname} → ${loginUrl.toString()}`);
      return NextResponse.redirect(loginUrl);
    }
    
    console.log(`✅ [MIDDLEWARE] Acceso autorizado a: ${pathname}`);
  }
  
  // Si está en login y ya tiene token, redirigir al dashboard o returnUrl
  if (pathname === '/login') {
    const token = request.cookies.get('auth-token')?.value;
    if (token) {
      const returnUrl = request.nextUrl.searchParams.get('returnUrl');
      let redirectUrl = '/dashboard';
      
      if (returnUrl && returnUrl !== '/login' && !returnUrl.startsWith('/login')) {
        // Validar que la returnUrl sea una ruta interna y segura
        try {
          const url = new URL(returnUrl, request.url);
          if (url.origin === request.nextUrl.origin) {
            redirectUrl = returnUrl;
          }
        } catch {
          // Si la URL no es válida, usar dashboard por defecto
          console.warn(`⚠️ [MIDDLEWARE] returnUrl inválida: ${returnUrl}`);
        }
      }
      
      console.log(`✅ [MIDDLEWARE] Ya autenticado, redirigiendo de login a: ${redirectUrl}`);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Incluir todas las rutas del dashboard y login
    '/dashboard/:path*',
    '/login',
    // Excluir archivos estáticos y APIs
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}; 