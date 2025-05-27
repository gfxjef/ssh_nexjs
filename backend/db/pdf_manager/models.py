"""
Modelos para el sistema de catálogos PDF con S3
Arquitectura profesional con base de datos
"""

import json
import hashlib
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from ...mysql_connection import MySQLConnection


class EstadoCatalogo(Enum):
    """Estados posibles de un catálogo"""
    ACTIVO = "activo"
    INACTIVO = "inactivo"
    PROCESANDO = "procesando"
    ERROR = "error"


class TipoArchivo(Enum):
    """Tipos de archivos en el sistema"""
    PDF_ORIGINAL = "pdf_original"
    PAGINA_WEBP = "pagina_webp"
    THUMBNAIL = "thumbnail"
    PREVIEW = "preview"
    PAGINA_PNG = "pagina_png"


class EstadoArchivo(Enum):
    """Estados de archivos individuales"""
    DISPONIBLE = "disponible"
    PROCESANDO = "procesando"
    ERROR = "error"
    ELIMINADO = "eliminado"


@dataclass
class Catalogo:
    """Modelo para catálogo PDF"""
    id: Optional[int] = None
    nombre: str = ""
    descripcion: str = ""
    categoria: str = "general"
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    estado: EstadoCatalogo = EstadoCatalogo.PROCESANDO
    usuario_id: Optional[int] = None
    total_paginas: int = 0
    tamaño_archivo: int = 0
    nombre_archivo_original: str = ""
    version: str = "1.0"
    tags: Optional[Dict] = None
    metadatos_procesamiento: Optional[Dict] = None


@dataclass
class CatalogoDoc:
    """Modelo para documentos de catálogo"""
    id: Optional[int] = None
    catalogo_id: int = 0
    tipo_archivo: TipoArchivo = TipoArchivo.PDF_ORIGINAL
    nombre_archivo: str = ""
    url_s3: str = ""
    s3_key: str = ""
    numero_pagina: Optional[int] = None
    tamaño_archivo: int = 0
    mime_type: str = ""
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    metadatos: Optional[Dict] = None
    checksum_md5: Optional[str] = None
    estado_archivo: EstadoArchivo = EstadoArchivo.DISPONIBLE


