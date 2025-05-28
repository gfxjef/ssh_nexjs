"""
Procesador de PDFs profesional con S3 y Base de Datos
Arquitectura moderna para gestión de catálogos
"""

import os
import io
import time
import logging
import fitz  # PyMuPDF
from PIL import Image
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import hashlib

from .models import (
    CatalogoManager, Catalogo, CatalogoDoc, 
    EstadoCatalogo, TipoArchivo, EstadoArchivo
)
from utils.upload_utils import S3UploadManager, UploadType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PDFProcessorS3:
    """
    Procesador de PDFs profesional que usa S3 y base de datos
    """
    
    def __init__(self):
        """Inicializar procesador con S3 y gestor de catálogos"""
        self.s3_manager = S3UploadManager()
        self.catalogo_manager = CatalogoManager()
        
        # Configuración de procesamiento
        self.config = {
            'target_width_px': 1200,  # Ancho objetivo para páginas
            'thumbnail_width': 300,   # Ancho de thumbnails
            'webp_quality': 85,       # Calidad WEBP
            'batch_size': 5,          # Páginas por lote
            'max_file_size': 100 * 1024 * 1024  # 100MB máximo
        }
        
        # Estado del procesamiento actual
        self.current_progress = {
            "status": "idle",
            "catalogo_id": None,
            "current_file": None,
            "current_page": 0,
            "total_pages": 0,
            "percentage": 0,
            "start_time": None,
            "errors": []
        }
    
    def get_progress(self) -> Dict:
        """Obtiene el estado actual del procesamiento"""
        return self.current_progress.copy()
    
    def process_pdf_complete(self, pdf_file_data, filename: str, 
                           descripcion: str = "", categoria: str = "general",
                           usuario_id: Optional[int] = None) -> Dict:
        """
        Procesa un PDF completo: crea catálogo, sube archivos a S3 y registra en BD
        
        Args:
            pdf_file_data: Datos del archivo PDF (bytes o file-like object)
            filename: Nombre del archivo PDF
            descripcion: Descripción del catálogo
            categoria: Categoría del catálogo
            usuario_id: ID del usuario que sube el archivo
            
        Returns:
            Dict: Resultado del procesamiento completo
        """
        start_time = time.time()
        catalogo_id = None
        
        try:
            # 1. Validar archivo PDF
            if hasattr(pdf_file_data, 'read'):
                pdf_bytes = pdf_file_data.read()
                pdf_file_data.seek(0)  # Reset para uso posterior
            else:
                pdf_bytes = pdf_file_data
            
            if len(pdf_bytes) > self.config['max_file_size']:
                return {
                    'success': False,
                    'error': f'Archivo muy grande. Máximo: {self.config["max_file_size"] / (1024*1024):.1f}MB'
                }
            
            # 2. Crear registro de catálogo en BD
            nombre_sin_extension = os.path.splitext(filename)[0]
            catalogo = Catalogo(
                nombre=nombre_sin_extension,
                descripcion=descripcion,
                categoria=categoria,
                estado=EstadoCatalogo.PROCESANDO,
                usuario_id=usuario_id,
                tamaño_archivo=len(pdf_bytes),
                nombre_archivo_original=filename
            )
            
            catalogo_id = self.catalogo_manager.crear_catalogo(catalogo)
            if not catalogo_id:
                return {'success': False, 'error': 'Error creando registro de catálogo'}
            
            logger.info(f"✅ Catálogo creado con ID: {catalogo_id}")
            
            # 3. Inicializar progreso
            self.current_progress.update({
                "status": "processing",
                "catalogo_id": catalogo_id,
                "current_file": filename,
                "start_time": start_time,
                "errors": []
            })
            
            # 4. Subir PDF original a S3
            pdf_s3_result = self._upload_pdf_original(catalogo_id, filename, pdf_bytes)
            if not pdf_s3_result['success']:
                self._handle_error(catalogo_id, f"Error subiendo PDF: {pdf_s3_result['error']}")
                return pdf_s3_result
            
            # 5. Procesar páginas del PDF
            pages_result = self._process_pdf_pages(catalogo_id, pdf_bytes, filename)
            if not pages_result['success']:
                self._handle_error(catalogo_id, f"Error procesando páginas: {pages_result['error']}")
                return pages_result
            
            # 6. Crear thumbnail
            thumbnail_result = self._create_thumbnail_s3(catalogo_id, pages_result['first_page_data'])
            if not thumbnail_result['success']:
                logger.warning(f"Error creando thumbnail: {thumbnail_result['error']}")
            
            # 7. Actualizar catálogo como completado
            metadatos_procesamiento = {
                'tiempo_procesamiento': time.time() - start_time,
                'configuracion': self.config,
                'fecha_procesamiento': datetime.now().isoformat(),
                'archivos_generados': {
                    'pdf_original': pdf_s3_result.get('url'),
                    'total_paginas': pages_result.get('total_pages', 0),
                    'thumbnail': thumbnail_result.get('url') if thumbnail_result['success'] else None
                }
            }
            
            self.catalogo_manager.actualizar_estado_catalogo(
                catalogo_id, 
                EstadoCatalogo.ACTIVO, 
                metadatos_procesamiento
            )
            
            self.catalogo_manager.actualizar_total_paginas(
                catalogo_id, 
                pages_result.get('total_pages', 0)
            )
            
            # 8. Finalizar progreso
            self.current_progress.update({
                "status": "completed",
                "percentage": 100
            })
            
            processing_time = time.time() - start_time
            logger.info(f"✅ Procesamiento completado en {processing_time:.2f}s - Catálogo ID: {catalogo_id}")
            
            # 9. Obtener información completa del catálogo
            catalogo_completo = self.catalogo_manager.obtener_catalogo_completo(catalogo_id)
            
            return {
                'success': True,
                'catalogo_id': catalogo_id,
                'nombre': nombre_sin_extension,
                'total_pages': pages_result.get('total_pages', 0),
                'processing_time': processing_time,
                'pdf_url': pdf_s3_result.get('url'),
                'thumbnail_url': thumbnail_result.get('url') if thumbnail_result['success'] else None,
                'catalogo_completo': catalogo_completo,
                'message': f'Catálogo procesado exitosamente: {pages_result.get("total_pages", 0)} páginas'
            }
            
        except Exception as e:
            error_msg = f"Error inesperado procesando PDF: {str(e)}"
            logger.error(error_msg, exc_info=True)
            
            if catalogo_id:
                self._handle_error(catalogo_id, error_msg)
            
            self.current_progress.update({
                "status": "error",
                "error": error_msg
            })
            
            return {
                'success': False,
                'error': error_msg,
                'catalogo_id': catalogo_id
            }
    
    def _upload_pdf_original(self, catalogo_id: int, filename: str, pdf_bytes: bytes) -> Dict:
        """Sube el PDF original a S3 y registra en BD"""
        try:
            # Generar S3 key
            s3_key = f"pdf/{catalogo_id}/{filename}"
            
            # Subir a S3
            pdf_file_obj = io.BytesIO(pdf_bytes)
            success, s3_url, error_msg = self.s3_manager.upload_file(
                pdf_file_obj, 
                s3_key, 
                UploadType.PDF
            )
            
            if not success:
                return {'success': False, 'error': error_msg}
            
            # Calcular checksum
            checksum = hashlib.md5(pdf_bytes).hexdigest()
            
            # Registrar en BD
            doc = CatalogoDoc(
                catalogo_id=catalogo_id,
                tipo_archivo=TipoArchivo.PDF_ORIGINAL,
                nombre_archivo=filename,
                url_s3=s3_url,
                s3_key=s3_key,
                tamaño_archivo=len(pdf_bytes),
                mime_type='application/pdf',
                checksum_md5=checksum,
                metadatos={
                    'original': True,
                    'uploaded_at': datetime.now().isoformat()
                }
            )
            
            doc_id = self.catalogo_manager.crear_documento(doc)
            if not doc_id:
                return {'success': False, 'error': 'Error registrando PDF en BD'}
            
            logger.info(f"✅ PDF original subido: {s3_url}")
            return {
                'success': True,
                'url': s3_url,
                's3_key': s3_key,
                'doc_id': doc_id
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _process_pdf_pages(self, catalogo_id: int, pdf_bytes: bytes, filename: str) -> Dict:
        """Procesa todas las páginas del PDF y las sube a S3"""
        try:
            # Abrir PDF
            pdf_file_obj = io.BytesIO(pdf_bytes)
            doc = fitz.open(stream=pdf_file_obj, filetype="pdf")
            total_pages = doc.page_count
            
            self.current_progress.update({
                "total_pages": total_pages,
                "current_page": 0
            })
            
            logger.info(f"📄 Procesando {total_pages} páginas del PDF")
            
            generated_pages = []
            first_page_data = None
            batch_size = self.config['batch_size']
            
            # Procesar en lotes
            for batch_start in range(0, total_pages, batch_size):
                batch_end = min(batch_start + batch_size, total_pages)
                logger.info(f"🔄 Procesando lote {batch_start+1}-{batch_end} de {total_pages}")
                
                for i in range(batch_start, batch_end):
                    page_result = self._process_single_page(catalogo_id, doc, i + 1)
                    
                    if page_result['success']:
                        generated_pages.append(page_result)
                        
                        # Guardar datos de la primera página para thumbnail
                        if i == 0:
                            first_page_data = page_result['image_data']
                    else:
                        logger.warning(f"⚠️ Error procesando página {i+1}: {page_result['error']}")
                    
                    # Actualizar progreso
                    self.current_progress.update({
                        "current_page": i + 1,
                        "percentage": int(((i + 1) / total_pages) * 90)  # 90% para páginas, 10% para thumbnail
                    })
                
                # Liberar memoria entre lotes
                if batch_end < total_pages:
                    import gc
                    gc.collect()
            
            doc.close()
            
            logger.info(f"✅ Procesadas {len(generated_pages)} páginas exitosamente")
            
            return {
                'success': True,
                'total_pages': total_pages,
                'pages_processed': len(generated_pages),
                'pages_data': generated_pages,
                'first_page_data': first_page_data
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _process_single_page(self, catalogo_id: int, doc, page_number: int) -> Dict:
        """Procesa una página individual del PDF"""
        try:
            page = doc.load_page(page_number - 1)  # fitz usa índice 0
            
            # Configurar resolución
            original_rect = page.rect
            original_width_points = original_rect.width
            
            if original_width_points == 0:
                zoom_x = 1.0
            else:
                zoom_x = self.config['target_width_px'] / original_width_points
            
            zoom_y = zoom_x
            matrix = fitz.Matrix(zoom_x, zoom_y)
            
            # Renderizar página
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            mode = "RGB"
            
            if pix.alpha:
                mode = "RGBA"
            
            # Convertir a imagen PIL
            img = Image.frombytes(mode, (pix.width, pix.height), pix.samples)
            
            # Convertir a WEBP en memoria
            webp_buffer = io.BytesIO()
            img.save(webp_buffer, "WEBP", quality=self.config['webp_quality'], method=6)
            webp_bytes = webp_buffer.getvalue()
            
            # Generar nombre y S3 key
            webp_filename = f"page_{page_number}.webp"
            s3_key = f"pdf/{catalogo_id}/{webp_filename}"
            
            # Subir a S3
            webp_file_obj = io.BytesIO(webp_bytes)
            success, s3_url, error_msg = self.s3_manager.upload_file(
                webp_file_obj,
                s3_key,
                UploadType.PDF
            )
            
            if not success:
                return {'success': False, 'error': error_msg}
            
            # Calcular checksum
            checksum = hashlib.md5(webp_bytes).hexdigest()
            
            # Registrar en BD
            doc = CatalogoDoc(
                catalogo_id=catalogo_id,
                tipo_archivo=TipoArchivo.PAGINA_WEBP,
                nombre_archivo=webp_filename,
                url_s3=s3_url,
                s3_key=s3_key,
                numero_pagina=page_number,
                tamaño_archivo=len(webp_bytes),
                mime_type='image/webp',
                checksum_md5=checksum,
                metadatos={
                    'width': pix.width,
                    'height': pix.height,
                    'quality': self.config['webp_quality'],
                    'original_width_points': original_width_points,
                    'zoom_factor': zoom_x
                }
            )
            
            doc_id = self.catalogo_manager.crear_documento(doc)
            
            # Liberar memoria
            img.close()
            pix = None
            webp_buffer.close()
            webp_file_obj.close()
            
            return {
                'success': True,
                'page_number': page_number,
                'url': s3_url,
                's3_key': s3_key,
                'doc_id': doc_id,
                'size_bytes': len(webp_bytes),
                'image_data': webp_bytes  # Para thumbnail
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _create_thumbnail_s3(self, catalogo_id: int, first_page_data: bytes) -> Dict:
        """Crea thumbnail a partir de la primera página y lo sube a S3"""
        try:
            if not first_page_data:
                return {'success': False, 'error': 'No hay datos de primera página'}
            
            # Abrir imagen de primera página
            img = Image.open(io.BytesIO(first_page_data))
            
            # Redimensionar para thumbnail
            original_width, original_height = img.size
            target_width = self.config['thumbnail_width']
            
            if original_width == 0:
                target_height = target_width
            else:
                aspect_ratio = original_height / original_width
                target_height = int(target_width * aspect_ratio)
            
            # Redimensionar
            try:
                resampling_filter = Image.Resampling.LANCZOS
            except AttributeError:
                resampling_filter = Image.LANCZOS
            
            img_resized = img.resize((target_width, target_height), resampling_filter)
            
            # Convertir a WEBP
            thumbnail_buffer = io.BytesIO()
            img_resized.save(thumbnail_buffer, "WEBP", quality=80, method=6)
            thumbnail_bytes = thumbnail_buffer.getvalue()
            
            # Generar nombre y S3 key
            thumbnail_filename = f"thumbnail.webp"
            s3_key = f"pdf/{catalogo_id}/{thumbnail_filename}"
            
            # Subir a S3
            thumbnail_file_obj = io.BytesIO(thumbnail_bytes)
            success, s3_url, error_msg = self.s3_manager.upload_file(
                thumbnail_file_obj,
                s3_key,
                UploadType.PDF
            )
            
            if not success:
                return {'success': False, 'error': error_msg}
            
            # Calcular checksum
            checksum = hashlib.md5(thumbnail_bytes).hexdigest()
            
            # Registrar en BD
            doc = CatalogoDoc(
                catalogo_id=catalogo_id,
                tipo_archivo=TipoArchivo.THUMBNAIL,
                nombre_archivo=thumbnail_filename,
                url_s3=s3_url,
                s3_key=s3_key,
                tamaño_archivo=len(thumbnail_bytes),
                mime_type='image/webp',
                checksum_md5=checksum,
                metadatos={
                    'width': target_width,
                    'height': target_height,
                    'quality': 80,
                    'generated_from': 'page_1'
                }
            )
            
            doc_id = self.catalogo_manager.crear_documento(doc)
            
            # Liberar memoria
            img.close()
            img_resized.close()
            thumbnail_buffer.close()
            thumbnail_file_obj.close()
            
            logger.info(f"✅ Thumbnail creado: {s3_url}")
            
            return {
                'success': True,
                'url': s3_url,
                's3_key': s3_key,
                'doc_id': doc_id,
                'size_bytes': len(thumbnail_bytes)
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _handle_error(self, catalogo_id: int, error_message: str):
        """Maneja errores durante el procesamiento"""
        logger.error(f"❌ Error en catálogo {catalogo_id}: {error_message}")
        
        # Actualizar estado en BD
        self.catalogo_manager.actualizar_estado_catalogo(
            catalogo_id,
            EstadoCatalogo.ERROR,
            {'error': error_message, 'timestamp': datetime.now().isoformat()}
        )
        
        # Actualizar progreso
        self.current_progress.update({
            "status": "error",
            "errors": self.current_progress.get("errors", []) + [error_message]
        })
    
    def delete_catalogo_complete(self, catalogo_id: int) -> Dict:
        """
        Elimina un catálogo completo: archivos de S3 y registros de BD
        
        Args:
            catalogo_id: ID del catálogo a eliminar
            
        Returns:
            Dict: Resultado de la eliminación
        """
        try:
            # 1. Obtener todos los documentos del catálogo
            documentos = self.catalogo_manager.obtener_documentos_catalogo(catalogo_id)
            
            if not documentos:
                logger.warning(f"No se encontraron documentos para catálogo {catalogo_id}")
            
            # 2. Eliminar archivos de S3
            s3_errors = []
            for doc in documentos:
                try:
                    success = self.s3_manager.delete_file(doc['url_s3'])
                    if not success:
                        s3_errors.append(f"Error eliminando {doc['s3_key']}")
                    else:
                        logger.info(f"✅ Eliminado de S3: {doc['s3_key']}")
                except Exception as e:
                    s3_errors.append(f"Error eliminando {doc['s3_key']}: {str(e)}")
            
            # 3. Eliminar registros de BD (CASCADE eliminará documentos automáticamente)
            success = self.catalogo_manager.eliminar_catalogo(catalogo_id)
            
            if not success:
                return {
                    'success': False,
                    'error': 'Error eliminando catálogo de base de datos',
                    's3_errors': s3_errors
                }
            
            logger.info(f"✅ Catálogo {catalogo_id} eliminado completamente")
            
            return {
                'success': True,
                'message': f'Catálogo {catalogo_id} eliminado exitosamente',
                'archivos_eliminados': len(documentos),
                's3_errors': s3_errors if s3_errors else None
            }
            
        except Exception as e:
            error_msg = f"Error eliminando catálogo {catalogo_id}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {'success': False, 'error': error_msg}
    
    def get_catalogo_info(self, catalogo_id: int) -> Optional[Dict]:
        """Obtiene información completa de un catálogo"""
        return self.catalogo_manager.obtener_catalogo_completo(catalogo_id)
    
    def list_catalogos(self, **kwargs) -> List[Dict]:
        """Lista catálogos con filtros"""
        return self.catalogo_manager.listar_catalogos(**kwargs)
    
    def get_statistics(self) -> Dict:
        """Obtiene estadísticas del sistema"""
        return self.catalogo_manager.obtener_estadisticas_catalogos() 