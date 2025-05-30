/**
 * Utilidades para manejo de autenticación y redirección
 */

// Función para establecer cookie desde el cliente
export const setAuthCookie = (token: string, days: number = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  
  document.cookie = `auth-token=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; Secure=${window.location.protocol === 'https:'}`;
  
  console.log('🍪 [AUTH] Cookie establecida:', { token: token.substring(0, 20) + '...', expires });
};

// Función para eliminar cookie de autenticación
export const removeAuthCookie = () => {
  document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  console.log('🗑️ [AUTH] Cookie eliminada');
};

// Función para obtener cookie desde el cliente
export const getAuthCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  
  const name = 'auth-token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  
  for (let cookie of cookieArray) {
    cookie = cookie.trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  return null;
};

// Función para obtener URL de retorno desde query params
export const getReturnUrl = (searchParams?: URLSearchParams): string => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('returnUrl') || '/dashboard';
  }
  
  return searchParams?.get('returnUrl') || '/dashboard';
};

// Función para limpiar URL de retorno de query params
export const cleanReturnUrl = (url: string): string => {
  try {
    const urlObj = new URL(url, window.location.origin);
    urlObj.searchParams.delete('returnUrl');
    return urlObj.pathname + urlObj.search + urlObj.hash;
  } catch {
    return url;
  }
};

// Función para verificar si el usuario está autenticado
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('token');
  const cookie = getAuthCookie();
  
  return !!(token || cookie);
};

// Función para sincronizar token entre localStorage y cookies
export const syncAuthToken = () => {
  if (typeof window === 'undefined') return;
  
  const localToken = localStorage.getItem('token');
  const cookieToken = getAuthCookie();
  
  if (localToken && !cookieToken) {
    // Si hay token en localStorage pero no en cookie, establecer cookie
    setAuthCookie(localToken);
  } else if (!localToken && cookieToken) {
    // Si hay cookie pero no localStorage, establecer localStorage
    localStorage.setItem('token', cookieToken);
  }
};

// Función para logout completo
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  removeAuthCookie();
  
  console.log('👋 [AUTH] Logout completo realizado');
};

// Función para establecer autenticación completa
export const setAuthentication = (token: string, user: any) => {
  // Guardar en localStorage (para compatibilidad con código existente)
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  
  // Guardar en cookies (para middleware)
  setAuthCookie(token);
  
  console.log('✅ [AUTH] Autenticación establecida para:', user.usuario || user.email);
}; 