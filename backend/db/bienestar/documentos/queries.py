"""
Módulo con consultas SQL para la gestión de documentos, categorías y etiquetas.
"""

# ==========================================
# TABLAS PRINCIPALES
# ==========================================

# Tabla de categorías de documentos
CREATE_DOCUMENT_CATEGORIES_TABLE = """
CREATE TABLE IF NOT EXISTS categorias_documentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  color VARCHAR(7) NOT NULL DEFAULT '#3182CE',
  icono VARCHAR(10) NOT NULL DEFAULT '📁',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
"""

# Tabla de etiquetas
CREATE_TAGS_TABLE = """
CREATE TABLE IF NOT EXISTS etiquetas_documentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL DEFAULT '#2e3954',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
"""

# Tabla principal de documentos
CREATE_DOCUMENTS_TABLE = """
CREATE TABLE IF NOT EXISTS documentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  nombre_archivo VARCHAR(255) NOT NULL,
  ruta_archivo VARCHAR(500) NOT NULL,
  tamaño_archivo BIGINT NOT NULL,
  tipo_mime VARCHAR(100) NOT NULL,
  categoria_id INT NOT NULL,
  subido_por INT NOT NULL,
  descargas INT DEFAULT 0,
  es_publico BOOLEAN DEFAULT TRUE,
  estado ENUM('activo', 'inactivo', 'eliminado') DEFAULT 'activo',
  grupo ENUM('kossodo', 'kossomet', 'grupo_kossodo') DEFAULT 'grupo_kossodo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias_documentos(id),
  FOREIGN KEY (subido_por) REFERENCES usuarios(id)
);
"""

# Tabla de relación documentos-etiquetas (muchos a muchos)
CREATE_DOCUMENT_TAGS_TABLE = """
CREATE TABLE IF NOT EXISTS documento_etiquetas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  documento_id INT NOT NULL,
  etiqueta_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE,
  FOREIGN KEY (etiqueta_id) REFERENCES etiquetas_documentos(id) ON DELETE CASCADE,
  UNIQUE KEY unique_document_tag (documento_id, etiqueta_id)
);
"""

# Tabla de auditoría para logs
CREATE_DOCUMENT_AUDIT_TABLE = """
CREATE TABLE IF NOT EXISTS documento_auditoria (
  id INT PRIMARY KEY AUTO_INCREMENT,
  documento_id INT NOT NULL,
  usuario_id INT NOT NULL,
  accion ENUM('subida', 'descarga', 'modificacion', 'eliminacion', 'vista') NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  detalles TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
"""

# ==========================================
# QUERIES PARA CATEGORÍAS
# ==========================================

GET_ALL_DOCUMENT_CATEGORIES = "SELECT * FROM categorias_documentos ORDER BY nombre"

GET_DOCUMENT_CATEGORY_BY_ID = "SELECT * FROM categorias_documentos WHERE id = %s"

GET_DOCUMENT_CATEGORY_BY_NAME = "SELECT * FROM categorias_documentos WHERE nombre = %s"

INSERT_DOCUMENT_CATEGORY = """
INSERT INTO categorias_documentos (nombre, descripcion, color, icono) 
VALUES (%s, %s, %s, %s)
"""

UPDATE_DOCUMENT_CATEGORY = """
UPDATE categorias_documentos 
SET nombre = %s, descripcion = %s, color = %s, icono = %s 
WHERE id = %s
"""

DELETE_DOCUMENT_CATEGORY = "DELETE FROM categorias_documentos WHERE id = %s"

# ==========================================
# QUERIES PARA ETIQUETAS
# ==========================================

GET_ALL_TAGS = "SELECT * FROM etiquetas_documentos ORDER BY nombre"

GET_TAG_BY_ID = "SELECT * FROM etiquetas_documentos WHERE id = %s"

GET_TAG_BY_NAME = "SELECT * FROM etiquetas_documentos WHERE nombre = %s"

INSERT_TAG = """
INSERT INTO etiquetas_documentos (nombre, color) 
VALUES (%s, %s)
"""

UPDATE_TAG = """
UPDATE etiquetas_documentos 
SET nombre = %s, color = %s 
WHERE id = %s
"""

DELETE_TAG = "DELETE FROM etiquetas_documentos WHERE id = %s"

