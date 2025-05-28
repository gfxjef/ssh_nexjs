    def obtener_pdf_original(self, catalogo_id):
        """
        Obtiene información del PDF original de un catálogo específico
        """
        try:
            cursor = self.db.get_cursor()
            
            # Buscar el documento PDF original
            cursor.execute("""
                SELECT 
                    cd.nombre_archivo,
                    cd.url_s3,
                    c.nombre as catalogo_nombre
                FROM catalogos_docs cd
                INNER JOIN catalogos c ON cd.catalogo_id = c.id
                WHERE cd.catalogo_id = %s 
                AND cd.tipo_documento = 'pdf_original'
                LIMIT 1
            """, (catalogo_id,))
            
            resultado = cursor.fetchone()
            
            if resultado:
                return {
                    'nombre_archivo': resultado[0],
                    'url_s3': resultado[1],
                    'catalogo_nombre': resultado[2],
                    'catalogo_id': catalogo_id
                }
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error obteniendo PDF original: {str(e)}", exc_info=True)
            return None
        finally:
            self.db.close_connection()