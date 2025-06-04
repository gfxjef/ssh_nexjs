import os
import pathlib
from typing import Optional, Tuple
import logging
from enum import Enum
import boto3
from botocore.exceptions import ClientError, NoCredentialsError

logger = logging.getLogger(__name__)

class UploadType(Enum):
    """Tipos de upload permitidos"""
    POSTS = "posts"
    PDF = "pdf"
    DOCUMENTOS = "documentos"
    PROFILES = "profiles"
    TEMP = "temp"

class S3UploadManager:
    """Gestor centralizado para uploads de archivos usando AWS S3"""
    
    # Configuración por tipo de archivo
    UPLOAD_CONFIG = {
        UploadType.POSTS: {
            "max_size": 10 * 1024 * 1024,  # 10MB (Imágenes)
            "allowed_extensions": {".jpg", ".jpeg", ".png", ".webp", ".gif"},
            "allowed_mimes": {"image/jpeg", "image/png", "image/webp", "image/gif"}
        },
        UploadType.PDF: {
            "max_size": 30 * 1024 * 1024,  # 30MB (PDFs)
            "allowed_extensions": {".pdf"},
            "allowed_mimes": {"application/pdf"}
        },
        UploadType.DOCUMENTOS: {
            "max_size": 20 * 1024 * 1024,  # 20MB (Documentos e Imágenes)
            "allowed_extensions": {
                # Documentos
                ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".rtf",
                # Imágenes  
                ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".tiff", ".tif", ".ico"
            },
            "allowed_mimes": {
                # Documentos
                "application/pdf", 
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-powerpoint",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "text/plain",
                "application/rtf",
                # Imágenes
                "image/jpeg", "image/jpg", "image/png", "image/gif", "image/bmp", 
                "image/webp", "image/svg+xml", "image/tiff", "image/tif", "image/x-icon", "image/ico"
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

    def __init__(self):
        """Inicializar cliente S3"""
        try:
            self.s3_client = boto3.client('s3')
            self.bucket_name = os.environ.get('S3_BUCKET')
            
            if not self.bucket_name:
                raise ValueError("S3_BUCKET environment variable is required")
                
            logger.info(f"S3UploadManager inicializado con bucket: {self.bucket_name}")
            
        except NoCredentialsError:
            logger.error("AWS credentials not found")
            raise
        except Exception as e:
            logger.error(f"Error inicializando S3 client: {str(e)}")
            raise

    def validate_file(self, file_size: int, filename: str, mime_type: str, upload_type: UploadType) -> Tuple[bool, Optional[str]]:
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
        config = self.UPLOAD_CONFIG.get(upload_type)
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

    def upload_file(self, file_data, filename: str, upload_type: UploadType) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Sube un archivo a S3
        
        Args:
            file_data: Datos del archivo (bytes o file-like object)
            filename: Nombre del archivo
            upload_type: Tipo de upload
            
        Returns:
            Tuple[bool, Optional[str], Optional[str]]: (success, url, error_message)
        """
        try:
            # Sanitizar nombre de archivo
            safe_filename = self.sanitize_filename(filename)
            
            # Crear key S3 con estructura de carpetas
            s3_key = f"{upload_type.value}/{safe_filename}"
            
            # Subir archivo a S3
            self.s3_client.upload_fileobj(
                file_data,
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    'ContentType': self._get_content_type(safe_filename),
                    'CacheControl': 'max-age=31536000'  # Cache por 1 año
                }
            )
            
            # Generar URL pública
            url = f"https://{self.bucket_name}.s3.{os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')}.amazonaws.com/{s3_key}"
            
            logger.info(f"Archivo subido exitosamente a S3: {s3_key}")
            return True, url, None
            
        except ClientError as e:
            logger.error(f"Error subiendo archivo a S3: {str(e)}")
            return False, None, f"Error subiendo archivo: {str(e)}"
        except Exception as e:
            logger.error(f"Error inesperado subiendo archivo: {str(e)}")
            return False, None, f"Error inesperado: {str(e)}"

    def upload_file_with_custom_key(self, file_data, s3_key: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Sube un archivo a S3 usando un S3 key personalizado completo
        
        Args:
            file_data: Datos del archivo (bytes o file-like object)
            s3_key: Key S3 completo (incluyendo estructura de carpetas)
            
        Returns:
            Tuple[bool, Optional[str], Optional[str]]: (success, url, error_message)
        """
        try:
            # Usar el S3 key tal como se proporciona (sin agregar prefijos)
            # Subir archivo a S3
            self.s3_client.upload_fileobj(
                file_data,
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    'ContentType': self._get_content_type(s3_key),
                    'CacheControl': 'max-age=31536000'  # Cache por 1 año
                }
            )
            
            # Generar URL pública
            url = f"https://{self.bucket_name}.s3.{os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')}.amazonaws.com/{s3_key}"
            
            logger.info(f"Archivo subido exitosamente a S3 con key personalizado: {s3_key}")
            return True, url, None
            
        except ClientError as e:
            logger.error(f"Error subiendo archivo a S3: {str(e)}")
            return False, None, f"Error subiendo archivo: {str(e)}"
        except Exception as e:
            logger.error(f"Error inesperado subiendo archivo: {str(e)}")
            return False, None, f"Error inesperado: {str(e)}"

    def delete_file(self, file_url: str) -> bool:
        """
        Elimina un archivo de S3 basado en su URL
        
        Args:
            file_url: URL del archivo en S3
            
        Returns:
            bool: True si se eliminó exitosamente
        """
        try:
            # Extraer key S3 de la URL
            s3_key = self._extract_s3_key_from_url(file_url)
            if not s3_key:
                logger.error(f"No se pudo extraer key S3 de la URL: {file_url}")
                return False
            
            # Eliminar archivo de S3
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            
            logger.info(f"Archivo eliminado de S3: {s3_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Error eliminando archivo de S3: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Error inesperado eliminando archivo: {str(e)}")
            return False

    def _extract_s3_key_from_url(self, url: str) -> Optional[str]:
        """Extrae la key S3 de una URL"""
        try:
            # URL formato: https://bucket.s3.region.amazonaws.com/key
            if f"{self.bucket_name}.s3." in url:
                return url.split(f"{self.bucket_name}.s3.{os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')}.amazonaws.com/")[1]
            return None
        except:
            return None

    def _get_content_type(self, filename: str) -> str:
        """Determina el Content-Type basado en la extensión del archivo"""
        ext = pathlib.Path(filename).suffix.lower()
        content_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
        return content_types.get(ext, 'application/octet-stream')

    def sanitize_filename(self, filename: str) -> str:
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

# Instancia global del manager
upload_manager = S3UploadManager()

# Mantener compatibilidad con código existente
class UploadManager:
    """Clase de compatibilidad que redirige al S3UploadManager"""
    
    @classmethod
    def validate_file(cls, file_size: int, filename: str, mime_type: str, upload_type: UploadType) -> Tuple[bool, Optional[str]]:
        return upload_manager.validate_file(file_size, filename, mime_type, upload_type)
    
    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        return upload_manager.sanitize_filename(filename)
    
    @classmethod
    def upload_file(cls, file_data, filename: str, upload_type: UploadType) -> Tuple[bool, Optional[str], Optional[str]]:
        return upload_manager.upload_file(file_data, filename, upload_type)
    
    @classmethod
    def delete_file(cls, file_url: str) -> bool:
        return upload_manager.delete_file(file_url)
    
    # Métodos legacy para mantener compatibilidad (deprecated)
    @classmethod
    def ensure_upload_directory(cls, upload_type: UploadType) -> str:
        """Método legacy - ya no se usa con S3"""
        logger.warning("ensure_upload_directory está deprecated con S3")
        return f"s3://{upload_manager.bucket_name}/{upload_type.value}/"
    
    @classmethod
    def get_upload_path(cls, upload_type: UploadType, filename: str) -> str:
        """Método legacy - ya no se usa con S3"""
        logger.warning("get_upload_path está deprecated con S3")
        safe_filename = upload_manager.sanitize_filename(filename)
        return f"s3://{upload_manager.bucket_name}/{upload_type.value}/{safe_filename}"
    
    @classmethod
    def get_relative_path(cls, upload_type: UploadType, filename: str) -> str:
        """Método legacy - devuelve URL de S3"""
        safe_filename = upload_manager.sanitize_filename(filename)
        return f"https://{upload_manager.bucket_name}.s3.{os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')}.amazonaws.com/{upload_type.value}/{safe_filename}"

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