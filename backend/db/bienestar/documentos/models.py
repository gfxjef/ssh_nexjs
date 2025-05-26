"""
Modelos de datos para el módulo de documentos.
Contiene las clases para gestionar documentos, categorías, etiquetas y auditoría.
"""

from datetime import datetime
from typing import List, Dict, Optional, Union
from ...mysql_connection import MySQLConnection
from .queries import *


class DocumentCategory:
    """
    Modelo para gestionar categorías de documentos.
    """
    
    def __init__(self, db_connection: MySQLConnection = None):
        self.db = db_connection if db_connection else MySQLConnection()
    
    def get_all(self) -> List[Dict]:
        """
        Obtiene todas las categorías de documentos.
        
        Returns:
            List[Dict]: Lista de categorías
        """
        try:
            return self.db.execute_query(GET_ALL_DOCUMENT_CATEGORIES) or []
        except Exception as e:
            print(f"Error al obtener categorías: {e}")
            return []
    
    def get_by_id(self, category_id: int) -> Optional[Dict]:
        """
        Obtiene una categoría por ID.
        
        Args:
            category_id (int): ID de la categoría
            
        Returns:
            Optional[Dict]: Datos de la categoría o None
        """
        try:
            result = self.db.execute_query(GET_DOCUMENT_CATEGORY_BY_ID, (category_id,))
            return result[0] if result else None
        except Exception as e:
            print(f"Error al obtener categoría {category_id}: {e}")
            return None
    
    def get_by_name(self, name: str) -> Optional[Dict]:
        """
        Obtiene una categoría por nombre.
        
        Args:
            name (str): Nombre de la categoría
            
        Returns:
            Optional[Dict]: Datos de la categoría o None
        """
        try:
            result = self.db.execute_query(GET_DOCUMENT_CATEGORY_BY_NAME, (name,))
            return result[0] if result else None
        except Exception as e:
            print(f"Error al obtener categoría '{name}': {e}")
            return None
    
    def create(self, name: str, description: str = None, color: str = '#3182CE', icono: str = '📁') -> Optional[int]:
        """
        Crea una nueva categoría de documentos.
        
        Args:
            name (str): Nombre de la categoría
            description (str): Descripción de la categoría
            color (str): Color hexadecimal de la categoría
            icono (str): Icono emoji de la categoría
            
        Returns:
            Optional[int]: ID de la categoría creada o None
        """
        try:
            # Verificar si ya existe
            existing = self.get_by_name(name)
            if existing:
                print(f"La categoría '{name}' ya existe")
                return None
            
            result = self.db.execute_query(INSERT_DOCUMENT_CATEGORY, (name, description, color, icono), fetch=False)
            if result is not None:
                # Obtener el ID de la categoría recién creada
                new_category = self.get_by_name(name)
                return new_category['id'] if new_category else None
            return None
        except Exception as e:
            print(f"Error al crear categoría '{name}': {e}")
            return None
    
    def update(self, category_id: int, name: str, description: str = None, color: str = '#3182CE', icono: str = '📁') -> bool:
        """
        Actualiza una categoría existente.
        
        Args:
            category_id (int): ID de la categoría
            name (str): Nuevo nombre
            description (str): Nueva descripción
            color (str): Nuevo color hexadecimal
            icono (str): Nuevo icono emoji
            
        Returns:
            bool: True si se actualizó correctamente
        """
        try:
            result = self.db.execute_query(UPDATE_DOCUMENT_CATEGORY, (name, description, color, icono, category_id), fetch=False)
            return result is not None
        except Exception as e:
            print(f"Error al actualizar categoría {category_id}: {e}")
            return False
    
    def delete(self, category_id: int) -> bool:
        """
        Elimina una categoría.
        
        Args:
            category_id (int): ID de la categoría
            
        Returns:
            bool: True si se eliminó correctamente
        """
        try:
            result = self.db.execute_query(DELETE_DOCUMENT_CATEGORY, (category_id,), fetch=False)
            return result is not None
        except Exception as e:
            print(f"Error al eliminar categoría {category_id}: {e}")
            return False


