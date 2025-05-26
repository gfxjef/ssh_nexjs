"""
Funciones para configurar e inicializar la base de datos para el módulo de documentos.
"""
from ...mysql_connection import MySQLConnection
from .queries import (
    CREATE_DOCUMENT_CATEGORIES_TABLE,
    CREATE_TAGS_TABLE,
    CREATE_DOCUMENTS_TABLE,
    CREATE_DOCUMENT_TAGS_TABLE,
    CREATE_DOCUMENT_AUDIT_TABLE,
    INSERT_DOCUMENT_CATEGORY,
    INSERT_TAG
)

def setup_documents_database():
    """
    Crea las tablas necesarias para el módulo de documentos si no existen.
    
    Returns:
        bool: True si la configuración fue exitosa, False en caso contrario
    """
    try:
        db_ops_setup = MySQLConnection()
        
        print("Creando tablas del módulo de documentos...")
        
        # Crear tabla de categorías de documentos
        result_categories = db_ops_setup.execute_query(CREATE_DOCUMENT_CATEGORIES_TABLE, fetch=False)
        if result_categories is None:
            print("Error al crear la tabla de categorías de documentos")
            return False
        print("✓ Tabla categorias_documentos creada/verificada")
        
        # Crear tabla de etiquetas
        result_tags = db_ops_setup.execute_query(CREATE_TAGS_TABLE, fetch=False)
        if result_tags is None:
            print("Error al crear la tabla de etiquetas")
            return False
        print("✓ Tabla etiquetas_documentos creada/verificada")
        
        # Crear tabla principal de documentos
        result_documents = db_ops_setup.execute_query(CREATE_DOCUMENTS_TABLE, fetch=False)
        if result_documents is None:
            print("Error al crear la tabla de documentos")
            return False
        print("✓ Tabla documentos creada/verificada")
        
        # Crear tabla de relaciones documento-etiquetas
        result_doc_tags = db_ops_setup.execute_query(CREATE_DOCUMENT_TAGS_TABLE, fetch=False)
        if result_doc_tags is None:
            print("Error al crear la tabla de documento-etiquetas")
            return False
        print("✓ Tabla documento_etiquetas creada/verificada")
        
        # Crear tabla de auditoría
        result_audit = db_ops_setup.execute_query(CREATE_DOCUMENT_AUDIT_TABLE, fetch=False)
        if result_audit is None:
            print("Error al crear la tabla de auditoría")
            return False
        print("✓ Tabla documento_auditoria creada/verificada")
        
        print("✅ Todas las tablas del módulo de documentos creadas correctamente")
        return True
        
    except Exception as e:
        print(f"❌ Error al configurar la base de datos de documentos: {e}")
        return False

