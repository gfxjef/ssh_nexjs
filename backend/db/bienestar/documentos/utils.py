"""
Utilidades para el módulo de documentos.
Contiene funciones auxiliares para manejo de archivos, validaciones y operaciones comunes.
"""

import os
import uuid
import mimetypes
import hashlib
import re
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import secrets

# Desactivar python-magic temporalmente debido a problemas de DLL en Windows
# TODO: Reactivar cuando se resuelvan los problemas de configuración
magic = None
MAGIC_AVAILABLE = False


class FileValidator:
    """
    Clase para validar archivos antes de la subida.
    """
    
    # Tipos MIME permitidos por categoría
    ALLOWED_MIME_TYPES = {
        'documents': [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv',
            'application/rtf'
        ],
        'images': [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/bmp',
            'image/webp',
            'image/svg+xml'
        ],
        'archives': [
            'application/zip',
            'application/x-rar-compressed',
            'application/x-7z-compressed',
            'application/gzip',
            'application/x-tar'
        ],
        'audio': [
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'audio/mp4'
        ],
        'video': [
            'video/mp4',
            'video/mpeg',
            'video/quicktime',
            'video/x-msvideo'
        ]
    }
    
    # Tamaños máximos por tipo (en bytes)
    MAX_FILE_SIZES = {
        'documents': 50 * 1024 * 1024,  # 50MB
        'images': 10 * 1024 * 1024,     # 10MB
        'archives': 100 * 1024 * 1024,  # 100MB
        'audio': 50 * 1024 * 1024,      # 50MB
        'video': 200 * 1024 * 1024      # 200MB
    }
    
    @classmethod
    def get_file_category(cls, mime_type: str) -> Optional[str]:
        """
        Determina la categoría de un archivo basado en su tipo MIME.
        
        Args:
            mime_type (str): Tipo MIME del archivo
            
        Returns:
            Optional[str]: Categoría del archivo o None si no es válido
        """
        for category, mime_types in cls.ALLOWED_MIME_TYPES.items():
            if mime_type in mime_types:
                return category
        return None
    
    @classmethod
    def is_valid_mime_type(cls, mime_type: str) -> bool:
        """
        Verifica si el tipo MIME es válido.
        
        Args:
            mime_type (str): Tipo MIME a validar
            
        Returns:
            bool: True si es válido
        """
        return cls.get_file_category(mime_type) is not None
    
    @classmethod
    def is_valid_file_size(cls, file_size: int, mime_type: str) -> bool:
        """
        Verifica si el tamaño del archivo es válido.
        
        Args:
            file_size (int): Tamaño del archivo en bytes
            mime_type (str): Tipo MIME del archivo
            
        Returns:
            bool: True si el tamaño es válido
        """
        category = cls.get_file_category(mime_type)
        if not category:
            return False
        
        max_size = cls.MAX_FILE_SIZES.get(category, 10 * 1024 * 1024)  # Default 10MB
        return file_size <= max_size
    
    @classmethod
    def validate_file(cls, file_size: int, mime_type: str, filename: str) -> Dict[str, any]:
        """
        Valida un archivo completamente.
        
        Args:
            file_size (int): Tamaño del archivo
            mime_type (str): Tipo MIME
            filename (str): Nombre del archivo
            
        Returns:
            Dict: Resultado de la validación
        """
        result = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'category': None,
            'max_size_mb': 0
        }
        
        # Validar tipo MIME
        if not cls.is_valid_mime_type(mime_type):
            result['valid'] = False
            result['errors'].append(f"Tipo de archivo no permitido: {mime_type}")
        else:
            result['category'] = cls.get_file_category(mime_type)
            result['max_size_mb'] = cls.MAX_FILE_SIZES[result['category']] / (1024 * 1024)
        
        # Validar tamaño
        if not cls.is_valid_file_size(file_size, mime_type):
            result['valid'] = False
            category = cls.get_file_category(mime_type)
            max_size_mb = cls.MAX_FILE_SIZES.get(category, 10 * 1024 * 1024) / (1024 * 1024)
            result['errors'].append(f"Archivo demasiado grande. Máximo permitido: {max_size_mb:.1f}MB")
        
        # Validar nombre de archivo
        if not filename or len(filename.strip()) == 0:
            result['valid'] = False
            result['errors'].append("Nombre de archivo no válido")
        
        # Validar extensión
        if '.' not in filename:
            result['warnings'].append("Archivo sin extensión")
        
        return result
    
    @classmethod
    def detect_real_mime_type(cls, file_content: bytes, filename: str) -> str:
        """
        Detecta el tipo MIME real del archivo usando el contenido, no solo la extensión.
        
        Args:
            file_content (bytes): Contenido del archivo
            filename (str): Nombre del archivo
            
        Returns:
            str: Tipo MIME detectado
        """
        # Intentar usar python-magic si está disponible
        if MAGIC_AVAILABLE and magic:
            try:
                detected_mime = magic.from_buffer(file_content, mime=True)
                return detected_mime
            except Exception:
                pass  # Continuar con fallbacks
        
        # Fallback a detección manual por firma
        detected_mime = cls._detect_mime_by_signature(file_content)
        if detected_mime:
            return detected_mime
        
        # Último fallback a mimetypes basado en extensión
        mime_type, _ = mimetypes.guess_type(filename)
        return mime_type or 'application/octet-stream'
    
    @classmethod
    def _detect_mime_by_signature(cls, file_content: bytes) -> Optional[str]:
        """
        Detecta el tipo MIME basado en la firma del archivo (magic numbers) como fallback.
        
        Args:
            file_content (bytes): Contenido del archivo
            
        Returns:
            Optional[str]: Tipo MIME detectado o None
        """
        if len(file_content) < 4:
            return None
        
        # Primeros bytes del archivo
        file_start = file_content[:20]
        
        # Firmas de archivos conocidas
        signatures = {
            b'%PDF': 'application/pdf',
            b'\xff\xd8\xff': 'image/jpeg',
            b'\x89\x50\x4e\x47': 'image/png',
            b'GIF87a': 'image/gif',
            b'GIF89a': 'image/gif',
            b'PK\x03\x04': 'application/zip',
            b'\xd0\xcf\x11\xe0': 'application/msword',
            b'BM': 'image/bmp',
            b'\x1f\x8b': 'application/gzip'
        }
        
        for signature, mime_type in signatures.items():
            if file_start.startswith(signature):
                return mime_type
        
        return None
    
    @classmethod
    def validate_file_signature(cls, file_content: bytes, expected_mime: str) -> bool:
        """
        Valida que la firma del archivo coincida con el tipo MIME esperado.
        
        Args:
            file_content (bytes): Contenido del archivo
            expected_mime (str): Tipo MIME esperado
            
        Returns:
            bool: True si la firma es válida
        """
        if len(file_content) < 4:
            return False
        
        # Firmas de archivos comunes (magic numbers)
        signatures = {
            'application/pdf': [b'%PDF'],
            'image/jpeg': [b'\xff\xd8\xff'],
            'image/png': [b'\x89\x50\x4e\x47'],
            'image/gif': [b'GIF87a', b'GIF89a'],
            'application/zip': [b'PK\x03\x04', b'PK\x05\x06', b'PK\x07\x08'],
            'application/msword': [b'\xd0\xcf\x11\xe0'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [b'PK\x03\x04'],
            'text/plain': [],  # No signature needed for text
        }
        
        expected_signatures = signatures.get(expected_mime, [])
        if not expected_signatures:
            # Si no tenemos firmas definidas, aceptar el archivo
            return True
        
        # Verificar si alguna firma coincide
        file_start = file_content[:20]  # Primeros 20 bytes
        for signature in expected_signatures:
            if file_start.startswith(signature):
                return True
        
        return False
    
    @classmethod
    def scan_for_malicious_content(cls, file_content: bytes, filename: str) -> Dict[str, any]:
        """
        Escanea el archivo en busca de contenido potencialmente malicioso.
        
        Args:
            file_content (bytes): Contenido del archivo
            filename (str): Nombre del archivo
            
        Returns:
            Dict: Resultado del escaneo
        """
        result = {
            'safe': True,
            'threats': [],
            'warnings': []
        }
        
        # Verificar patrones maliciosos conocidos
        malicious_patterns = [
            b'<script',
            b'javascript:',
            b'vbscript:',
            b'onload=',
            b'onerror=',
            b'eval(',
            b'document.write',
            b'%3Cscript',  # <script encoded
        ]
        
        content_lower = file_content.lower()
        for pattern in malicious_patterns:
            if pattern in content_lower:
                result['safe'] = False
                result['threats'].append(f'Patrón malicioso detectado: {pattern.decode("utf-8", errors="ignore")}')
        
        # Verificar archivos ejecutables por extensión
        dangerous_extensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.dll', '.vbs', '.js']
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext in dangerous_extensions:
            result['safe'] = False
            result['threats'].append(f'Extensión de archivo peligrosa: {file_ext}')
        
        # Verificar archivos ZIP/RAR que podrían contener malware
        if filename.lower().endswith(('.zip', '.rar', '.7z')):
            result['warnings'].append('Archivo comprimido - contenido no verificado')
        
        # Verificar tamaño anómalo (archivos muy pequeños que dicen ser algo que no son)
        if len(file_content) < 100:
            result['warnings'].append('Archivo sospechosamente pequeño')
        
        return result
    
    @classmethod
    def validate_filename_security(cls, filename: str) -> Dict[str, any]:
        """
        Valida la seguridad del nombre del archivo.
        
        Args:
            filename (str): Nombre del archivo
            
        Returns:
            Dict: Resultado de la validación
        """
        result = {
            'safe': True,
            'issues': [],
            'sanitized_name': filename
        }
        
        # Patrones peligrosos en nombres de archivo
        dangerous_patterns = [
            r'\.\./',  # Directory traversal
            r'\.\.\\', # Directory traversal (Windows)
            r'^\.',    # Hidden files
            r'[<>:"/\\|?*]',  # Caracteres problemáticos
            r'\x00',   # Null bytes
            r'^\s+|\s+$',  # Espacios al inicio/final
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, filename):
                result['safe'] = False
                result['issues'].append(f'Patrón peligroso detectado: {pattern}')
        
        # Sanitizar nombre
        result['sanitized_name'] = cls._sanitize_filename_advanced(filename)
        
        return result
    
    @classmethod
    def _sanitize_filename_advanced(cls, filename: str) -> str:
        """
        Sanitización avanzada de nombres de archivo.
        
        Args:
            filename (str): Nombre original
            
        Returns:
            str: Nombre sanitizado
        """
        # Remover caracteres peligrosos
        filename = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', filename)
        
        # Remover ../ y ..\\ (directory traversal)
        filename = re.sub(r'\.\.[\\/]', '', filename)
        
        # Remover espacios múltiples
        filename = re.sub(r'\s+', ' ', filename).strip()
        
        # No permitir nombres que empiecen con punto
        if filename.startswith('.'):
            filename = '_' + filename[1:]
        
        # Limitar longitud (mantener extensión)
        name, ext = os.path.splitext(filename)
        if len(name) > 100:
            name = name[:100]
        
        # Asegurar que no esté vacío
        if not name:
            name = f'file_{secrets.token_hex(4)}'
        
        return name + ext
    
    @classmethod
    def comprehensive_file_validation(cls, file_content: bytes, filename: str, 
                                    declared_mime: str = None) -> Dict[str, any]:
        """
        Validación integral de archivos con múltiples verificaciones de seguridad.
        
        Args:
            file_content (bytes): Contenido del archivo
            filename (str): Nombre del archivo
            declared_mime (str): Tipo MIME declarado (opcional)
            
        Returns:
            Dict: Resultado completo de la validación
        """
        result = {
            'valid': True,
            'safe': True,
            'errors': [],
            'warnings': [],
            'file_info': {},
            'security_checks': {}
        }
        
        # 1. Detectar tipo MIME real
        real_mime = cls.detect_real_mime_type(file_content, filename)
        result['file_info']['detected_mime'] = real_mime
        result['file_info']['declared_mime'] = declared_mime
        result['file_info']['size'] = len(file_content)
        
        # 2. Validar tipo MIME
        if not cls.is_valid_mime_type(real_mime):
            result['valid'] = False
            result['errors'].append(f'Tipo de archivo no permitido: {real_mime}')
        
        # 3. Validar coincidencia entre tipo declarado y real
        if declared_mime and declared_mime != real_mime:
            result['warnings'].append(f'Tipo MIME declarado ({declared_mime}) no coincide con el detectado ({real_mime})')
        
        # 4. Validar tamaño
        if not cls.is_valid_file_size(len(file_content), real_mime):
            result['valid'] = False
            category = cls.get_file_category(real_mime)
            max_size_mb = cls.MAX_FILE_SIZES.get(category, 10 * 1024 * 1024) / (1024 * 1024)
            result['errors'].append(f'Archivo demasiado grande. Máximo: {max_size_mb:.1f}MB')
        
        # 5. Validar firma del archivo
        if not cls.validate_file_signature(file_content, real_mime):
            result['warnings'].append('La firma del archivo no coincide con el tipo MIME detectado')
        
        # 6. Escanear contenido malicioso
        malware_scan = cls.scan_for_malicious_content(file_content, filename)
        result['security_checks']['malware_scan'] = malware_scan
        if not malware_scan['safe']:
            result['safe'] = False
            result['valid'] = False
            result['errors'].extend(malware_scan['threats'])
        result['warnings'].extend(malware_scan['warnings'])
        
        # 7. Validar nombre del archivo
        filename_check = cls.validate_filename_security(filename)
        result['security_checks']['filename_check'] = filename_check
        if not filename_check['safe']:
            result['safe'] = False
            result['warnings'].extend(filename_check['issues'])
        
        result['file_info']['sanitized_filename'] = filename_check['sanitized_name']
        
        return result


class FileManager:
    """
    Clase para gestionar archivos en el sistema de archivos.
    """
    
    def __init__(self, upload_directory: str = None):
        if upload_directory:
            self.upload_dir = upload_directory
        else:
            # Ruta por defecto relativa al archivo actual
            current_dir = os.path.dirname(os.path.abspath(__file__))
            self.upload_dir = os.path.join(current_dir, '..', '..', '..', 'uploads', 'documentos')
        
        self.upload_dir = os.path.abspath(self.upload_dir)
        self._ensure_upload_directory()
    
    def _ensure_upload_directory(self):
        """
        Asegura que el directorio de uploads existe.
        """
        if not os.path.exists(self.upload_dir):
            os.makedirs(self.upload_dir, exist_ok=True)
    
    def generate_unique_filename(self, original_filename: str) -> str:
        """
        Genera un nombre de archivo único manteniendo la extensión original.
        
        Args:
            original_filename (str): Nombre original del archivo
            
        Returns:
            str: Nombre único del archivo
        """
        # Obtener extensión
        name, ext = os.path.splitext(original_filename)
        
        # Generar ID único
        unique_id = secrets.token_hex(16)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Combinar para crear nombre único
        unique_filename = f"{timestamp}_{unique_id}{ext}"
        
        return unique_filename
    
    def save_file(self, file_data: bytes, original_filename: str) -> Tuple[str, str]:
        """
        Guarda un archivo en el sistema de archivos.
        
        Args:
            file_data (bytes): Datos del archivo
            original_filename (str): Nombre original del archivo
            
        Returns:
            Tuple[str, str]: (ruta_relativa, ruta_absoluta)
        """
        try:
            # Generar nombre único
            unique_filename = self.generate_unique_filename(original_filename)
            
            # Ruta completa del archivo
            file_path = os.path.join(self.upload_dir, unique_filename)
            
            # Guardar archivo
            with open(file_path, 'wb') as f:
                f.write(file_data)
            
            # Retornar rutas
            relative_path = os.path.join('uploads', 'documentos', unique_filename)
            return relative_path, file_path
            
        except Exception as e:
            raise Exception(f"Error al guardar archivo: {e}")
    
    def delete_file(self, file_path: str) -> bool:
        """
        Elimina un archivo del sistema de archivos.
        
        Args:
            file_path (str): Ruta del archivo a eliminar
            
        Returns:
            bool: True si se eliminó correctamente
        """
        try:
            # Si es ruta relativa, convertir a absoluta
            if not os.path.isabs(file_path):
                # Buscar en uploads
                if file_path.startswith('uploads/'):
                    current_dir = os.path.dirname(os.path.abspath(__file__))
                    abs_path = os.path.join(current_dir, '..', '..', '..', file_path)
                    file_path = os.path.abspath(abs_path)
            
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
            
        except Exception as e:
            print(f"Error al eliminar archivo {file_path}: {e}")
            return False
    
    def get_file_info(self, file_path: str) -> Optional[Dict]:
        """
        Obtiene información de un archivo.
        
        Args:
            file_path (str): Ruta del archivo
            
        Returns:
            Optional[Dict]: Información del archivo o None
        """
        try:
            if not os.path.isabs(file_path):
                # Si es ruta relativa, convertir a absoluta
                if file_path.startswith('uploads/'):
                    current_dir = os.path.dirname(os.path.abspath(__file__))
                    abs_path = os.path.join(current_dir, '..', '..', '..', file_path)
                    file_path = os.path.abspath(abs_path)
            
            if not os.path.exists(file_path):
                return None
            
            stat = os.stat(file_path)
            
            return {
                'exists': True,
                'size': stat.st_size,
                'created': datetime.fromtimestamp(stat.st_ctime),
                'modified': datetime.fromtimestamp(stat.st_mtime),
                'filename': os.path.basename(file_path),
                'extension': os.path.splitext(file_path)[1],
                'mime_type': mimetypes.guess_type(file_path)[0]
            }
            
        except Exception as e:
            print(f"Error al obtener información del archivo {file_path}: {e}")
            return None


class DocumentUtils:
    """
    Utilidades generales para documentos.
    """
    
    @staticmethod
    def calculate_file_hash(file_data: bytes) -> str:
        """
        Calcula el hash SHA-256 de un archivo.
        
        Args:
            file_data (bytes): Datos del archivo
            
        Returns:
            str: Hash del archivo
        """
        sha256_hash = hashlib.sha256()
        sha256_hash.update(file_data)
        return sha256_hash.hexdigest()
    
    @staticmethod
    def format_file_size(size_bytes: int) -> str:
        """
        Formatea el tamaño de archivo en formato legible.
        
        Args:
            size_bytes (int): Tamaño en bytes
            
        Returns:
            str: Tamaño formateado
        """
        if size_bytes == 0:
            return "0B"
        
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        size = float(size_bytes)
        
        while size >= 1024.0 and i < len(size_names) - 1:
            size /= 1024.0
            i += 1
        
        return f"{size:.1f}{size_names[i]}"
    
    @staticmethod
    def get_file_icon(mime_type: str) -> str:
        """
        Obtiene el icono correspondiente a un tipo de archivo.
        
        Args:
            mime_type (str): Tipo MIME del archivo
            
        Returns:
            str: Nombre del icono
        """
        icon_mapping = {
            'application/pdf': 'file-pdf',
            'application/msword': 'file-word',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'file-word',
            'application/vnd.ms-excel': 'file-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'file-excel',
            'application/vnd.ms-powerpoint': 'file-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'file-powerpoint',
            'text/plain': 'file-text',
            'text/csv': 'file-csv',
            'image/jpeg': 'file-image',
            'image/png': 'file-image',
            'image/gif': 'file-image',
            'application/zip': 'file-archive',
            'application/x-rar-compressed': 'file-archive',
            'audio/mpeg': 'file-audio',
            'audio/wav': 'file-audio',
            'video/mp4': 'file-video',
            'video/mpeg': 'file-video'
        }
        
        return icon_mapping.get(mime_type, 'file')
    
    @staticmethod
    def parse_tags_string(tags_string: str) -> List[str]:
        """
        Convierte una cadena de etiquetas separadas por comas en una lista.
        
        Args:
            tags_string (str): Cadena con etiquetas separadas por comas
            
        Returns:
            List[str]: Lista de etiquetas limpias
        """
        if not tags_string:
            return []
        
        tags = [tag.strip() for tag in tags_string.split(',')]
        return [tag for tag in tags if tag]  # Filtrar etiquetas vacías
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        Sanitiza un nombre de archivo para evitar caracteres problemáticos.
        
        Args:
            filename (str): Nombre original del archivo
            
        Returns:
            str: Nombre sanitizado
        """
        import re
        
        # Remover caracteres peligrosos
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        
        # Remover espacios múltiples y al inicio/final
        filename = re.sub(r'\s+', ' ', filename).strip()
        
        # Limitar longitud
        name, ext = os.path.splitext(filename)
        if len(name) > 100:
            name = name[:100]
        
        return name + ext
    
    @staticmethod
    def get_download_headers(filename: str, mime_type: str) -> Dict[str, str]:
        """
        Genera headers HTTP apropiados para descarga de archivos.
        
        Args:
            filename (str): Nombre del archivo
            mime_type (str): Tipo MIME
            
        Returns:
            Dict[str, str]: Headers HTTP
        """
        # Sanitizar nombre para header
        safe_filename = DocumentUtils.sanitize_filename(filename)
        
        return {
            'Content-Type': mime_type,
            'Content-Disposition': f'attachment; filename="{safe_filename}"',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }


class SearchHelper:
    """
    Utilidades para búsqueda y filtrado de documentos.
    """
    
    @staticmethod
    def build_search_filters(params: Dict) -> Dict:
        """
        Construye filtros de búsqueda a partir de parámetros.
        
        Args:
            params (Dict): Parámetros de búsqueda
            
        Returns:
            Dict: Filtros procesados
        """
        filters = {
            'search_term': params.get('q', '').strip(),
            'category_id': None,
            'tag_ids': [],
            'date_from': None,
            'date_to': None,
            'limit': 20,
            'offset': 0
        }
        
        # Categoría
        if params.get('category'):
            try:
                filters['category_id'] = int(params['category'])
            except (ValueError, TypeError):
                pass
        
        # Etiquetas
        if params.get('tags'):
            try:
                tag_ids = [int(tag_id) for tag_id in params['tags'].split(',')]
                filters['tag_ids'] = [tid for tid in tag_ids if tid > 0]
            except (ValueError, TypeError):
                pass
        
        # Paginación
        try:
            if params.get('limit'):
                filters['limit'] = min(int(params['limit']), 100)  # Máximo 100
            if params.get('offset'):
                filters['offset'] = max(int(params['offset']), 0)
        except (ValueError, TypeError):
            pass
        
        return filters
    
    @staticmethod
    def highlight_search_term(text: str, search_term: str, max_length: int = 200) -> str:
        """
        Resalta términos de búsqueda en texto y lo trunca si es necesario.
        
        Args:
            text (str): Texto original
            search_term (str): Término a resaltar
            max_length (int): Longitud máxima del resultado
            
        Returns:
            str: Texto con términos resaltados
        """
        if not search_term or not text:
            return text[:max_length] + ('...' if len(text) > max_length else '')
        
        import re
        
        # Buscar término (case insensitive)
        pattern = re.compile(re.escape(search_term), re.IGNORECASE)
        
        # Encontrar primera coincidencia
        match = pattern.search(text)
        if match:
            # Extraer fragmento alrededor de la coincidencia
            start = max(0, match.start() - max_length // 2)
            end = min(len(text), start + max_length)
            fragment = text[start:end]
            
            # Resaltar término en el fragmento
            highlighted = pattern.sub(f'<mark>{search_term}</mark>', fragment)
            
            # Agregar puntos suspensivos si es necesario
            if start > 0:
                highlighted = '...' + highlighted
            if end < len(text):
                highlighted = highlighted + '...'
            
            return highlighted
        
        # Si no hay coincidencia, retornar fragmento del inicio
        return text[:max_length] + ('...' if len(text) > max_length else '')


class DocumentStats:
    """
    Utilidades para estadísticas y reportes de documentos.
    """
    
    @staticmethod
    def format_stats_data(raw_data: List[Dict]) -> Dict:
        """
        Formatea datos de estadísticas para presentación.
        
        Args:
            raw_data (List[Dict]): Datos crudos de la base de datos
            
        Returns:
            Dict: Datos formateados
        """
        if not raw_data:
            return {'labels': [], 'data': [], 'total': 0}
        
        labels = [item.get('nombre', 'Sin nombre') for item in raw_data]
        data = [item.get('total_documentos', 0) for item in raw_data]
        total = sum(data)
        
        return {
            'labels': labels,
            'data': data,
            'total': total
        }
    
    @staticmethod
    def calculate_growth_percentage(current: int, previous: int) -> float:
        """
        Calcula el porcentaje de crecimiento.
        
        Args:
            current (int): Valor actual
            previous (int): Valor anterior
            
        Returns:
            float: Porcentaje de crecimiento
        """
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        
        return ((current - previous) / previous) * 100.0 