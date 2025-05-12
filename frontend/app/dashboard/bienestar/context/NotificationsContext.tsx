'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Notification, NotificationsContextType } from '../../../../lib/bienestar/types';

// Crear contexto con valor inicial
const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// Función para generar un ID único para cada notificación
const generateId = (): string => `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Proveedor del contexto de notificaciones
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Función para mostrar una notificación
  const showNotification = useCallback((message: string, type: Notification['type'] = 'info', duration = 5000) => {
    const newNotification: Notification = {
      id: generateId(),
      message,
      type,
      duration
    };
    
    setNotifications(prevNotifications => [...prevNotifications, newNotification]);
    
    // Auto-eliminar después del tiempo especificado
    if (duration > 0) {
      setTimeout(() => {
        hideNotification(newNotification.id);
      }, duration);
    }
  }, []);
  
  // Función para ocultar una notificación específica
  const hideNotification = useCallback((id: string) => {
    setNotifications(prevNotifications => 
      prevNotifications.filter(notification => notification.id !== id)
    );
  }, []);
  
  // Función para limpiar todas las notificaciones
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);
  
  // Limpiar notificaciones al desmontar el componente
  useEffect(() => {
    return () => {
      setNotifications([]);
    };
  }, []);
  
  const value = {
    notifications,
    showNotification,
    hideNotification,
    clearAllNotifications
  };
  
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

/**
 * Hook personalizado para usar el contexto de notificaciones
 */
export function useNotifications() {
  const context = useContext(NotificationsContext);
  
  if (context === undefined) {
    throw new Error('useNotifications debe usarse dentro de un NotificationsProvider');
  }
  
  return context;
} 