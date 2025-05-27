#!/usr/bin/env python3
"""
Test simplificado de la arquitectura S3 + Base de Datos
Prueba migración, modelos y procesador (sin requests)
"""

import os
import sys
import time
import logging
from pathlib import Path
from io import BytesIO

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configurar variables de entorno para testing
# NOTA: Configurar estas variables en el entorno antes de ejecutar
# os.environ['AWS_ACCESS_KEY_ID'] = 'TU_ACCESS_KEY'
# os.environ['AWS_SECRET_ACCESS_KEY'] = 'TU_SECRET_KEY'
os.environ['AWS_DEFAULT_REGION'] = 'us-east-2'
os.environ['S3_BUCKET'] = 'redkossodo'

# Agregar backend al path
backend_dir = Path(__file__).parent / "backend"
sys.path.append(str(backend_dir))


def test_1_migration():
    """Test 1: Migración de base de datos"""
    logger.info("🧪 TEST 1: Migración de Base de Datos")
    
    try:
        # Importar y ejecutar migración
        from db.migrations.run_migration import run_migration, verify_tables
        from mysql_connection import MySQLConnection
        
        # Ejecutar migración
        logger.info("📊 Ejecutando migración...")
        success = run_migration()
        
        if success:
            logger.info("✅ Migración exitosa")
            
            # Verificar tablas
            db = MySQLConnection()
            if verify_tables(db):
                logger.info("✅ Verificación de tablas exitosa")
                return True
            else:
                logger.error("❌ Error en verificación de tablas")
                return False
        else:
            logger.error("❌ Error en migración")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error en test de migración: {str(e)}")
        return False


def test_2_models():
    """Test 2: Modelos de base de datos"""
    logger.info("🧪 TEST 2: Modelos de Base de Datos")
    
    try:
        from db.pdf_manager.models import (
            CatalogoManager, Catalogo, CatalogoDoc,
            EstadoCatalogo, TipoArchivo, EstadoArchivo
        )
        
        manager = CatalogoManager()
        
        # Test crear catálogo
        logger.info("📝 Creando catálogo de prueba...")
        catalogo_test = Catalogo(
            nombre="Test Catálogo",
            descripcion="Catálogo de prueba para testing",
            categoria="test",
            estado=EstadoCatalogo.PROCESANDO,
            tamaño_archivo=1024,
            nombre_archivo_original="test.pdf"
        )
        
        catalogo_id = manager.crear_catalogo(catalogo_test)
        
        if catalogo_id:
            logger.info(f"✅ Catálogo creado con ID: {catalogo_id}")
            
            # Test obtener catálogo
            catalogo_obtenido = manager.obtener_catalogo(catalogo_id)
            if catalogo_obtenido:
                logger.info("✅ Catálogo obtenido correctamente")
                
                # Test actualizar estado
                success = manager.actualizar_estado_catalogo(
                    catalogo_id, 
                    EstadoCatalogo.ACTIVO,
                    {"test": True}
                )
                
                if success:
                    logger.info("✅ Estado actualizado correctamente")
                    
                    # Test estadísticas
                    stats = manager.obtener_estadisticas_catalogos()
                    if stats:
                        logger.info(f"✅ Estadísticas obtenidas: {stats.get('total_catalogos', 0)} catálogos")
                        
                        # Limpiar test
                        manager.eliminar_catalogo(catalogo_id)
                        logger.info("🧹 Catálogo de prueba eliminado")
                        
                        return True
                    else:
                        logger.error("❌ Error obteniendo estadísticas")
                else:
                    logger.error("❌ Error actualizando estado")
            else:
                logger.error("❌ Error obteniendo catálogo")
        else:
            logger.error("❌ Error creando catálogo")
            
        return False
        
    except Exception as e:
        logger.error(f"❌ Error en test de modelos: {str(e)}")
        return False


def test_3_s3_upload():
    """Test 3: Upload a S3"""
    logger.info("🧪 TEST 3: Upload a S3")
    
    try:
        from utils.upload_utils import S3UploadManager, UploadType
        
        s3_manager = S3UploadManager()
        
        # Crear archivo de prueba
        test_content = b"Contenido de prueba para S3"
        test_file = BytesIO(test_content)
        s3_key = "test/archivo_prueba.txt"
        
        logger.info("📤 Subiendo archivo de prueba a S3...")
        success, s3_url, error_msg = s3_manager.upload_file(
            test_file,
            s3_key,
            UploadType.DOCUMENTOS
        )
        
        if success:
            logger.info(f"✅ Archivo subido exitosamente: {s3_url}")
            
            # Test eliminar archivo
            delete_success = s3_manager.delete_file(s3_url)
            if delete_success:
                logger.info("✅ Archivo eliminado exitosamente")
                return True
            else:
                logger.warning("⚠️ Error eliminando archivo de prueba")
                return True  # No es crítico
        else:
            logger.error(f"❌ Error subiendo archivo: {error_msg}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error en test de S3: {str(e)}")
        return False


