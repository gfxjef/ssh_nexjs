'use client';

import React from 'react';
import { PostsProvider } from './context/PostsContext';
import { NotificationsProvider } from './context/NotificationsContext';

/**
 * Layout para las páginas de bienestar 
 * Proporciona el contexto para la gestión de posts y notificaciones
 */
export default function BienestarLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationsProvider>
      <PostsProvider>
        {children}
      </PostsProvider>
    </NotificationsProvider>
  );
} 