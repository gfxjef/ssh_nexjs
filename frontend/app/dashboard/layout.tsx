// Dashboard layout component
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/app/dashboard/components/sidebar';
import Header from '@/app/dashboard/components/header';
import { PostsProvider } from './bienestar/context/PostsContext';
import { NotificationsProvider } from './bienestar/context/NotificationsContext';
import { PermissionsProvider } from '@/lib/permissions/PermissionsContext';
import { isAuthenticated, syncAuthToken } from '@/lib/auth-utils';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isAuthenticatedState, setIsAuthenticatedState] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    // Sincronizar tokens entre localStorage y cookies
    syncAuthToken();
    
    // Verificar autenticación usando las nuevas utilidades
    const authenticated = isAuthenticated();
    
    if (!authenticated) {
      // El middleware ya manejará la redirección con returnUrl
      // Solo mostramos loading hasta que el middleware redirija
      console.log('🔒 [DASHBOARD] No autenticado, esperando redirección del middleware...');
      setIsLoading(true);
      return;
    } else {
      setIsAuthenticatedState(true);
      setIsLoading(false);
      console.log('✅ [DASHBOARD] Usuario autenticado');
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#2e3954] border-t-[#d48b45] rounded-full animate-spin mb-4"></div>
          <p className="text-[#2e3954] font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticatedState) {
    return null; // El middleware manejará la redirección
  }

  return (
    <PermissionsProvider>
      <div className="flex h-screen bg-[#ffffff]">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-hidden bg-[#f8f7fa]">
          {/* Header */}
          <Header />
          
          {/* Page Content */}
          <main className="flex-1 overflow-auto p-4 md:p-6 bg-[#f8f7fa]">
            <NotificationsProvider>
              <PostsProvider>
                {children}
              </PostsProvider>
            </NotificationsProvider>
          </main>
        </div>
      </div>
    </PermissionsProvider>
  );
}