def seed_initial_documents_data():
    """
    Inserta datos iniciales para categorías y etiquetas de documentos.
    Solo debe usarse en un entorno de desarrollo o pruebas.
    
    Returns:
        bool: True si la carga de datos fue exitosa, False en caso contrario
    """
    try:
        db_ops_seed = MySQLConnection()
        
        # Verificar si ya existen categorías
        categories_check = db_ops_seed.execute_query("SELECT COUNT(*) as count FROM categorias_documentos")
        if categories_check and categories_check[0].get('count', 0) > 0:
            print("Ya existen categorías de documentos en la base de datos. No se cargarán datos iniciales.")
        else:
            print("Insertando categorías iniciales de documentos...")
            
            # Datos iniciales para categorías de documentos
            categories_data = [
                ('Marketing', 'Documentos relacionados con estrategias de marketing, campañas publicitarias y material promocional'),
                ('Recursos Humanos', 'Políticas de empresa, contratos, manuales de empleados y documentación de RRHH'),
                ('Finanzas', 'Reportes financieros, presupuestos, facturas y documentación contable'),
                ('Legal', 'Contratos, términos legales, políticas de privacidad y documentación jurídica'),
                ('Operaciones', 'Procedimientos operativos, manuales técnicos y documentación de procesos'),
                ('Tecnología', 'Documentación técnica, manuales de software y especificaciones de sistemas'),
                ('Ventas', 'Propuestas comerciales, presentaciones de ventas y material de apoyo'),
                ('Calidad', 'Certificaciones, auditorías y documentos de control de calidad'),
                ('Capacitación', 'Material de formación, cursos y documentos educativos'),
                ('General', 'Documentos diversos que no encajan en otras categorías específicas')
            ]
            
            # Insertar categorías
            for cat_data in categories_data:
                result = db_ops_seed.execute_query(INSERT_DOCUMENT_CATEGORY, cat_data, fetch=False)
                if result is None:
                    print(f"Error al insertar categoría: {cat_data[0]}")
                    return False
            
            print("✓ Categorías iniciales de documentos insertadas correctamente")

        # Verificar si ya existen etiquetas
        tags_check = db_ops_seed.execute_query("SELECT COUNT(*) as count FROM etiquetas_documentos")
        if tags_check and tags_check[0].get('count', 0) > 0:
            print("Ya existen etiquetas de documentos en la base de datos. No se cargarán datos iniciales.")
        else:
            print("Insertando etiquetas iniciales...")
            
            # Datos iniciales para etiquetas
            tags_data = [
                ('Urgente', '#E74C3C'),      # Rojo
                ('Confidencial', '#8E44AD'),  # Púrpura
                ('Público', '#27AE60'),       # Verde
                ('Borrador', '#F39C12'),      # Naranja
                ('Revisión', '#3498DB'),      # Azul
                ('Aprobado', '#2ECC71'),      # Verde claro
                ('Archivado', '#95A5A6'),     # Gris
                ('Temporal', '#E67E22'),      # Naranja oscuro
                ('Importante', '#C0392B'),    # Rojo oscuro
                ('Proceso', '#9B59B6'),       # Púrpura claro
                ('Actualizado', '#1ABC9C'),   # Verde azulado
                ('Histórico', '#7F8C8D'),     # Gris oscuro
                ('Plantilla', '#34495E'),     # Azul grisáceo
                ('Manual', '#16A085'),        # Verde azulado oscuro
                ('Reporte', '#2980B9')        # Azul oscuro
            ]
            
            # Insertar etiquetas
            for tag_data in tags_data:
                result = db_ops_seed.execute_query(INSERT_TAG, tag_data, fetch=False)
                if result is None:
                    print(f"Error al insertar etiqueta: {tag_data[0]}")
                    return False
            
            print("✓ Etiquetas iniciales insertadas correctamente")

        print("✅ Datos iniciales del módulo de documentos cargados correctamente")
        return True
        
    except Exception as e:
        print(f"❌ Error al cargar datos iniciales de documentos: {e}")
        return False

def create_uploads_directory():
    """
    Crea el directorio de uploads para documentos si no existe.
    
    Returns:
        bool: True si el directorio existe o se creó correctamente
    """
    import os
    
    try:
        # Ruta del directorio de uploads
        uploads_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'uploads', 'documentos')
        uploads_dir = os.path.abspath(uploads_dir)
        
        # Crear directorio si no existe
        if not os.path.exists(uploads_dir):
            os.makedirs(uploads_dir, exist_ok=True)
            print(f"✓ Directorio de uploads creado: {uploads_dir}")
        else:
            print(f"✓ Directorio de uploads ya existe: {uploads_dir}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error al crear directorio de uploads: {e}")
        return False

def setup_complete_documents_module():
    """
    Configuración completa del módulo de documentos:
    - Crea todas las tablas necesarias
    - Inserta datos iniciales
    - Crea directorio de uploads
    
    Returns:
        bool: True si toda la configuración fue exitosa
    """
    print("🚀 Iniciando configuración completa del módulo de documentos...")
    
    # Paso 1: Crear tablas
    if not setup_documents_database():
        print("❌ Error en la configuración de tablas")
        return False
    
    # Paso 2: Insertar datos iniciales
    if not seed_initial_documents_data():
        print("❌ Error en la carga de datos iniciales")
        return False
    
    # Paso 3: Crear directorio de uploads
    if not create_uploads_directory():
        print("❌ Error en la creación del directorio de uploads")
        return False
    
    print("🎉 ¡Módulo de documentos configurado exitosamente!")
    return True

if __name__ == "__main__":
    # Ejecutar configuración completa si se ejecuta directamente
    setup_complete_documents_module() 