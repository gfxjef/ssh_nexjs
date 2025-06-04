/**
 * Tipos para el sistema de gestión de documentos
 */

export interface DocumentCategory {
  id: number;
  nombre: string;
  descripcion: string;
  color: string;
  icono: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentTag {
  id: number;
  nombre: string;
  color: string;
  descripcion?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentGroup {
  id: 'kossodo' | 'kossomet' | 'grupo_kossodo';
  nombre: string;
  icono: string;
  color: string;
  descripcion: string;
  total_documentos?: number;
}

export interface Document {
  id: number;
  titulo: string;
  descripcion?: string;
  nombre_archivo: string;
  ruta_archivo: string;
  tamaño_archivo: number;
  tipo_mime: string;
  categoria_id: number;
  categoria?: DocumentCategory;
  categoria_nombre?: string; // Nombre de la categoría directamente del backend
  categoria_color?: string; // Color de la categoría del backend
  categoria_icono?: string; // Icono de la categoría del backend
  subido_por: number;
  autor?: string;
  descargas: number;
  es_publico: boolean;
  estado: 'activo' | 'inactivo' | 'archivado' | 'eliminado';
  grupo?: 'kossodo' | 'kossomet' | 'grupo_kossodo';
  etiquetas: DocumentTag[];
  created_at: string;
  updated_at: string;
}

export interface DocumentFilters {
  search?: string;
  category?: string | number;
  tags?: number[];
  grupo?: 'kossodo' | 'kossomet' | 'grupo_kossodo';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface DocumentStats {
  total_documentos: number;
  total_categorias: number;
  total_etiquetas: number;
  total_descargas: number;
  documentos_por_categoria: Array<{
    categoria: string;
    total: number;
    color: string;
  }>;
  documentos_por_mes: Array<{
    mes: string;
    total: number;
  }>;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface FileValidationResult {
  valid: boolean;
  safe: boolean;
  errors: string[];
  warnings: string[];
  file_info: {
    detected_mime: string;
    declared_mime?: string;
    size: number;
    sanitized_filename: string;
  };
}

export type DocumentView = 'grid' | 'list' | 'table';
export type SortField = 'titulo' | 'created_at' | 'descargas' | 'tamaño_archivo';
export type SortOrder = 'asc' | 'desc'; 