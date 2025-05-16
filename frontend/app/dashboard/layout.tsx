// Dashboard layout component
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/app/dashboard/components/sidebar';
import Header from '@/app/dashboard/components/header';
import { PostsProvider } from './bienestar/context/PostsContext';
import { NotificationsProvider } from './bienestar/context/NotificationsContext';
import { PermissionsProvider } from '@/lib/permissions/PermissionsContext';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
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

  if (!isAuthenticated) {
    return null; // Will redirect to login in useEffect
  }

  return (
    <PermissionsProvider>
      <div className="flex h-screen bg-[#f8f9fa]">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <Header />
          
          {/* Page Content */}
          <main className="flex-1 overflow-auto p-4 md:p-6 bg-[#f8f9fa]">
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