class DocumentTag:
    """
    Modelo para gestionar etiquetas de documentos.
    """
    
    def __init__(self, db_connection: MySQLConnection = None):
        self.db = db_connection if db_connection else MySQLConnection()
    
    def get_all(self) -> List[Dict]:
        """
        Obtiene todas las etiquetas.
        
        Returns:
            List[Dict]: Lista de etiquetas
        """
        try:
            return self.db.execute_query(GET_ALL_TAGS) or []
        except Exception as e:
            print(f"Error al obtener etiquetas: {e}")
            return []
    
    def get_by_id(self, tag_id: int) -> Optional[Dict]:
        """
        Obtiene una etiqueta por ID.
        
        Args:
            tag_id (int): ID de la etiqueta
            
        Returns:
            Optional[Dict]: Datos de la etiqueta o None
        """
        try:
            result = self.db.execute_query(GET_TAG_BY_ID, (tag_id,))
            return result[0] if result else None
        except Exception as e:
            print(f"Error al obtener etiqueta {tag_id}: {e}")
            return None
    
    def get_by_name(self, name: str) -> Optional[Dict]:
        """
        Obtiene una etiqueta por nombre.
        
        Args:
            name (str): Nombre de la etiqueta
            
        Returns:
            Optional[Dict]: Datos de la etiqueta o None
        """
        try:
            result = self.db.execute_query(GET_TAG_BY_NAME, (name,))
            return result[0] if result else None
        except Exception as e:
            print(f"Error al obtener etiqueta '{name}': {e}")
            return None
    
    def create(self, name: str, color: str = '#2e3954') -> Optional[int]:
        """
        Crea una nueva etiqueta.
        
        Args:
            name (str): Nombre de la etiqueta
            color (str): Color hexadecimal de la etiqueta
            
        Returns:
            Optional[int]: ID de la etiqueta creada o None
        """
        try:
            # Verificar si ya existe
            existing = self.get_by_name(name)
            if existing:
                print(f"La etiqueta '{name}' ya existe")
                return None
            
            result = self.db.execute_query(INSERT_TAG, (name, color), fetch=False)
            if result is not None:
                # Obtener el ID de la etiqueta recién creada
                new_tag = self.get_by_name(name)
                return new_tag['id'] if new_tag else None
            return None
        except Exception as e:
            print(f"Error al crear etiqueta '{name}': {e}")
            return None
    
    def update(self, tag_id: int, name: str, color: str) -> bool:
        """
        Actualiza una etiqueta existente.
        
        Args:
            tag_id (int): ID de la etiqueta
            name (str): Nuevo nombre
            color (str): Nuevo color
            
        Returns:
            bool: True si se actualizó correctamente
        """
        try:
            result = self.db.execute_query(UPDATE_TAG, (name, color, tag_id), fetch=False)
            return result is not None
        except Exception as e:
            print(f"Error al actualizar etiqueta {tag_id}: {e}")
            return False
    
    def delete(self, tag_id: int) -> bool:
        """
        Elimina una etiqueta.
        
        Args:
            tag_id (int): ID de la etiqueta
            
        Returns:
            bool: True si se eliminó correctamente
        """
        try:
            result = self.db.execute_query(DELETE_TAG, (tag_id,), fetch=False)
            return result is not None
        except Exception as e:
            print(f"Error al eliminar etiqueta {tag_id}: {e}")
            return False