class CatalogoManager:
    """Gestor de operaciones de catálogos"""
    
    def __init__(self):
        self.db = MySQLConnection()
    
    # ==========================================
    # OPERACIONES DE CATÁLOGOS
    # ==========================================
    
    def crear_catalogo(self, catalogo: Catalogo) -> int:
        """
        Crea un nuevo catálogo en la base de datos
        
        Returns:
            int: ID del catálogo creado
        """
        query = """
        INSERT INTO catalogos (
            nombre, descripcion, categoria, estado, usuario_id, 
            total_paginas, tamaño_archivo, nombre_archivo_original, 
            version, tags, metadatos_procesamiento
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (
            catalogo.nombre,
            catalogo.descripcion,
            catalogo.categoria,
            catalogo.estado.value,
            catalogo.usuario_id,
            catalogo.total_paginas,
            catalogo.tamaño_archivo,
            catalogo.nombre_archivo_original,
            catalogo.version,
            json.dumps(catalogo.tags) if catalogo.tags else None,
            json.dumps(catalogo.metadatos_procesamiento) if catalogo.metadatos_procesamiento else None
        )
        
        result = self.db.execute_query(query, params, fetch=False)
        return result.get('last_insert_id') if result else None
    
    def obtener_catalogo(self, catalogo_id: int) -> Optional[Catalogo]:
        """Obtiene un catálogo por ID"""
        query = "SELECT * FROM catalogos WHERE id = %s"
        result = self.db.execute_query(query, (catalogo_id,))
        
        if result:
            row = result[0]
            return Catalogo(
                id=row['id'],
                nombre=row['nombre'],
                descripcion=row['descripcion'],
                categoria=row['categoria'],
                fecha_creacion=row['fecha_creacion'],
                fecha_actualizacion=row['fecha_actualizacion'],
                estado=EstadoCatalogo(row['estado']),
                usuario_id=row['usuario_id'],
                total_paginas=row['total_paginas'],
                tamaño_archivo=row['tamaño_archivo'],
                nombre_archivo_original=row['nombre_archivo_original'],
                version=row['version'],
                tags=json.loads(row['tags']) if row['tags'] else None,
                metadatos_procesamiento=json.loads(row['metadatos_procesamiento']) if row['metadatos_procesamiento'] else None
            )
        return None
    
    def listar_catalogos(self, categoria: Optional[str] = None, estado: Optional[EstadoCatalogo] = None, 
                        limite: int = 50, offset: int = 0) -> List[Dict]:
        """
        Lista catálogos con filtros opcionales
        
        Returns:
            List[Dict]: Lista de catálogos con información completa
        """
        query = """
        SELECT 
            c.*,
            pdf.url_s3 as pdf_url,
            thumb.url_s3 as thumbnail_url,
            (SELECT COUNT(*) FROM catalogos_docs cd 
             WHERE cd.catalogo_id = c.id AND cd.tipo_archivo = 'pagina_webp') as paginas_procesadas
        FROM catalogos c
        LEFT JOIN catalogos_docs pdf ON c.id = pdf.catalogo_id AND pdf.tipo_archivo = 'pdf_original'
        LEFT JOIN catalogos_docs thumb ON c.id = thumb.catalogo_id AND thumb.tipo_archivo = 'thumbnail'
        WHERE 1=1
        """
        
        params = []
        
        if categoria:
            query += " AND c.categoria = %s"
            params.append(categoria)
        
        if estado:
            query += " AND c.estado = %s"
            params.append(estado.value)
        
        query += " ORDER BY c.fecha_creacion DESC LIMIT %s OFFSET %s"
        params.extend([limite, offset])
        
        return self.db.execute_query(query, params) or []
    
    def actualizar_estado_catalogo(self, catalogo_id: int, estado: EstadoCatalogo, 
                                  metadatos: Optional[Dict] = None) -> bool:
        """Actualiza el estado de un catálogo"""
        query = """
        UPDATE catalogos 
        SET estado = %s, metadatos_procesamiento = %s, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = %s
        """
        
        params = (
            estado.value,
            json.dumps(metadatos) if metadatos else None,
            catalogo_id
        )
        
        result = self.db.execute_query(query, params, fetch=False)
        return result and result.get('affected_rows', 0) > 0
    
    def actualizar_total_paginas(self, catalogo_id: int, total_paginas: int) -> bool:
        """Actualiza el total de páginas de un catálogo"""
        query = "UPDATE catalogos SET total_paginas = %s WHERE id = %s"
        result = self.db.execute_query(query, (total_paginas, catalogo_id), fetch=False)
        return result and result.get('affected_rows', 0) > 0
    
    def eliminar_catalogo(self, catalogo_id: int) -> bool:
        """Elimina un catálogo y todos sus documentos asociados"""
        query = "DELETE FROM catalogos WHERE id = %s"
        result = self.db.execute_query(query, (catalogo_id,), fetch=False)
        return result and result.get('affected_rows', 0) > 0
    
    # ==========================================
    # OPERACIONES DE DOCUMENTOS
    # ==========================================
    
    def crear_documento(self, doc: CatalogoDoc) -> int:
        """
        Crea un nuevo documento en la base de datos
        
        Returns:
            int: ID del documento creado
        """
        query = """
        INSERT INTO catalogos_docs (
            catalogo_id, tipo_archivo, nombre_archivo, url_s3, s3_key,
            numero_pagina, tamaño_archivo, mime_type, metadatos, 
            checksum_md5, estado_archivo
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (
            doc.catalogo_id,
            doc.tipo_archivo.value,
            doc.nombre_archivo,
            doc.url_s3,
            doc.s3_key,
            doc.numero_pagina,
            doc.tamaño_archivo,
            doc.mime_type,
            json.dumps(doc.metadatos) if doc.metadatos else None,
            doc.checksum_md5,
            doc.estado_archivo.value
        )
        
        result = self.db.execute_query(query, params, fetch=False)
        return result.get('last_insert_id') if result else None
    
    def obtener_documentos_catalogo(self, catalogo_id: int, 
                                   tipo_archivo: Optional[TipoArchivo] = None) -> List[Dict]:
        """Obtiene todos los documentos de un catálogo"""
        query = """
        SELECT * FROM catalogos_docs 
        WHERE catalogo_id = %s AND estado_archivo = 'disponible'
        """
        params = [catalogo_id]
        
        if tipo_archivo:
            query += " AND tipo_archivo = %s"
            params.append(tipo_archivo.value)
        
        query += " ORDER BY numero_pagina ASC"
        
        return self.db.execute_query(query, params) or []
    
    def obtener_documento_por_s3_key(self, s3_key: str) -> Optional[Dict]:
        """Obtiene un documento por su S3 key"""
        query = "SELECT * FROM catalogos_docs WHERE s3_key = %s"
        result = self.db.execute_query(query, (s3_key,))
        return result[0] if result else None
    
    def obtener_paginas_catalogo(self, catalogo_id: int) -> List[Dict]:
        """Obtiene todas las páginas de un catálogo ordenadas"""
        query = """
        SELECT numero_pagina, url_s3, s3_key, tamaño_archivo, metadatos
        FROM catalogos_docs 
        WHERE catalogo_id = %s 
          AND tipo_archivo = 'pagina_webp' 
          AND estado_archivo = 'disponible'
        ORDER BY numero_pagina ASC
        """
        return self.db.execute_query(query, (catalogo_id,)) or []
    
    def obtener_pdf_original(self, catalogo_id: int) -> Optional[Dict]:
        """Obtiene el PDF original de un catálogo"""
        query = """
        SELECT * FROM catalogos_docs 
        WHERE catalogo_id = %s AND tipo_archivo = 'pdf_original'
        """
        result = self.db.execute_query(query, (catalogo_id,))
        return result[0] if result else None
    
    def obtener_thumbnail(self, catalogo_id: int) -> Optional[Dict]:
        """Obtiene el thumbnail de un catálogo"""
        query = """
        SELECT * FROM catalogos_docs 
        WHERE catalogo_id = %s AND tipo_archivo = 'thumbnail'
        """
        result = self.db.execute_query(query, (catalogo_id,))
        return result[0] if result else None
    
    def actualizar_estado_documento(self, documento_id: int, estado: EstadoArchivo) -> bool:
        """Actualiza el estado de un documento"""
        query = "UPDATE catalogos_docs SET estado_archivo = %s WHERE id = %s"
        result = self.db.execute_query(query, (estado.value, documento_id), fetch=False)
        return result and result.get('affected_rows', 0) > 0
    
    def eliminar_documentos_catalogo(self, catalogo_id: int) -> bool:
        """Elimina todos los documentos de un catálogo"""
        query = "DELETE FROM catalogos_docs WHERE catalogo_id = %s"
        result = self.db.execute_query(query, (catalogo_id,), fetch=False)
        return result and result.get('affected_rows', 0) > 0
    
    # ==========================================
    # CONSULTAS COMPLEJAS Y VISTAS
    # ==========================================
    
    def obtener_catalogo_completo(self, catalogo_id: int) -> Optional[Dict]:
        """
        Obtiene un catálogo con toda su información y archivos asociados
        
        Returns:
            Dict: Información completa del catálogo
        """
        # Información del catálogo
        catalogo = self.obtener_catalogo(catalogo_id)
        if not catalogo:
            return None
        
        # Documentos organizados por tipo
        pdf_original = self.obtener_pdf_original(catalogo_id)
        thumbnail = self.obtener_thumbnail(catalogo_id)
        paginas = self.obtener_paginas_catalogo(catalogo_id)
        
        return {
            'catalogo': {
                'id': catalogo.id,
                'nombre': catalogo.nombre,
                'descripcion': catalogo.descripcion,
                'categoria': catalogo.categoria,
                'estado': catalogo.estado.value,
                'total_paginas': catalogo.total_paginas,
                'tamaño_archivo': catalogo.tamaño_archivo,
                'fecha_creacion': catalogo.fecha_creacion.isoformat() if catalogo.fecha_creacion else None,
                'fecha_actualizacion': catalogo.fecha_actualizacion.isoformat() if catalogo.fecha_actualizacion else None,
                'version': catalogo.version,
                'tags': catalogo.tags,
                'metadatos_procesamiento': catalogo.metadatos_procesamiento
            },
            'archivos': {
                'pdf_original': pdf_original,
                'thumbnail': thumbnail,
                'paginas': paginas,
                'total_archivos': len(paginas) + (1 if pdf_original else 0) + (1 if thumbnail else 0)
            }
        }
    
    def buscar_catalogos(self, termino: str, categoria: Optional[str] = None) -> List[Dict]:
        """Busca catálogos por término en nombre y descripción"""
        query = """
        SELECT * FROM vista_catalogos_completos
        WHERE (nombre LIKE %s OR descripcion LIKE %s)
        """
        params = [f"%{termino}%", f"%{termino}%"]
        
        if categoria:
            query += " AND categoria = %s"
            params.append(categoria)
        
        query += " ORDER BY fecha_creacion DESC"
        
        return self.db.execute_query(query, params) or []
    
    def obtener_estadisticas_catalogos(self) -> Dict:
        """Obtiene estadísticas generales del sistema"""
        query = """
        SELECT 
            COUNT(*) as total_catalogos,
            COUNT(CASE WHEN estado = 'activo' THEN 1 END) as catalogos_activos,
            COUNT(CASE WHEN estado = 'procesando' THEN 1 END) as catalogos_procesando,
            COUNT(CASE WHEN estado = 'error' THEN 1 END) as catalogos_error,
            SUM(total_paginas) as total_paginas_sistema,
            SUM(tamaño_archivo) as tamaño_total_bytes,
            AVG(total_paginas) as promedio_paginas_catalogo
        FROM catalogos
        """
        
        result = self.db.execute_query(query)
        return result[0] if result else {}
    
    def limpiar_archivos_huerfanos(self) -> Dict:
        """Ejecuta limpieza de archivos huérfanos"""
        query = "CALL LimpiarArchivosHuerfanos()"
        result = self.db.execute_query(query)
        return result[0] if result else {}
    
    # ==========================================
    # UTILIDADES
    # ==========================================
    
    @staticmethod
    def calcular_checksum_md5(contenido: bytes) -> str:
        """Calcula el checksum MD5 de un archivo"""
        return hashlib.md5(contenido).hexdigest()
    
    @staticmethod
    def generar_s3_key(catalogo_id: int, tipo_archivo: TipoArchivo, 
                      nombre_archivo: str, numero_pagina: Optional[int] = None) -> str:
        """Genera una S3 key consistente"""
        if numero_pagina:
            return f"pdf/{catalogo_id}/{nombre_archivo}"
        else:
            return f"pdf/{catalogo_id}/{nombre_archivo}"
    
    @staticmethod
    def generar_url_s3(s3_key: str, bucket: str = "redkossodo", region: str = "us-east-2") -> str:
        """Genera URL pública de S3"""
        return f"https://{bucket}.s3.{region}.amazonaws.com/{s3_key}"


# ==========================================
# FUNCIONES DE UTILIDAD PARA SERIALIZACIÓN
# ==========================================

def catalogo_to_dict(catalogo: Catalogo) -> Dict:
    """Convierte un objeto Catalogo a diccionario"""
    return {
        'id': catalogo.id,
        'nombre': catalogo.nombre,
        'descripcion': catalogo.descripcion,
        'categoria': catalogo.categoria,
        'estado': catalogo.estado.value,
        'total_paginas': catalogo.total_paginas,
        'tamaño_archivo': catalogo.tamaño_archivo,
        'fecha_creacion': catalogo.fecha_creacion.isoformat() if catalogo.fecha_creacion else None,
        'fecha_actualizacion': catalogo.fecha_actualizacion.isoformat() if catalogo.fecha_actualizacion else None,
        'version': catalogo.version,
        'tags': catalogo.tags,
        'metadatos_procesamiento': catalogo.metadatos_procesamiento
    }


def documento_to_dict(doc: CatalogoDoc) -> Dict:
    """Convierte un objeto CatalogoDoc a diccionario"""
    return {
        'id': doc.id,
        'catalogo_id': doc.catalogo_id,
        'tipo_archivo': doc.tipo_archivo.value,
        'nombre_archivo': doc.nombre_archivo,
        'url_s3': doc.url_s3,
        's3_key': doc.s3_key,
        'numero_pagina': doc.numero_pagina,
        'tamaño_archivo': doc.tamaño_archivo,
        'mime_type': doc.mime_type,
        'fecha_creacion': doc.fecha_creacion.isoformat() if doc.fecha_creacion else None,
        'metadatos': doc.metadatos,
        'estado_archivo': doc.estado_archivo.value
    } 