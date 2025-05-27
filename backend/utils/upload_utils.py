import os
import pathlib
from typing import Optional, Tuple
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class UploadType(Enum):
    """Tipos de upload permitidos"""
    POSTS = "posts"
    PDF = "pdf"
    DOCUMENTOS = "documentos"
    PROFILES = "profiles"
    TEMP = "temp"

class UploadManager:
    """Gestor centralizado para uploads de archivos"""
    
    # Ruta base para uploads - ahora centralizada en frontend
    BASE_UPLOAD_PATH = os.path.join("frontend", "public", "uploads")
    
    # Configuración por tipo de archivo
    UPLOAD_CONFIG = {
        UploadType.POSTS: {
            "max_size": 5 * 1024 * 1024,  # 5MB
            "allowed_extensions": {".jpg", ".jpeg", ".png", ".webp", ".gif"},
            "allowed_mimes": {"image/jpeg", "image/png", "image/webp", "image/gif"}
        },
        UploadType.PDF: {
            "max_size": 10 * 1024 * 1024,  # 10MB
            "allowed_extensions": {".pdf"},
            "allowed_mimes": {"application/pdf"}
        },
        UploadType.DOCUMENTOS: {
            "max_size": 15 * 1024 * 1024,  # 15MB
            "allowed_extensions": {".pdf", ".doc", ".docx", ".xls", ".xlsx"},
            "allowed_mimes": {
                "application/pdf", 
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        },
        UploadType.PROFILES: {
            "max_size": 2 * 1024 * 1024,  # 2MB
            "allowed_extensions": {".jpg", ".jpeg", ".png"},
            "allowed_mimes": {"image/jpeg", "image/png"}
        },
        UploadType.TEMP: {
            "max_size": 20 * 1024 * 1024,  # 20MB
            "allowed_extensions": {"*"},  # Cualquier extensión para temp
            "allowed_mimes": {"*"}  # Cualquier MIME para temp
        }
    }

    @classmethod
    def ensure_upload_directory(cls, upload_type: UploadType) -> str:
        """
        Asegura que la carpeta de upload existe, la crea si no existe
        
        Args:
            upload_type: Tipo de upload (posts, pdf, etc.)
            
        Returns:
            str: Ruta absoluta de la carpeta creada
            
        Raises:
            OSError: Si no se puede crear la carpeta
        """
        try:
            # Construir ruta completa
            upload_path = os.path.join(cls.BASE_UPLOAD_PATH, upload_type.value)
            
            # Crear directorio si no existe
            pathlib.Path(upload_path).mkdir(parents=True, exist_ok=True)
            
            # Verificar que se creó correctamente
            if not os.path.exists(upload_path):
                raise OSError(f"No se pudo crear la carpeta: {upload_path}")
            
            # Log para debugging
            logger.info(f"Carpeta de upload verificada/creada: {upload_path}")
            
            return os.path.abspath(upload_path)
            
        except Exception as e:
            logger.error(f"Error creando carpeta de upload {upload_type.value}: {str(e)}")
            raise OSError(f"Error creando carpeta de upload: {str(e)}")

    @classmethod
    def validate_file(cls, file_size: int, filename: str, mime_type: str, upload_type: UploadType) -> Tuple[bool, Optional[str]]:
        """
        Valida un archivo según las reglas del tipo de upload
        
        Args:
            file_size: Tamaño del archivo en bytes
            filename: Nombre del archivo
            mime_type: Tipo MIME del archivo
            upload_type: Tipo de upload
            
        Returns:
            Tuple[bool, Optional[str]]: (es_válido, mensaje_error)
        """
        config = cls.UPLOAD_CONFIG.get(upload_type)
        if not config:
            return False, f"Tipo de upload no válido: {upload_type}"
        
        # Validar tamaño
        if file_size > config["max_size"]:
            max_mb = config["max_size"] / (1024 * 1024)
            return False, f"Archivo muy grande. Máximo permitido: {max_mb:.1f}MB"
        
        # Validar extensión
        file_ext = pathlib.Path(filename).suffix.lower()
        allowed_extensions = config["allowed_extensions"]
        
        if "*" not in allowed_extensions and file_ext not in allowed_extensions:
            return False, f"Extensión no permitida. Permitidas: {', '.join(allowed_extensions)}"
        
        # Validar MIME type
        allowed_mimes = config["allowed_mimes"]
        if "*" not in allowed_mimes and mime_type not in allowed_mimes:
            return False, f"Tipo de archivo no permitido: {mime_type}"
        
        return True, None

    @classmethod
    def get_upload_path(cls, upload_type: UploadType, filename: str) -> str:
        """
        Obtiene la ruta completa donde guardar un archivo
        
        Args:
            upload_type: Tipo de upload
            filename: Nombre del archivo
            
        Returns:
            str: Ruta completa del archivo
        """
        # Asegurar que la carpeta existe
        upload_dir = cls.ensure_upload_directory(upload_type)
        
        # Sanitizar nombre de archivo
        safe_filename = cls.sanitize_filename(filename)
        
        return os.path.join(upload_dir, safe_filename)

    @classmethod
    def get_relative_path(cls, upload_type: UploadType, filename: str) -> str:
        """
        Obtiene la ruta relativa para usar en URLs
        
        Args:
            upload_type: Tipo de upload
            filename: Nombre del archivo
            
        Returns:
            str: Ruta relativa desde public/
        """
        safe_filename = cls.sanitize_filename(filename)
        return f"/uploads/{upload_type.value}/{safe_filename}"

    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """
        Sanitiza el nombre del archivo para evitar problemas de seguridad
        
        Args:
            filename: Nombre original del archivo
            
        Returns:
            str: Nombre sanitizado
        """
        # Remover caracteres peligrosos
        dangerous_chars = ['..', '/', '\\', ':', '*', '?', '"', '<', '>', '|']
        safe_name = filename
        
        for char in dangerous_chars:
            safe_name = safe_name.replace(char, '_')
        
        # Limitar longitud
        if len(safe_name) > 100:
            name_part = pathlib.Path(safe_name).stem[:50]
            ext_part = pathlib.Path(safe_name).suffix
            safe_name = f"{name_part}{ext_part}"
        
        return safe_name

    @classmethod
    def cleanup_temp_files(cls, max_age_hours: int = 24) -> int:
        """
        Limpia archivos temporales antiguos
        
        Args:
            max_age_hours: Edad máxima en horas
            
        Returns:
            int: Número de archivos eliminados
        """
        import time
        
        temp_path = os.path.join(cls.BASE_UPLOAD_PATH, UploadType.TEMP.value)
        if not os.path.exists(temp_path):
            return 0
        
        deleted_count = 0
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        try:
            for filename in os.listdir(temp_path):
                file_path = os.path.join(temp_path, filename)
                if os.path.isfile(file_path):
                    file_age = current_time - os.path.getmtime(file_path)
                    if file_age > max_age_seconds:
                        os.remove(file_path)
                        deleted_count += 1
                        logger.info(f"Archivo temporal eliminado: {filename}")
        except Exception as e:
            logger.error(f"Error limpiando archivos temporales: {str(e)}")
        
        return deleted_count 