class Document:
    """
    Modelo para gestionar documentos.
    """
    
    def __init__(self, db_connection: MySQLConnection = None):
        self.db = db_connection if db_connection else MySQLConnection()
    
    def get_all(self, limit: int = None, offset: int = 0) -> List[Dict]:
        """
        Obtiene todos los documentos con paginación.
        
        Args:
            limit (int): Número máximo de documentos
            offset (int): Desplazamiento para paginación
            
        Returns:
            List[Dict]: Lista de documentos
        """
        try:
            query = GET_ALL_DOCUMENTS
            params = None
            
            if limit:
                query += " LIMIT %s OFFSET %s"
                params = (limit, offset)
            
            return self.db.execute_query(query, params) or []
        except Exception as e:
            print(f"Error al obtener documentos: {e}")
            return []
    
    def get_by_id(self, document_id: int) -> Optional[Dict]:
        """
        Obtiene un documento por ID con sus etiquetas.
        
        Args:
            document_id (int): ID del documento
            
        Returns:
            Optional[Dict]: Datos del documento con etiquetas o None
        """
        try:
            result = self.db.execute_query(GET_DOCUMENT_WITH_TAGS, (document_id,))
            if result:
                document = result[0]
                # Procesar etiquetas
                if document.get('etiquetas'):
                    etiquetas_list = []
                    for etiqueta_info in document['etiquetas'].split('|'):
                        if etiqueta_info:
                            parts = etiqueta_info.split(':')
                            if len(parts) == 3:
                                etiquetas_list.append({
                                    'id': int(parts[0]),
                                    'nombre': parts[1],
                                    'color': parts[2]
                                })
                    document['etiquetas'] = etiquetas_list
                else:
                    document['etiquetas'] = []
                return document
            return None
        except Exception as e:
            print(f"Error al obtener documento {document_id}: {e}")
            return None
    
    def get_by_category(self, category_id: int, limit: int = None, offset: int = 0) -> List[Dict]:
        """
        Obtiene documentos por categoría.
        
        Args:
            category_id (int): ID de la categoría
            limit (int): Número máximo de documentos
            offset (int): Desplazamiento para paginación
            
        Returns:
            List[Dict]: Lista de documentos
        """
        try:
            query = GET_DOCUMENTS_BY_CATEGORY
            params = [category_id]
            
            if limit:
                query += " LIMIT %s OFFSET %s"
                params.extend([limit, offset])
            
            return self.db.execute_query(query, params) or []
        except Exception as e:
            print(f"Error al obtener documentos por categoría {category_id}: {e}")
            return []
    
    def get_by_tag(self, tag_id: int, limit: int = None, offset: int = 0) -> List[Dict]:
        """
        Obtiene documentos por etiqueta.
        
        Args:
            tag_id (int): ID de la etiqueta
            limit (int): Número máximo de documentos
            offset (int): Desplazamiento para paginación
            
        Returns:
            List[Dict]: Lista de documentos
        """
        try:
            query = GET_DOCUMENTS_BY_TAG
            params = [tag_id]
            
            if limit:
                query += " LIMIT %s OFFSET %s"
                params.extend([limit, offset])
            
            return self.db.execute_query(query, params) or []
        except Exception as e:
            print(f"Error al obtener documentos por etiqueta {tag_id}: {e}")
            return []
    
    def search(self, search_term: str, limit: int = None, offset: int = 0) -> List[Dict]:
        """
        Busca documentos por término.
        
        Args:
            search_term (str): Término de búsqueda
            limit (int): Número máximo de documentos
            offset (int): Desplazamiento para paginación
            
        Returns:
            List[Dict]: Lista de documentos encontrados
        """
        try:
            search_pattern = f"%{search_term}%"
            query = SEARCH_DOCUMENTS
            params = [search_pattern, search_pattern, search_pattern]
            
            if limit:
                query += " LIMIT %s OFFSET %s"
                params.extend([limit, offset])
            
            return self.db.execute_query(query, params) or []
        except Exception as e:
            print(f"Error al buscar documentos con '{search_term}': {e}")
            return []
    
    def create(self, titulo: str, descripcion: str, nombre_archivo: str, 
               ruta_archivo: str, tamaño_archivo: int, tipo_mime: str,
               categoria_id: int, subido_por: int, es_publico: bool = True, 
               grupo: str = 'grupo_kossodo') -> Optional[int]:
        """
        Crea un nuevo documento.
        
        Args:
            titulo (str): Título del documento
            descripcion (str): Descripción del documento
            nombre_archivo (str): Nombre original del archivo
            ruta_archivo (str): Ruta donde se guardó el archivo
            tamaño_archivo (int): Tamaño en bytes
            tipo_mime (str): Tipo MIME del archivo
            categoria_id (int): ID de la categoría
            subido_por (int): ID del usuario que subió el archivo
            es_publico (bool): Si el documento es público o privado
            grupo (str): Grupo empresarial ('kossodo', 'kossomet', 'grupo_kossodo')
            
        Returns:
            Optional[int]: ID del documento creado o None
        """
        try:
            result = self.db.execute_query(
                INSERT_DOCUMENT,
                (titulo, descripcion, nombre_archivo, ruta_archivo, 
                 tamaño_archivo, tipo_mime, categoria_id, subido_por, es_publico, 'activo', grupo),
                fetch=False
            )
            
            if result is not None:
                # Obtener el ID del documento recién creado
                recent_doc = self.db.execute_query(
                    "SELECT id FROM documentos WHERE nombre_archivo = %s AND subido_por = %s ORDER BY created_at DESC LIMIT 1",
                    (nombre_archivo, subido_por)
                )
                return recent_doc[0]['id'] if recent_doc else None
            return None
        except Exception as e:
            print(f"Error al crear documento '{titulo}': {e}")
            return None
    
    def update(self, document_id: int, titulo: str, descripcion: str, 
               categoria_id: int, es_publico: bool, grupo: str = None) -> bool:
        """
        Actualiza un documento existente.
        
        Args:
            document_id (int): ID del documento
            titulo (str): Nuevo título
            descripcion (str): Nueva descripción
            categoria_id (int): Nueva categoría
            es_publico (bool): Nueva visibilidad
            grupo (str): Nuevo grupo empresarial (opcional)
            
        Returns:
            bool: True si se actualizó correctamente
        """
        try:
            # Si no se proporciona grupo, obtener el grupo actual
            if grupo is None:
                current_doc = self.get_by_id(document_id)
                grupo = current_doc.get('grupo', 'grupo_kossodo') if current_doc else 'grupo_kossodo'
            
            result = self.db.execute_query(
                UPDATE_DOCUMENT,
                (titulo, descripcion, categoria_id, es_publico, grupo, document_id),
                fetch=False
            )
            return result is not None
        except Exception as e:
            print(f"Error al actualizar documento {document_id}: {e}")
            return False
    
    def delete(self, document_id: int) -> bool:
        """
        Elimina un documento.
        
        Args:
            document_id (int): ID del documento
            
        Returns:
            bool: True si se eliminó correctamente
        """
        try:
            result = self.db.execute_query(DELETE_DOCUMENT, (document_id,), fetch=False)
            return result is not None
        except Exception as e:
            print(f"Error al eliminar documento {document_id}: {e}")
            return False
    
    def increment_downloads(self, document_id: int) -> bool:
        """
        Incrementa el contador de descargas.
        
        Args:
            document_id (int): ID del documento
            
        Returns:
            bool: True si se incrementó correctamente
        """
        try:
            result = self.db.execute_query(INCREMENT_DOWNLOADS, (document_id,), fetch=False)
            return result is not None
        except Exception as e:
            print(f"Error al incrementar descargas del documento {document_id}: {e}")
            return False
    
    def get_by_grupo(self, grupo: str, limit: int = None, offset: int = 0) -> List[Dict]:
        """
        Obtiene documentos por grupo empresarial.
        
        Args:
            grupo (str): Grupo empresarial ('kossodo', 'kossomet', 'grupo_kossodo')
            limit (int): Número máximo de documentos
            offset (int): Desplazamiento para paginación
            
        Returns:
            List[Dict]: Lista de documentos del grupo
        """
        try:
            query = GET_DOCUMENTS_BY_GRUPO
            params = [grupo]
            
            if limit:
                query += " LIMIT %s OFFSET %s"
                params.extend([limit, offset])
            
            return self.db.execute_query(query, params) or []
        except Exception as e:
            print(f"Error al obtener documentos del grupo {grupo}: {e}")
            return []
    
    def get_available_grupos(self) -> List[Dict]:
        """
        Obtiene la lista de grupos empresariales disponibles.
        
        Returns:
            List[Dict]: Lista de grupos con información
        """
        try:
            # Definir información de los grupos empresariales
            grupos_info = [
                {
                    'id': 'kossodo',
                    'nombre': 'Kossodo',
                    'icono': '🏢',
                    'color': '#2563EB',
                    'descripcion': 'Empresa principal del grupo'
                },
                {
                    'id': 'kossomet',
                    'nombre': 'Kossomet',
                    'icono': '🏭',
                    'color': '#059669',
                    'descripcion': 'División metalúrgica'
                },
                {
                    'id': 'grupo_kossodo',
                    'nombre': 'Grupo Kossodo',
                    'icono': '🏛️',
                    'color': '#6B7280',
                    'descripcion': 'Corporativo del grupo'
                }
            ]
            
            # Obtener conteos de documentos por grupo
            result = self.db.execute_query(GET_GRUPOS_WITH_COUNT) or []
            conteos = {row['grupo']: row['total_documentos'] for row in result}
            
            # Agregar conteos a la información de grupos
            for grupo in grupos_info:
                grupo['total_documentos'] = conteos.get(grupo['id'], 0)
            
            return grupos_info
        except Exception as e:
            print(f"Error al obtener grupos disponibles: {e}")
            return []
    
    def validate_grupo(self, grupo: str) -> bool:
        """
        Valida que el grupo sea uno de los valores permitidos.
        
        Args:
            grupo (str): Grupo a validar
            
        Returns:
            bool: True si el grupo es válido
        """
        grupos_validos = ['kossodo', 'kossomet', 'grupo_kossodo']
        return grupo in grupos_validos
    
    def search_with_filters(self, search_term: str = None, categoria_id: int = None, 
                           tag_ids: List[int] = None, grupo: str = None,
                           limit: int = None, offset: int = 0) -> List[Dict]:
        """
        Búsqueda avanzada de documentos con múltiples filtros.
        
        Args:
            search_term (str): Término de búsqueda
            categoria_id (int): ID de categoría para filtrar
            tag_ids (List[int]): Lista de IDs de etiquetas
            grupo (str): Grupo empresarial para filtrar
            limit (int): Número máximo de documentos
            offset (int): Desplazamiento para paginación
            
        Returns:
            List[Dict]: Lista de documentos que coinciden con los filtros
        """
        try:
            query = SEARCH_DOCUMENTS_WITH_FILTERS
            params = []
            
            # Agregar filtros dinámicamente
            if search_term:
                query += " AND (d.titulo LIKE %s OR d.descripcion LIKE %s OR e.nombre LIKE %s)"
                search_pattern = f"%{search_term}%"
                params.extend([search_pattern, search_pattern, search_pattern])
            
            if categoria_id:
                query += " AND d.categoria_id = %s"
                params.append(categoria_id)
            
            if grupo:
                query += " AND d.grupo = %s"
                params.append(grupo)
            
            if tag_ids:
                placeholders = ', '.join(['%s'] * len(tag_ids))
                query += f" AND de.etiqueta_id IN ({placeholders})"
                params.extend(tag_ids)
            
            query += " ORDER BY d.created_at DESC"
            
            if limit:
                query += " LIMIT %s OFFSET %s"
                params.extend([limit, offset])
            
            return self.db.execute_query(query, params) or []
        except Exception as e:
            print(f"Error en búsqueda con filtros: {e}")
            return []


