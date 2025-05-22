import logging
from db.mysql_connection import MySQLConnection

logger = logging.getLogger(__name__)

def ensure_column_exists(table_name: str, column_name: str, column_definition: str) -> bool:
    """
    Verifica si una columna existe en una tabla y la crea si no.
    Retorna True si la columna existe o fue creada exitosamente, False en caso contrario.
    """
    db_ops = MySQLConnection()
    conn = None
    cursor = None
    try:
        conn = db_ops._connect_internal()
        if not conn:
            logger.error(f"ensure_column_exists: No se pudo conectar a la base de datos.")
            return False
        
        cursor = conn.cursor()
        
        # Verificar si la columna existe
        # Usar placeholders para table_name no es estándar en DESCRIBE o SHOW COLUMNS, 
        # así que se formatea con cuidado. Asegurarse que table_name y column_name son seguros.
        # Para mayor seguridad, se podría verificar table_name contra una lista de tablas permitidas.
        if not table_name.isidentifier() or not column_name.isidentifier():
            logger.error(f"ensure_column_exists: Nombre de tabla o columna inválido: {table_name}, {column_name}")
            return False

        cursor.execute(f"SHOW COLUMNS FROM `{table_name}` LIKE %s;", (column_name,))
        exists = cursor.fetchone()
        
        if exists:
            logger.info(f"La columna '{column_name}' ya existe en la tabla '{table_name}'.")
            return True
        else:
            logger.info(f"La columna '{column_name}' no existe en '{table_name}'. Intentando crearla...")
            # Crear la columna. Asegurarse que column_definition es seguro.
            # Es crucial validar column_definition si viene de una fuente externa.
            # Aquí se asume que es un string como "INT DEFAULT 0".
            alter_query = f"ALTER TABLE `{table_name}` ADD COLUMN `{column_name}` {column_definition};"
            cursor.execute(alter_query)
            conn.commit()
            logger.info(f"Columna '{column_name}' creada exitosamente en '{table_name}'.")
            return True
            
    except Exception as e:
        logger.error(f"Error en ensure_column_exists para {table_name}.{column_name}: {e}", exc_info=True)
        if conn:
            try:
                conn.rollback()
            except Exception as er:
                logger.error(f"Error haciendo rollback: {er}")
        return False
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close() 