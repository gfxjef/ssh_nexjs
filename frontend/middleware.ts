import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Rutas que requieren autenticación
  const protectedRoutes = ['/dashboard'];
  
  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/login', '/', '/test-login'];
  
  // Verificar si la ruta actual está protegida
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route));
  
  // Obtener token de cookies
  const token = request.cookies.get('auth-token')?.value;
  const allCookies = request.cookies.getAll();
  
  console.log(`🛣️ [MIDDLEWARE] Procesando ruta: ${pathname}`);
  console.log(`🔐 [MIDDLEWARE] Token presente: ${!!token}, Protegida: ${isProtectedRoute}, Pública: ${isPublicRoute}`);
  console.log(`🍪 [MIDDLEWARE] Cookies disponibles:`, allCookies.map(c => c.name));
  
  if (isProtectedRoute) {
    if (!token) {
      // Guardar la URL actual para redirección después del login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname + request.nextUrl.search);
      
      console.log(`🔒 [MIDDLEWARE] Sin token - Redirigiendo a login desde: ${pathname} → ${loginUrl.toString()}`);
      return NextResponse.redirect(loginUrl);
    }
    
    console.log(`✅ [MIDDLEWARE] Acceso autorizado a: ${pathname} (token: ${token.substring(0, 20)}...)`);
  }
  
  // Si está en login y ya tiene token, redirigir al dashboard o returnUrl
  if (pathname === '/login') {
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
      
      console.log(`✅ [MIDDLEWARE] Ya autenticado en /login, redirigiendo a: ${redirectUrl}`);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    } else {
      console.log(`ℹ️ [MIDDLEWARE] En /login sin token - permitiendo acceso`);
    }
  }
  
  console.log(`➡️ [MIDDLEWARE] Continuando normalmente a: ${pathname}`);
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