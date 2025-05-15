import os
import shutil
import logging
import time
import fitz  # PyMuPDF
from PIL import Image
# Ya no se usa current_app directamente aquí para mayor flexibilidad.
# Se pasarán los directorios base en la inicialización.

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PDFProcessor:
    def __init__(self, base_dir_for_pdfs, base_dir_for_uploads):
        """
        Inicializa el procesador de PDF.
        Args:
            base_dir_for_pdfs: Directorio donde se guardarán los PDFs procesados (imágenes, etc.).
            base_dir_for_uploads: Directorio para los archivos PDF subidos temporalmente.
        """
        self.base_dir_for_pdfs = base_dir_for_pdfs
        self.base_dir_for_uploads = base_dir_for_uploads
        
        # Asegurar que los directorios base existan
        os.makedirs(self.base_dir_for_pdfs, exist_ok=True)
        os.makedirs(self.base_dir_for_uploads, exist_ok=True)
        
        logger.info(f"PDFProcessor: Directorio para PDFs procesados: {self.base_dir_for_pdfs}")
        logger.info(f"PDFProcessor: Directorio para uploads temporales: {self.base_dir_for_uploads}")

        self.current_progress = {
            "status": "idle",
            "current_file": None,
            "current_page": 0,
            "total_pages": 0,
            "percentage": 0
        }
    
    def get_progress(self):
        """Devuelve el estado actual del procesamiento."""
        return self.current_progress
    
    def process_pdf(self, pdf_temp_path, delete_after=False):
        """
        Procesa un PDF extrayendo cada página en una imagen WEBP.
        Args:
            pdf_temp_path: Ruta al archivo PDF subido temporalmente.
            delete_after: Si se debe eliminar el PDF temporal después del procesamiento.
        Returns:
            dict: Información del procesamiento.
        """
        pdf_filename = os.path.basename(pdf_temp_path)
        pdf_name_without_ext = os.path.splitext(pdf_filename)[0]
        
        self.current_progress = {
            "status": "processing",
            "current_file": pdf_filename,
            "current_page": 0,
            "total_pages": 0,
            "percentage": 0,
            "start_time": time.time()
        }
        
        # Directorio específico para este PDF dentro de base_dir_for_pdfs
        # Se usará el nombre del PDF sin extensión como nombre de la carpeta
        pdf_output_dir = os.path.join(self.base_dir_for_pdfs, pdf_name_without_ext)
        os.makedirs(pdf_output_dir, exist_ok=True)
        
        # Guardar una copia del PDF original en la carpeta de salida (procesados)
        original_pdf_in_output_path = os.path.join(pdf_output_dir, pdf_filename)
        
        try:
            shutil.copy2(pdf_temp_path, original_pdf_in_output_path)
            logger.info(f"PDF original copiado para almacenamiento a: {original_pdf_in_output_path}")
            
            doc = fitz.open(pdf_temp_path)
            total_pages = doc.page_count
            self.current_progress["total_pages"] = total_pages
            generated_images_relative_paths = []
            thumbnail_relative_path = None

            for i in range(total_pages):
                page = doc.load_page(i)

                # --- INICIO DE CAMBIOS PARA ANCHO FIJO ---
                target_width_px = 2000
                original_rect = page.rect  # Obtiene el rectángulo de la página (x0, y0, x1, y1)
                original_width_points = original_rect.width
                # original_height_points = original_rect.height # No se usa directamente para calcular zoom_x

                if original_width_points == 0: # Evitar división por cero
                    zoom_x = 1.0 
                else:
                    zoom_x = target_width_px / original_width_points
                
                zoom_y = zoom_x # Mantener proporción, así que el zoom es igual en ambas direcciones

                matrix = fitz.Matrix(zoom_x, zoom_y)
                # alpha=False puede ayudar si no necesitas transparencia y optimizar un poco
                pix = page.get_pixmap(matrix=matrix, alpha=False) 
                # --- FIN DE CAMBIOS PARA ANCHO FIJO ---
                
                mode = "RGB" # Si alpha=False, el modo debería ser RGB
                if pix.alpha:
                    logger.warning(f"Pixmap para la página {i+1} de {pdf_filename} inesperadamente tiene canal alfa a pesar de alpha=False.")
                    mode = "RGBA" # Fallback si acaso
                
                img = Image.frombytes(mode, (pix.width, pix.height), pix.samples)
                
                webp_filename = f"page_{i+1}.webp"
                webp_full_path = os.path.join(pdf_output_dir, webp_filename)
                img.save(webp_full_path, "WEBP", lossless=True) # Mantener lossless=True
                
                # Guardar ruta relativa para la respuesta JSON y uso en el frontend
                generated_images_relative_paths.append(os.path.join(pdf_name_without_ext, webp_filename))
                
                self.current_progress["current_page"] = i + 1
                self.current_progress["percentage"] = int(((i + 1) / total_pages) * 100)
                if (i + 1) % 10 == 0 or (i+1) == total_pages : # Loguear cada 10 pags o la ultima
                    logger.info(f"Procesada página {i+1} de {total_pages} para {pdf_filename}")
            
            doc.close()

            if generated_images_relative_paths:
                # Crear miniatura a partir de la primera página (usando su ruta completa para abrirla)
                first_image_full_path = os.path.join(pdf_output_dir, os.path.basename(generated_images_relative_paths[0]))
                thumb_full_path = self.create_thumbnail_from_image(first_image_full_path, pdf_output_dir, pdf_name_without_ext)
                if thumb_full_path:
                    thumbnail_relative_path = os.path.join(pdf_name_without_ext, os.path.basename(thumb_full_path))

            if delete_after:
                try:
                    time.sleep(0.5) # Pequeña espera por si el archivo aún está en uso
                    os.remove(pdf_temp_path)
                    logger.info(f"PDF temporal eliminado: {pdf_temp_path}")
                except Exception as e_del:
                    logger.warning(f"No se pudo eliminar el PDF temporal ({pdf_temp_path}): {str(e_del)}")
            
            end_time = time.time()
            processing_time = end_time - self.current_progress["start_time"]
            self.current_progress["status"] = "completed"
            logger.info(f"Procesamiento de '{pdf_filename}' completado: {total_pages} páginas en {processing_time:.2f} segundos.")
            
            return {
                "success": True,
                "pdf_name": pdf_name_without_ext, # Nombre base del PDF
                "original_pdf_stored_path": os.path.join(pdf_name_without_ext, pdf_filename), # Ruta relativa al original almacenado
                "pages": total_pages,
                "images_relative_paths": generated_images_relative_paths, # Rutas relativas de las imágenes
                "thumbnail_relative_path": thumbnail_relative_path, # Ruta relativa de la miniatura
                "processing_time": processing_time
            }
            
        except Exception as e:
            self.current_progress.update({
                "status": "error",
                "error": str(e),
            })
            logger.error(f"Error procesando PDF {pdf_temp_path}: {str(e)}", exc_info=True)
            # Si falla, intentar eliminar el directorio de salida parcial si se creó
            if os.path.exists(pdf_output_dir):
                try:
                    shutil.rmtree(pdf_output_dir)
                    logger.info(f"Directorio de salida parcial eliminado: {pdf_output_dir}")
                except Exception as e_rm:
                    logger.error(f"Error eliminando directorio de salida parcial {pdf_output_dir}: {str(e_rm)}")
            return {
                "success": False,
                "error": str(e),
                "pdf_path_original": pdf_temp_path
            }

    def create_thumbnail_from_image(self, image_full_path, pdf_output_dir, pdf_name_prefix):
        """
        Crea una miniatura a partir de una imagen dada.
        Args:
            image_full_path: Ruta completa a la imagen fuente.
            pdf_output_dir: Directorio donde se guardará la miniatura.
            pdf_name_prefix: Nombre del PDF (sin extensión) para nombrar la miniatura.
        Returns:
            str: Ruta completa a la miniatura creada, o None si falla.
        """
        try:
            img = Image.open(image_full_path) # image_full_path es la page_1.webp (ahora de 2000px de ancho)
            
            # --- INICIO DE CAMBIOS PARA ANCHO FIJO DE MINIATURA ---
            target_thumb_width = 500
            original_width, original_height = img.size

            if original_width == 0: # Evitar división por cero
                # Si el ancho original es 0, la imagen fuente probablemente está corrupta o vacía.
                # Se podría intentar un alto fijo o devolver None.
                # Por ahora, si original_width es 0, se intentará un alto basado en una relación 1:1 si original_height también es 0.
                target_thumb_height = int(target_thumb_width * (original_height / 1.0 if original_width == 0 and original_height != 0 else 1.0))
                if original_height == 0 and original_width == 0 : target_thumb_height = target_thumb_width
            else:
                aspect_ratio = original_height / original_width
                target_thumb_height = int(target_thumb_width * aspect_ratio)

            # Redimensionar a las nuevas dimensiones calculadas
            # Usar Image.Resampling.LANCZOS para mejor calidad de reducción (Pillow >= 9.1.0)
            # Para versiones anteriores, podría ser Image.LANCZOS o Image.ANTIALIAS
            try:
                resampling_filter = Image.Resampling.LANCZOS
            except AttributeError:
                resampling_filter = Image.LANCZOS # Fallback para versiones antiguas de Pillow
            
            img_resized = img.resize((target_thumb_width, target_thumb_height), resampling_filter)
            # --- FIN DE CAMBIOS PARA ANCHO FIJO DE MINIATURA ---

            thumbnail_filename = f"thumb_{pdf_name_prefix}.webp"
            thumbnail_full_path = os.path.join(pdf_output_dir, thumbnail_filename)
            # Guardar la imagen redimensionada con lossless=True
            img_resized.save(thumbnail_full_path, "WEBP", lossless=True)
            
            logger.info(f"Miniatura creada con ancho {target_thumb_width}px: {thumbnail_full_path}")
            return thumbnail_full_path
        except Exception as e:
            logger.error(f"Error al crear miniatura desde {image_full_path}: {str(e)}")
            return None 