# ==========================================
# QUERIES PARA DOCUMENTOS
# ==========================================

GET_ALL_DOCUMENTS = """
SELECT d.*, c.nombre as categoria_nombre, u.nombre as subido_por_nombre 
FROM documentos d
JOIN categorias_documentos c ON d.categoria_id = c.id
JOIN usuarios u ON d.subido_por = u.id
ORDER BY d.created_at DESC
"""

GET_DOCUMENTS_BY_CATEGORY = """
SELECT d.*, c.nombre as categoria_nombre, u.nombre as subido_por_nombre 
FROM documentos d
JOIN categorias_documentos c ON d.categoria_id = c.id
JOIN usuarios u ON d.subido_por = u.id
WHERE d.categoria_id = %s
ORDER BY d.created_at DESC
"""

GET_DOCUMENTS_BY_TAG = """
SELECT DISTINCT d.*, c.nombre as categoria_nombre, u.nombre as subido_por_nombre 
FROM documentos d
JOIN categorias_documentos c ON d.categoria_id = c.id
JOIN usuarios u ON d.subido_por = u.id
JOIN documento_etiquetas de ON d.id = de.documento_id
WHERE de.etiqueta_id = %s
ORDER BY d.created_at DESC
"""

GET_DOCUMENTS_BY_GRUPO = """
SELECT d.*, c.nombre as categoria_nombre, u.nombre as subido_por_nombre 
FROM documentos d
JOIN categorias_documentos c ON d.categoria_id = c.id
JOIN usuarios u ON d.subido_por = u.id
WHERE d.grupo = %s
ORDER BY d.created_at DESC
"""

GET_DOCUMENT_BY_ID = """
SELECT d.*, c.nombre as categoria_nombre, u.nombre as subido_por_nombre 
FROM documentos d
JOIN categorias_documentos c ON d.categoria_id = c.id
JOIN usuarios u ON d.subido_por = u.id
WHERE d.id = %s
"""

GET_DOCUMENT_WITH_TAGS = """
SELECT d.*, c.nombre as categoria_nombre, u.nombre as subido_por_nombre,
GROUP_CONCAT(CONCAT(e.id, ':', e.nombre, ':', e.color) SEPARATOR '|') as etiquetas
FROM documentos d
JOIN categorias_documentos c ON d.categoria_id = c.id
JOIN usuarios u ON d.subido_por = u.id
LEFT JOIN documento_etiquetas de ON d.id = de.documento_id
LEFT JOIN etiquetas_documentos e ON de.etiqueta_id = e.id
WHERE d.id = %s
GROUP BY d.id
"""

SEARCH_DOCUMENTS = """
SELECT DISTINCT d.*, c.nombre as categoria_nombre, u.nombre as subido_por_nombre 
FROM documentos d
JOIN categorias_documentos c ON d.categoria_id = c.id
JOIN usuarios u ON d.subido_por = u.id
LEFT JOIN documento_etiquetas de ON d.id = de.documento_id
LEFT JOIN etiquetas_documentos e ON de.etiqueta_id = e.id
WHERE (d.titulo LIKE %s OR d.descripcion LIKE %s OR e.nombre LIKE %s)
ORDER BY d.created_at DESC
"""

SEARCH_DOCUMENTS_WITH_FILTERS = """
SELECT DISTINCT d.*, c.nombre as categoria_nombre, u.nombre as subido_por_nombre 
FROM documentos d
JOIN categorias_documentos c ON d.categoria_id = c.id
JOIN usuarios u ON d.subido_por = u.id
LEFT JOIN documento_etiquetas de ON d.id = de.documento_id
LEFT JOIN etiquetas_documentos e ON de.etiqueta_id = e.id
WHERE 1=1
"""

INSERT_DOCUMENT = """
INSERT INTO documentos (
  titulo, descripcion, nombre_archivo, ruta_archivo, tamaño_archivo, 
  tipo_mime, categoria_id, subido_por, es_publico, estado, grupo
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""

UPDATE_DOCUMENT = """
UPDATE documentos SET
  titulo = %s,
  descripcion = %s,
  categoria_id = %s,
  es_publico = %s,
  grupo = %s
