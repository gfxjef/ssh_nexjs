export enum UploadType {
  POSTS = 'posts',
  PDF = 'pdf',
  DOCUMENTOS = 'documentos',
  PROFILES = 'profiles',
  TEMP = 'temp',
}

export interface UploadConfig {
  maxSize: number;
  allowedExtensions: string[];
  allowedMimes: string[];
  multiple?: boolean;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Configuración de upload por tipo
 */
export const UPLOAD_CONFIG: Record<UploadType, UploadConfig> = {
  [UploadType.POSTS]: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    multiple: true,
  },
  [UploadType.PDF]: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['.pdf'],
    allowedMimes: ['application/pdf'],
    multiple: false,
  },
  [UploadType.DOCUMENTOS]: {
    maxSize: 15 * 1024 * 1024, // 15MB
    allowedExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
    allowedMimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    multiple: true,
  },
  [UploadType.PROFILES]: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedExtensions: ['.jpg', '.jpeg', '.png'],
    allowedMimes: ['image/jpeg', 'image/png'],
    multiple: false,
  },
  [UploadType.TEMP]: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedExtensions: ['*'],
    allowedMimes: ['*'],
    multiple: true,
  },
};

/**
 * Valida un archivo antes de subirlo
 */
export function validateFile(file: File, uploadType: UploadType): ValidationResult {
  const config = UPLOAD_CONFIG[uploadType];
  
  if (!config) {
    return { isValid: false, error: `Tipo de upload no válido: ${uploadType}` };
  }

  // Validar tamaño
  if (file.size > config.maxSize) {
    const maxMB = (config.maxSize / (1024 * 1024)).toFixed(1);
    return { isValid: false, error: `Archivo muy grande. Máximo permitido: ${maxMB}MB` };
  }

  // Validar extensión
  const fileExt = getFileExtension(file.name).toLowerCase();
  if (!config.allowedExtensions.includes('*') && !config.allowedExtensions.includes(fileExt)) {
    return { 
      isValid: false, 
      error: `Extensión no permitida. Permitidas: ${config.allowedExtensions.join(', ')}` 
    };
  }

  // Validar MIME type
  if (!config.allowedMimes.includes('*') && !config.allowedMimes.includes(file.type)) {
    return { 
      isValid: false, 
      error: `Tipo de archivo no permitido: ${file.type}` 
    };
  }

  return { isValid: true };
}

/**
 * Valida múltiples archivos
 */
export function validateFiles(files: FileList | File[], uploadType: UploadType): ValidationResult {
  const config = UPLOAD_CONFIG[uploadType];
  
  if (!config.multiple && files.length > 1) {
    return { isValid: false, error: 'Solo se permite un archivo para este tipo de upload' };
  }

  for (let i = 0; i < files.length; i++) {
    const file = files instanceof FileList ? files[i] : files[i];
    const validation = validateFile(file, uploadType);
    if (!validation.isValid) {
      return { isValid: false, error: `Archivo ${file.name}: ${validation.error}` };
    }
  }

  return { isValid: true };
}

/**
 * Obtiene la extensión de un archivo
 */
export function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.'));
}

/**
 * Sanitiza el nombre del archivo
 */
export function sanitizeFilename(filename: string): string {
  // Remover caracteres peligrosos
  const dangerousChars = ['..', '/', '\\', ':', '*', '?', '"', '<', '>', '|'];
  let safeName = filename;
  
  dangerousChars.forEach(char => {
    safeName = safeName.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '_');
  });
  
  // Limitar longitud
  if (safeName.length > 100) {
    const extension = getFileExtension(safeName);
    const nameWithoutExt = safeName.slice(0, safeName.lastIndexOf('.'));
    safeName = nameWithoutExt.slice(0, 50) + extension;
  }
  
  return safeName;
}

/**
 * Obtiene la URL relativa para un archivo
 */
export function getUploadUrl(uploadType: UploadType, filename: string): string {
  const safeName = sanitizeFilename(filename);
  return `/uploads/${uploadType}/${safeName}`;
}

/**
 * Sube un archivo al servidor
 */
export async function uploadFile(
  file: File, 
  uploadType: UploadType,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Validar archivo
    const validation = validateFile(file, uploadType);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Crear FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', uploadType);

    // Configurar XMLHttpRequest para tracking de progreso
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      // Tracking de progreso
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }

      // Manejar respuesta
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              success: true,
              url: response.url,
              filename: response.filename,
            });
          } catch (e) {
            resolve({ success: false, error: 'Error parseando respuesta del servidor' });
          }
        } else {
          resolve({ success: false, error: `Error del servidor: ${xhr.status}` });
        }
      });

      // Manejar errores
      xhr.addEventListener('error', () => {
        resolve({ success: false, error: 'Error de conexión' });
      });

      // Realizar petición
      xhr.open('POST', `/api/upload/${uploadType}`);
      xhr.send(formData);
    });

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Sube múltiples archivos
 */
export async function uploadFiles(
  files: FileList | File[],
  uploadType: UploadType,
  onProgress?: (progress: number) => void,
  onFileProgress?: (fileIndex: number, progress: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  const fileArray = Array.from(files);
  
  // Validar todos los archivos primero
  const validation = validateFiles(files, uploadType);
  if (!validation.isValid) {
    return fileArray.map(() => ({ success: false, error: validation.error }));
  }

  let totalProgress = 0;
  
  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    
    const result = await uploadFile(file, uploadType, (fileProgress) => {
      if (onFileProgress) {
        onFileProgress(i, fileProgress);
      }
      
      if (onProgress) {
        const currentFileWeight = 1 / fileArray.length;
        const currentTotalProgress = (i / fileArray.length) * 100 + (fileProgress * currentFileWeight);
        onProgress(Math.min(currentTotalProgress, 100));
      }
    });
    
    results.push(result);
    totalProgress = ((i + 1) / fileArray.length) * 100;
    
    if (onProgress) {
      onProgress(totalProgress);
    }
  }
  
  return results;
}

/**
 * Genera un preview de imagen
 */
export function generateImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = () => {
      reject(new Error('Error leyendo el archivo'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Formatea el tamaño del archivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 