class DocumentTagRelation:
    """
    Modelo para gestionar las relaciones entre documentos y etiquetas.
    """
    
    def __init__(self, db_connection: MySQLConnection = None):
        self.db = db_connection if db_connection else MySQLConnection()
    
    def get_tags_by_document(self, document_id: int) -> List[Dict]:
        """
        Obtiene todas las etiquetas de un documento.
        
        Args:
            document_id (int): ID del documento
            
        Returns:
            List[Dict]: Lista de etiquetas
        """
        try:
            return self.db.execute_query(GET_TAGS_BY_DOCUMENT, (document_id,)) or []
        except Exception as e:
            print(f"Error al obtener etiquetas del documento {document_id}: {e}")
            return []
    
    def add_tag_to_document(self, document_id: int, tag_id: int) -> bool:
        """
        Agrega una etiqueta a un documento.
        
        Args:
            document_id (int): ID del documento
            tag_id (int): ID de la etiqueta
            
        Returns:
            bool: True si se agregó correctamente
        """
        try:
            result = self.db.execute_query(ADD_TAG_TO_DOCUMENT, (document_id, tag_id), fetch=False)
            return result is not None
        except Exception as e:
            print(f"Error al agregar etiqueta {tag_id} al documento {document_id}: {e}")
            return False
    
    def remove_tag_from_document(self, document_id: int, tag_id: int) -> bool:
        """
        Remueve una etiqueta de un documento.
        
        Args:
            document_id (int): ID del documento
            tag_id (int): ID de la etiqueta
            
        Returns:
            bool: True si se removió correctamente
        """
        try:
            result = self.db.execute_query(REMOVE_TAG_FROM_DOCUMENT, (document_id, tag_id), fetch=False)
            return result is not None
        except Exception as e:
            print(f"Error al remover etiqueta {tag_id} del documento {document_id}: {e}")
            return False
    
    def set_document_tags(self, document_id: int, tag_ids: List[int]) -> bool:
        """
        Establece las etiquetas de un documento (reemplaza todas las existentes).
        
        Args:
            document_id (int): ID del documento
            tag_ids (List[int]): Lista de IDs de etiquetas
            
        Returns:
            bool: True si se establecieron correctamente
        """
        try:
            # Primero remover todas las etiquetas existentes
            self.db.execute_query(REMOVE_ALL_TAGS_FROM_DOCUMENT, (document_id,), fetch=False)
            
            # Luego agregar las nuevas etiquetas
            for tag_id in tag_ids:
                self.add_tag_to_document(document_id, tag_id)
            
            return True
        except Exception as e:
            print(f"Error al establecer etiquetas del documento {document_id}: {e}")
            return False


