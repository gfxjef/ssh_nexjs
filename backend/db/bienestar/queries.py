"""
Módulo con consultas SQL para la gestión de posts y categorías de bienestar.
"""

# Consultas para categorías
CREATE_CATEGORIES_TABLE = """
CREATE TABLE IF NOT EXISTS categorias_bienestar (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL DEFAULT '#2e3954',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
"""

GET_ALL_CATEGORIES = "SELECT * FROM categorias_bienestar ORDER BY nombre"

GET_CATEGORY_BY_ID = "SELECT * FROM categorias_bienestar WHERE id = %s"

GET_CATEGORY_BY_NAME = "SELECT * FROM categorias_bienestar WHERE nombre = %s"

INSERT_CATEGORY = """
INSERT INTO categorias_bienestar (nombre, color) 
VALUES (%s, %s)
"""

UPDATE_CATEGORY = """
UPDATE categorias_bienestar 
SET nombre = %s, color = %s 
WHERE id = %s
"""

DELETE_CATEGORY = "DELETE FROM categorias_bienestar WHERE id = %s"

# Consultas para posts
CREATE_POSTS_TABLE = """
CREATE TABLE IF NOT EXISTS posts_bienestar (
  id INT PRIMARY KEY AUTO_INCREMENT,
  titulo VARCHAR(255) NOT NULL,
  extracto TEXT NOT NULL,
  contenido TEXT NOT NULL,
  autor VARCHAR(100) NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('publicado', 'borrador', 'archivado') DEFAULT 'borrador',
  destacado BOOLEAN DEFAULT FALSE,
  vistas INT DEFAULT 0,
  categoria_id INT NOT NULL,
  imagen_url VARCHAR(255),
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias_bienestar(id)
);
"""

GET_ALL_POSTS = """
SELECT p.*, c.nombre as categoria_nombre FROM posts_bienestar p
JOIN categorias_bienestar c ON p.categoria_id = c.id
ORDER BY p.fecha DESC
"""

GET_POSTS_BY_STATUS = """
SELECT p.*, c.nombre as categoria_nombre FROM posts_bienestar p
JOIN categorias_bienestar c ON p.categoria_id = c.id
WHERE p.estado = %s
ORDER BY p.fecha DESC
"""

GET_POSTS_BY_CATEGORY = """
SELECT p.*, c.nombre as categoria_nombre FROM posts_bienestar p
JOIN categorias_bienestar c ON p.categoria_id = c.id
WHERE p.categoria_id = %s
ORDER BY p.fecha DESC
"""

GET_POSTS_HIGHLIGHTED = """
SELECT p.*, c.nombre as categoria_nombre FROM posts_bienestar p
JOIN categorias_bienestar c ON p.categoria_id = c.id
WHERE p.destacado = TRUE
ORDER BY p.fecha DESC
"""

GET_POST_BY_ID = """
SELECT p.*, c.nombre as categoria_nombre FROM posts_bienestar p
JOIN categorias_bienestar c ON p.categoria_id = c.id
WHERE p.id = %s
"""

SEARCH_POSTS = """
SELECT p.*, c.nombre as categoria_nombre FROM posts_bienestar p
JOIN categorias_bienestar c ON p.categoria_id = c.id
WHERE (p.titulo LIKE %s OR p.extracto LIKE %s OR p.contenido LIKE %s)
ORDER BY p.fecha DESC
"""

INSERT_POST = """
INSERT INTO posts_bienestar (
  titulo, extracto, contenido, autor, fecha, estado, destacado, categoria_id, imagen_url
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
"""

UPDATE_POST = """
UPDATE posts_bienestar SET
  titulo = %s,
  extracto = %s,
  contenido = %s,
  autor = %s,
  estado = %s,
  destacado = %s,
  categoria_id = %s,
  imagen_url = %s
WHERE id = %s
"""

UPDATE_POST_STATUS = """
UPDATE posts_bienestar SET
  estado = %s
WHERE id = %s
"""

UPDATE_POST_HIGHLIGHT = """
UPDATE posts_bienestar SET
  destacado = %s
WHERE id = %s
"""

UPDATE_POST_EMAIL_SENT = """
UPDATE posts_bienestar SET
  email_sent = %s
WHERE id = %s
"""

INCREMENT_VIEWS = """
UPDATE posts_bienestar SET
  vistas = vistas + 1
WHERE id = %s
"""

DELETE_POST = "DELETE FROM posts_bienestar WHERE id = %s"

# Consultas para Postulaciones
CREATE_POSTULACIONES_TABLE = """
CREATE TABLE IF NOT EXISTS postulaciones_bienestar (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  usuario_id INT NOT NULL,
  fecha_postulacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts_bienestar(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE 
);
"""

INSERT_POSTULACION = """
INSERT INTO postulaciones_bienestar (post_id, usuario_id) 
VALUES (%s, %s)
"""

CHECK_EXISTING_POSTULACION = """
SELECT id FROM postulaciones_bienestar 
WHERE post_id = %s AND usuario_id = %s
"""

GET_POSTULANTES_BY_POST_ID = """
SELECT u.id as usuario_id, u.nombre, u.correo, p.fecha_postulacion
FROM postulaciones_bienestar p
JOIN usuarios u ON p.usuario_id = u.id
WHERE p.post_id = %s
ORDER BY p.fecha_postulacion DESC
"""

# ==========================================
# CONSULTAS PARA ADMINISTRACIÓN DE USUARIOS
# ==========================================

# Obtener todos los usuarios
GET_ALL_USERS = """
SELECT id, correo, nombre, usuario, cargo, grupo, rango 
FROM usuarios 
ORDER BY nombre ASC
"""

# Obtener usuario específico por ID
GET_USER_BY_ID = """
SELECT id, correo, nombre, usuario, cargo, grupo, rango 
FROM usuarios 
WHERE id = %s
"""

# Actualizar campos editables de usuario
UPDATE_USER = """
UPDATE usuarios 
SET correo = %s, nombre = %s, cargo = %s, grupo = %s
WHERE id = %s
"""

# Verificar si existe usuario por ID (para validaciones)
CHECK_USER_EXISTS = """
SELECT COUNT(*) as count 
FROM usuarios 
WHERE id = %s
"""

# Buscar usuarios por texto (nombre, correo, cargo)
SEARCH_USERS = """
SELECT id, correo, nombre, usuario, cargo, grupo, rango 
FROM usuarios 
WHERE (nombre LIKE %s OR correo LIKE %s OR cargo LIKE %s)
ORDER BY nombre ASC
""" 