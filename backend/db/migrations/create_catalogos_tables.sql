-- =====================================================
-- MIGRACIÓN: Sistema de Catálogos Profesional con S3
-- Fecha: 2024-11-27
-- Descripción: Tablas para gestión de catálogos PDF con archivos en S3
-- =====================================================

-- Tabla principal de catálogos
CREATE TABLE IF NOT EXISTS catalogos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(100) DEFAULT 'general',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    estado ENUM('activo', 'inactivo', 'procesando', 'error') DEFAULT 'procesando',
    usuario_id INT DEFAULT NULL,
    total_paginas INT DEFAULT 0,
    tamaño_archivo BIGINT DEFAULT 0 COMMENT 'Tamaño en bytes del PDF original',
    nombre_archivo_original VARCHAR(255) NOT NULL,
    version VARCHAR(20) DEFAULT '1.0',
    tags JSON DEFAULT NULL COMMENT 'Etiquetas para búsqueda',
    metadatos_procesamiento JSON DEFAULT NULL COMMENT 'Info del procesamiento (tiempo, resolución, etc.)',
    
    -- Índices para optimización
    INDEX idx_categoria (categoria),
    INDEX idx_estado (estado),
    INDEX idx_fecha_creacion (fecha_creacion),
    INDEX idx_usuario (usuario_id),
    INDEX idx_nombre (nombre),
    
    -- Índice compuesto para búsquedas frecuentes
    INDEX idx_estado_categoria (estado, categoria),
    INDEX idx_fecha_estado (fecha_creacion, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de documentos/archivos del catálogo
CREATE TABLE IF NOT EXISTS catalogos_docs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    catalogo_id INT NOT NULL,
    tipo_archivo ENUM('pdf_original', 'pagina_webp', 'thumbnail', 'preview', 'pagina_png') NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    url_s3 VARCHAR(500) NOT NULL COMMENT 'URL completa de S3',
    s3_key VARCHAR(400) NOT NULL COMMENT 'Key en S3 para operaciones',
    numero_pagina INT NULL COMMENT 'Para páginas: 1, 2, 3... NULL para PDF original y thumbnail',
    tamaño_archivo BIGINT DEFAULT 0,
    mime_type VARCHAR(100),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Metadatos específicos por tipo de archivo
    metadatos JSON DEFAULT NULL COMMENT 'Dimensiones, calidad, compresión, etc.',
    
    -- Campos para control de calidad
    checksum_md5 VARCHAR(32) DEFAULT NULL COMMENT 'Hash MD5 para verificación de integridad',
    estado_archivo ENUM('disponible', 'procesando', 'error', 'eliminado') DEFAULT 'disponible',
    
    -- Relaciones
    FOREIGN KEY (catalogo_id) REFERENCES catalogos(id) ON DELETE CASCADE,
    
    -- Índices para optimización
    INDEX idx_catalogo_tipo (catalogo_id, tipo_archivo),
    INDEX idx_numero_pagina (numero_pagina),
    INDEX idx_s3_key (s3_key),
    INDEX idx_estado_archivo (estado_archivo),
    INDEX idx_fecha_creacion (fecha_creacion),
    
    -- Índices compuestos
    INDEX idx_catalogo_pagina (catalogo_id, numero_pagina),
    INDEX idx_tipo_estado (tipo_archivo, estado_archivo),
    
    -- Constraint único para evitar duplicados
    UNIQUE KEY unique_catalogo_tipo_pagina (catalogo_id, tipo_archivo, numero_pagina)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de estadísticas de acceso (opcional, para analytics)
CREATE TABLE IF NOT EXISTS catalogos_accesos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    catalogo_id INT NOT NULL,
    documento_id INT DEFAULT NULL COMMENT 'ID específico del documento accedido',
    tipo_acceso ENUM('visualizacion', 'descarga', 'busqueda') NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    usuario_id INT DEFAULT NULL,
    fecha_acceso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadatos_acceso JSON DEFAULT NULL COMMENT 'Información adicional del acceso',
    
    FOREIGN KEY (catalogo_id) REFERENCES catalogos(id) ON DELETE CASCADE,
    FOREIGN KEY (documento_id) REFERENCES catalogos_docs(id) ON DELETE SET NULL,
    
    INDEX idx_catalogo_fecha (catalogo_id, fecha_acceso),
    INDEX idx_tipo_acceso (tipo_acceso),
    INDEX idx_fecha_acceso (fecha_acceso),
    INDEX idx_usuario_fecha (usuario_id, fecha_acceso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- VISTAS ÚTILES PARA CONSULTAS FRECUENTES
-- =====================================================

-- Vista para catálogos con información completa
CREATE OR REPLACE VIEW vista_catalogos_completos AS
SELECT 
    c.id,
    c.nombre,
    c.descripcion,
    c.categoria,
    c.estado,
    c.total_paginas,
    c.tamaño_archivo,
    c.fecha_creacion,
    c.fecha_actualizacion,
    c.usuario_id,
    c.version,
    c.tags,
    
    -- URLs de archivos principales
    pdf.url_s3 as pdf_url,
    thumb.url_s3 as thumbnail_url,
    
    -- Contadores
    (SELECT COUNT(*) FROM catalogos_docs cd WHERE cd.catalogo_id = c.id AND cd.tipo_archivo = 'pagina_webp') as total_paginas_procesadas,
    (SELECT SUM(cd.tamaño_archivo) FROM catalogos_docs cd WHERE cd.catalogo_id = c.id) as tamaño_total_archivos
    
FROM catalogos c
LEFT JOIN catalogos_docs pdf ON c.id = pdf.catalogo_id AND pdf.tipo_archivo = 'pdf_original'
LEFT JOIN catalogos_docs thumb ON c.id = thumb.catalogo_id AND thumb.tipo_archivo = 'thumbnail';

-- Vista para páginas de catálogos
CREATE OR REPLACE VIEW vista_catalogos_paginas AS
SELECT 
    c.id as catalogo_id,
    c.nombre as catalogo_nombre,
    c.estado as catalogo_estado,
    cd.id as documento_id,
    cd.numero_pagina,
    cd.url_s3,
    cd.s3_key,
    cd.tamaño_archivo,
    cd.metadatos,
    cd.fecha_creacion
FROM catalogos c
INNER JOIN catalogos_docs cd ON c.id = cd.catalogo_id
WHERE cd.tipo_archivo = 'pagina_webp' 
  AND cd.estado_archivo = 'disponible'
ORDER BY c.id, cd.numero_pagina;

-- =====================================================
-- PROCEDIMIENTOS ALMACENADOS ÚTILES
-- =====================================================

DELIMITER //

-- Procedimiento para obtener catálogo completo con todos sus archivos
CREATE PROCEDURE GetCatalogoCompleto(IN catalogo_id_param INT)
BEGIN
    -- Información del catálogo
    SELECT * FROM catalogos WHERE id = catalogo_id_param;
    
    -- Todos los documentos del catálogo organizados por tipo
    SELECT 
        tipo_archivo,
        numero_pagina,
        url_s3,
        s3_key,
        tamaño_archivo,
        metadatos,
        fecha_creacion
    FROM catalogos_docs 
    WHERE catalogo_id = catalogo_id_param 
      AND estado_archivo = 'disponible'
    ORDER BY 
        CASE tipo_archivo 
            WHEN 'pdf_original' THEN 1
            WHEN 'thumbnail' THEN 2
            WHEN 'pagina_webp' THEN 3
            ELSE 4
        END,
        numero_pagina;
END //

-- Procedimiento para limpiar archivos huérfanos
CREATE PROCEDURE LimpiarArchivosHuerfanos()
BEGIN
    -- Marcar como eliminados los documentos de catálogos inexistentes
    UPDATE catalogos_docs 
    SET estado_archivo = 'eliminado' 
    WHERE catalogo_id NOT IN (SELECT id FROM catalogos);
    
    -- Retornar estadísticas
    SELECT 
        COUNT(*) as archivos_huerfanos_marcados,
        SUM(tamaño_archivo) as bytes_liberados
    FROM catalogos_docs 
    WHERE estado_archivo = 'eliminado';
END //

DELIMITER ;

-- =====================================================
-- DATOS INICIALES Y CONFIGURACIÓN
-- =====================================================

-- Insertar categorías predefinidas (opcional)
INSERT IGNORE INTO catalogos (id, nombre, descripcion, categoria, estado, total_paginas, tamaño_archivo, nombre_archivo_original) VALUES
(0, 'Catálogo de Ejemplo', 'Catálogo de prueba para testing', 'ejemplo', 'activo', 0, 0, 'ejemplo.pdf');

-- Eliminar el registro de ejemplo
DELETE FROM catalogos WHERE id = 0;

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

/*
DOCUMENTACIÓN DE LA ARQUITECTURA:

1. TABLA CATALOGOS:
   - Almacena información principal de cada catálogo PDF
   - Incluye metadatos de procesamiento y estado
   - Soporte para versionado y etiquetas

2. TABLA CATALOGOS_DOCS:
   - Almacena cada archivo individual (PDF, imágenes, thumbnails)
   - Relación 1:N con catalogos
   - URLs directas a S3 para servido eficiente
   - Metadatos específicos por tipo de archivo

3. TABLA CATALOGOS_ACCESOS:
   - Opcional: para analytics y estadísticas de uso
   - Tracking de visualizaciones y descargas

4. VISTAS:
   - vista_catalogos_completos: Información consolidada
   - vista_catalogos_paginas: Páginas procesadas

5. PROCEDIMIENTOS:
   - GetCatalogoCompleto: Consulta optimizada
   - LimpiarArchivosHuerfanos: Mantenimiento

FLUJO DE TRABAJO:
1. Upload PDF → Registro en 'catalogos' (estado: procesando)
2. Procesamiento → Archivos a S3 + registros en 'catalogos_docs'
3. Finalización → Actualizar estado a 'activo'
4. Consulta → Usar vistas para obtener URLs directas de S3
*/ 