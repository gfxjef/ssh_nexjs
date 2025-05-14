'use client';

import React from 'react';
// import { PostsProvider } from './context/PostsContext'; // Eliminado
// import { NotificationsProvider } from './context/NotificationsContext'; // Eliminado

/**
 * Layout para las páginas de bienestar 
 * Asume que PostsProvider y NotificationsProvider son provistos por un layout ancestro.
 */
export default function BienestarLayout({ children }: { children: React.ReactNode }) {
  // Los providers ya no se colocan aquí, simplemente se renderiza children.
  // El contexto vendrá del DashboardLayout.
  return <>{children}</>;
} 