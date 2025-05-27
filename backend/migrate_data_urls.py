#!/usr/bin/env python3
"""
Script para migrar URLs en la base de datos al sistema centralizado de uploads.
NO mueve archivos físicos, solo actualiza las rutas en BD.
Los archivos se subirán nuevamente después.
"""

import sys
import os
import logging
from datetime import datetime

# Añadir el directorio padre al path para poder importar módulos
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.mysql_connection import MySQLConnection

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class URLMigrator:
    """Clase para migrar URLs de la base de datos al sistema centralizado"""
    
    def __init__(self):
        self.db = MySQLConnection()
        self.migration_log = []
        
    def log_change(self, table, field, old_url, new_url, record_id):
        """Registra un cambio realizado"""
        change = {
            'timestamp': datetime.now().isoformat(),
            'table': table,
            'field': field,
            'id': record_id,
            'old_url': old_url,
            'new_url': new_url
        }
        self.migration_log.append(change)
        logger.info(f"✅ {table}.{field} [ID:{record_id}]: {old_url} → {new_url}")
    
    def migrate_posts_images(self):
        """Migra URLs de imágenes en posts de bienestar"""
        logger.info("🔄 Migrando URLs de imágenes en posts...")
        
        # Obtener todos los posts con imágenes
        query = """
        SELECT id, imagen_url, contenido 
        FROM posts_bienestar 
        WHERE imagen_url IS NOT NULL AND imagen_url != ''
        """
        
        posts = self.db.execute_query(query)
        if not posts:
            logger.info("📭 No se encontraron posts con imágenes")
            return
        
        migrated_count = 0
        
        for post in posts:
            post_id = post['id']
            old_imagen_url = post['imagen_url']
            contenido = post['contenido']
            
            # Actualizar imagen_url principal (convertir a nueva estructura)
            new_imagen_url = self.convert_url_to_centralized(old_imagen_url, 'posts')
            
            if new_imagen_url != old_imagen_url:
                update_query = """
                UPDATE posts_bienestar 
                SET imagen_url = %s 
                WHERE id = %s
                """
                
                result = self.db.execute_query(update_query, (new_imagen_url, post_id), fetch=False)
                if result:
                    self.log_change('posts_bienestar', 'imagen_url', old_imagen_url, new_imagen_url, post_id)
                    migrated_count += 1
            
            # Actualizar URLs en el contenido HTML (imágenes incrustadas)
            if contenido:
                new_contenido = self.update_content_urls(contenido, 'posts')
                if new_contenido != contenido:
                    update_content_query = """
                    UPDATE posts_bienestar 
                    SET contenido = %s 
                    WHERE id = %s
                    """
                    
                    result = self.db.execute_query(update_content_query, (new_contenido, post_id), fetch=False)
                    if result:
                        logger.info(f"✅ Contenido actualizado para post ID:{post_id}")
        
        logger.info(f"✅ Migración de posts completada: {migrated_count} registros actualizados")
    
    def migrate_documents(self):
        """Migra URLs de documentos"""
        logger.info("🔄 Migrando URLs de documentos...")
        
        # Obtener todos los documentos
        query = """
        SELECT id, ruta_archivo, nombre_archivo 
        FROM documentos 
        WHERE ruta_archivo IS NOT NULL AND ruta_archivo != ''
        """
        
        documentos = self.db.execute_query(query)
        if not documentos:
            logger.info("📭 No se encontraron documentos")
            return
        
        migrated_count = 0
        
        for doc in documentos:
            doc_id = doc['id']
            old_ruta = doc['ruta_archivo']
            
            # Convertir ruta a nueva estructura
            new_ruta = self.convert_url_to_centralized(old_ruta, 'documentos')
            
            if new_ruta != old_ruta:
                update_query = """
                UPDATE documentos 
                SET ruta_archivo = %s 
                WHERE id = %s
                """
                
                result = self.db.execute_query(update_query, (new_ruta, doc_id), fetch=False)
                if result:
                    self.log_change('documentos', 'ruta_archivo', old_ruta, new_ruta, doc_id)
                    migrated_count += 1
        
        logger.info(f"✅ Migración de documentos completada: {migrated_count} registros actualizados")
    
    def migrate_pdf_data(self):
        """Actualiza información de PDFs para nueva estructura"""
        logger.info("🔄 Actualizando información de PDFs...")
        
        # Nota: Los PDFs se procesan dinámicamente, pero podríamos tener metadatos en BD
        # Por ahora, solo registramos que esta migración está lista
        logger.info("✅ Migración de PDFs preparada (se procesarán automáticamente)")
    
    def convert_url_to_centralized(self, old_url, upload_type):
        """Convierte una URL antigua al formato centralizado"""
        if not old_url:
            return old_url
        
        # Si ya está en formato centralizado, no cambiar
        if f'/uploads/{upload_type}/' in old_url:
            return old_url
        
        # Extraer nombre del archivo de la URL antigua
        filename = os.path.basename(old_url)
        
        # Construir nueva URL centralizada
        new_url = f"/uploads/{upload_type}/{filename}"
        
        return new_url
    
    def update_content_urls(self, content, upload_type):
        """Actualiza URLs dentro del contenido HTML"""
        if not content:
            return content
        
        import re
        
        # Patrones para encontrar URLs de imágenes en HTML
        patterns = [
            r'src="([^"]*/(uploads|backend/uploads)/[^"]*)"',
            r"src='([^']*/(uploads|backend/uploads)/[^']*)'",
            r'href="([^"]*/(uploads|backend/uploads)/[^"]*)"',
            r"href='([^']*/(uploads|backend/uploads)/[^']*)'",
        ]
        
        updated_content = content
        
        for pattern in patterns:
            matches = re.findall(pattern, updated_content)
            for match in matches:
                old_url = match[0] if isinstance(match, tuple) else match
                filename = os.path.basename(old_url)
                new_url = f"/uploads/{upload_type}/{filename}"
                
                updated_content = updated_content.replace(old_url, new_url)
        
        return updated_content
    
    def create_backup_script(self):
        """Crea un script de respaldo de las URLs originales"""
        backup_file = f"url_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
        
        backup_queries = [
            "-- Backup de URLs originales antes de migración",
            f"-- Generado: {datetime.now().isoformat()}",
            "",
            "-- Posts",
            "CREATE TABLE IF NOT EXISTS posts_backup_urls AS",
            "SELECT id, imagen_url, contenido FROM posts_bienestar WHERE imagen_url IS NOT NULL;",
            "",
            "-- Documentos", 
            "CREATE TABLE IF NOT EXISTS documentos_backup_urls AS",
            "SELECT id, ruta_archivo FROM documentos WHERE ruta_archivo IS NOT NULL;",
        ]
        
        with open(backup_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(backup_queries))
        
        logger.info(f"📝 Script de backup creado: {backup_file}")
        return backup_file
    
    def generate_migration_report(self):
        """Genera un reporte de la migración"""
        report_file = f"migration_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        import json
        
        report = {
            'migration_date': datetime.now().isoformat(),
            'total_changes': len(self.migration_log),
            'changes_by_table': {},
            'changes': self.migration_log
        }
        
        # Agrupar cambios por tabla
        for change in self.migration_log:
            table = change['table']
            if table not in report['changes_by_table']:
                report['changes_by_table'][table] = 0
            report['changes_by_table'][table] += 1
        
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        logger.info(f"📊 Reporte de migración generado: {report_file}")
        return report_file
    
    def run_migration(self):
        """Ejecuta la migración completa"""
        logger.info("🚀 Iniciando migración de URLs a sistema centralizado")
        logger.info("⚠️  NOTA: No se mueven archivos físicos, solo se actualizan URLs en BD")
        
        try:
            # Crear backup
            backup_file = self.create_backup_script()
            
            # Ejecutar migraciones
            self.migrate_posts_images()
            self.migrate_documents() 
            self.migrate_pdf_data()
            
            # Generar reporte
            report_file = self.generate_migration_report()
            
            logger.info("🎉 Migración completada exitosamente")
            logger.info(f"📝 Backup: {backup_file}")
            logger.info(f"📊 Reporte: {report_file}")
            logger.info(f"🔄 Total de cambios: {len(self.migration_log)}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error durante la migración: {str(e)}")
            return False

def main():
    """Función principal"""
    print("=" * 60)
    print("🔄 MIGRACIÓN DE URLs AL SISTEMA CENTRALIZADO")
    print("=" * 60)
    print("⚠️  IMPORTANTE: Este script NO mueve archivos físicos")
    print("   Solo actualiza las URLs en la base de datos")
    print("   Los archivos se subirán nuevamente después")
    print("=" * 60)
    
    response = input("¿Continuar con la migración? (y/N): ")
    if response.lower() not in ['y', 'yes', 'sí', 's']:
        print("❌ Migración cancelada")
        return
    
    migrator = URLMigrator()
    success = migrator.run_migration()
    
    if success:
        print("\n✅ Migración completada exitosamente")
        print("📝 Archivos generados:")
        print("   - Script de backup SQL")
        print("   - Reporte de migración JSON")
        print("\n🔄 Próximos pasos:")
        print("   1. Verificar que las URLs en BD apuntan al sistema centralizado")
        print("   2. Subir archivos nuevamente al directorio frontend/public/uploads/")
        print("   3. Probar endpoints de upload y descarga")
    else:
        print("\n❌ Error durante la migración")
        print("   Revisar logs para más detalles")

if __name__ == "__main__":
    main() 