class DocumentAudit:
    """
    Modelo para gestionar la auditoría de documentos.
    """
    
    def __init__(self, db_connection: MySQLConnection = None):
        self.db = db_connection if db_connection else MySQLConnection()
    
    def log_action(self, document_id: int, user_id: int, action: str,
                   ip_address: str = None, user_agent: str = None, 
                   details: str = None) -> bool:
        """
        Registra una acción en el log de auditoría.
        
        Args:
            document_id (int): ID del documento
            user_id (int): ID del usuario
            action (str): Tipo de acción ('subida', 'descarga', 'modificacion', 'eliminacion', 'vista')
            ip_address (str): Dirección IP del usuario
            user_agent (str): User agent del navegador
            details (str): Detalles adicionales de la acción
            
        Returns:
            bool: True si se registró correctamente
        """
        try:
            result = self.db.execute_query(
                LOG_DOCUMENT_ACTION,
                (document_id, user_id, action, ip_address, user_agent, details),
                fetch=False
            )
            return result is not None
        except Exception as e:
            print(f"Error al registrar acción '{action}' en documento {document_id}: {e}")
            return False
    
    def get_document_audit_log(self, document_id: int, limit: int = 50) -> List[Dict]:
        """
        Obtiene el log de auditoría de un documento.
        
        Args:
            document_id (int): ID del documento
            limit (int): Número máximo de registros
            
        Returns:
            List[Dict]: Lista de registros de auditoría
        """
        try:
            query = GET_DOCUMENT_AUDIT_LOG
            if limit:
                query += f" LIMIT {limit}"
            
            return self.db.execute_query(query, (document_id,)) or []
        except Exception as e:
            print(f"Error al obtener log de auditoría del documento {document_id}: {e}")
            return []
    
    def get_user_audit_log(self, user_id: int, limit: int = 50) -> List[Dict]:
        """
        Obtiene el log de auditoría de un usuario.
        
        Args:
            user_id (int): ID del usuario
            limit (int): Número máximo de registros
            
        Returns:
            List[Dict]: Lista de registros de auditoría
        """
        try:
            return self.db.execute_query(GET_USER_AUDIT_LOG, (user_id, limit)) or []
        except Exception as e:
            print(f"Error al obtener log de auditoría del usuario {user_id}: {e}")
            return [] 