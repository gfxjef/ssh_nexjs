'use client';

import React from 'react';
import { DocumentsProvider } from './context/DocumentsContext';

/**
 * Layout para las páginas de documentos
 * Mantiene consistencia con el patrón establecido en bienestar
 */
interface DocumentosLayoutProps {
  children: React.ReactNode;
}

export default function DocumentosLayout({ children }: DocumentosLayoutProps) {
  return (
    <DocumentsProvider>
      {children}
    </DocumentsProvider>
  );
} 