def test_4_pdf_processor():
    """Test 4: Procesador de PDFs"""
    logger.info("🧪 TEST 4: Procesador de PDFs")
    
    try:
        from db.pdf_manager.pdf_processor_s3 import PDFProcessorS3
        
        processor = PDFProcessorS3()
        
        # Test obtener progreso
        progress = processor.get_progress()
        if progress and progress.get('status') == 'idle':
            logger.info("✅ Procesador inicializado correctamente")
            
            # Test estadísticas
            stats = processor.get_statistics()
            if isinstance(stats, dict):
                logger.info("✅ Estadísticas obtenidas del procesador")
                return True
            else:
                logger.error("❌ Error obteniendo estadísticas")
        else:
            logger.error("❌ Error inicializando procesador")
            
        return False
        
    except Exception as e:
        logger.error(f"❌ Error en test de procesador: {str(e)}")
        return False


def test_5_cleanup():
    """Test 5: Limpieza y verificación final"""
    logger.info("🧪 TEST 5: Limpieza y Verificación Final")
    
    try:
        from db.pdf_manager.models import CatalogoManager
        
        manager = CatalogoManager()
        
        # Limpiar archivos huérfanos
        logger.info("🧹 Ejecutando limpieza de archivos huérfanos...")
        resultado = manager.limpiar_archivos_huerfanos()
        
        if isinstance(resultado, dict):
            logger.info(f"✅ Limpieza completada: {resultado}")
            
            # Verificar estadísticas finales
            stats = manager.obtener_estadisticas_catalogos()
            logger.info(f"📊 Estadísticas finales: {stats}")
            
            return True
        else:
            logger.error("❌ Error en limpieza")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error en test de limpieza: {str(e)}")
        return False


def main():
    """Función principal de testing"""
    logger.info("🚀 INICIANDO TESTS DE ARQUITECTURA SIMPLIFICADA")
    logger.info("=" * 60)
    
    tests = [
        ("Migración de BD", test_1_migration),
        ("Modelos de BD", test_2_models),
        ("Upload S3", test_3_s3_upload),
        ("Procesador PDF", test_4_pdf_processor),
        ("Limpieza", test_5_cleanup)
    ]
    
    results = []
    start_time = time.time()
    
    for test_name, test_func in tests:
        logger.info(f"\n{'='*20} {test_name} {'='*20}")
        
        try:
            test_start = time.time()
            success = test_func()
            test_time = time.time() - test_start
            
            results.append({
                'name': test_name,
                'success': success,
                'time': test_time
            })
            
            if success:
                logger.info(f"✅ {test_name} EXITOSO ({test_time:.2f}s)")
            else:
                logger.error(f"❌ {test_name} FALLÓ ({test_time:.2f}s)")
                
        except Exception as e:
            logger.error(f"💥 {test_name} ERROR CRÍTICO: {str(e)}")
            results.append({
                'name': test_name,
                'success': False,
                'time': 0,
                'error': str(e)
            })
    
    # Resumen final
    total_time = time.time() - start_time
    successful_tests = sum(1 for r in results if r['success'])
    total_tests = len(results)
    
    logger.info("\n" + "="*60)
    logger.info("📊 RESUMEN DE TESTS")
    logger.info("="*60)
    
    for result in results:
        status = "✅ EXITOSO" if result['success'] else "❌ FALLÓ"
        logger.info(f"{result['name']:20} | {status:12} | {result['time']:6.2f}s")
    
    logger.info("-"*60)
    logger.info(f"Total: {successful_tests}/{total_tests} tests exitosos")
    logger.info(f"Tiempo total: {total_time:.2f}s")
    
    if successful_tests == total_tests:
        logger.info("🎉 TODOS LOS TESTS EXITOSOS - ARQUITECTURA FUNCIONANDO")
        return True
    else:
        logger.error(f"💥 {total_tests - successful_tests} TESTS FALLARON")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 