WHERE id = %s
"""

UPDATE_DOCUMENT_STATUS = """
UPDATE documentos SET
  estado = %s
WHERE id = %s
"""

INCREMENT_DOWNLOADS = """
UPDATE documentos SET
  descargas = descargas + 1
WHERE id = %s
"""

DELETE_DOCUMENT = "DELETE FROM documentos WHERE id = %s"

# ==========================================
# QUERIES PARA GRUPOS EMPRESARIALES
# ==========================================

GET_AVAILABLE_GRUPOS = """
SELECT DISTINCT grupo 
FROM documentos 
WHERE grupo IS NOT NULL AND grupo != ''
ORDER BY grupo
"""

GET_GRUPOS_WITH_COUNT = """
SELECT grupo, COUNT(*) as total_documentos
FROM documentos 
WHERE grupo IS NOT NULL AND grupo != ''
GROUP BY grupo
ORDER BY grupo
"""

# ==========================================
# QUERIES PARA DOCUMENTO-ETIQUETAS
# ==========================================

GET_TAGS_BY_DOCUMENT = """
SELECT e.* FROM etiquetas_documentos e
JOIN documento_etiquetas de ON e.id = de.etiqueta_id
WHERE de.documento_id = %s
ORDER BY e.nombre
"""

ADD_TAG_TO_DOCUMENT = """
INSERT INTO documento_etiquetas (documento_id, etiqueta_id) 
VALUES (%s, %s)
ON DUPLICATE KEY UPDATE created_at = created_at
"""

REMOVE_TAG_FROM_DOCUMENT = """
DELETE FROM documento_etiquetas 
WHERE documento_id = %s AND etiqueta_id = %s
"""

REMOVE_ALL_TAGS_FROM_DOCUMENT = """
DELETE FROM documento_etiquetas 
WHERE documento_id = %s
"""

# ==========================================
# QUERIES PARA AUDITORÍA
# ==========================================

LOG_DOCUMENT_ACTION = """
INSERT INTO documento_auditoria (
  documento_id, usuario_id, accion, ip_address, user_agent, detalles
) VALUES (%s, %s, %s, %s, %s, %s)
"""

GET_DOCUMENT_AUDIT_LOG = """
SELECT da.*, d.titulo as documento_titulo, u.nombre as usuario_nombre
FROM documento_auditoria da
JOIN documentos d ON da.documento_id = d.id
JOIN usuarios u ON da.usuario_id = u.id
WHERE da.documento_id = %s
ORDER BY da.created_at DESC
"""

GET_USER_AUDIT_LOG = """
SELECT da.*, d.titulo as documento_titulo
FROM documento_auditoria da
JOIN documentos d ON da.documento_id = d.id
WHERE da.usuario_id = %s
ORDER BY da.created_at DESC
LIMIT %s
"""

# ==========================================
# QUERIES PARA ESTADÍSTICAS
# ==========================================

GET_DOCUMENTS_COUNT_BY_CATEGORY = """
SELECT c.nombre, COUNT(d.id) as total_documentos
FROM categorias_documentos c
LEFT JOIN documentos d ON c.id = d.categoria_id
GROUP BY c.id, c.nombre
ORDER BY total_documentos DESC
"""

GET_MOST_DOWNLOADED_DOCUMENTS = """
SELECT d.titulo, d.descargas, c.nombre as categoria_nombre
FROM documentos d
JOIN categorias_documentos c ON d.categoria_id = c.id
ORDER BY d.descargas DESC
LIMIT %s
"""

GET_RECENT_UPLOADS = """
SELECT d.titulo, d.created_at, u.nombre as subido_por_nombre, c.nombre as categoria_nombre
FROM documentos d
JOIN usuarios u ON d.subido_por = u.id
JOIN categorias_documentos c ON d.categoria_id = c.id
ORDER BY d.created_at DESC
LIMIT %s
"""

GET_ACTIVITY_STATS = """
SELECT 
  COUNT(CASE WHEN accion = 'subida' THEN 1 END) as subidas,
  COUNT(CASE WHEN accion = 'descarga' THEN 1 END) as descargas,
  COUNT(CASE WHEN accion = 'vista' THEN 1 END) as vistas
FROM documento_auditoria
WHERE created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
""" 