"""
Módulo para gestionar conexiones a MySQL.
Proporciona funciones para conectar, ejecutar consultas y manejar transacciones.
"""
import mysql.connector
from mysql.connector import Error
# import threading # Eliminado
# import traceback # Descomentar para debug más profundo si es necesario
from .config import get_db_config

class MySQLConnection:
    """
    Clase para manejar conexiones a MySQL. Cada ejecución de consulta
    establecerá y cerrará su propia conexión.
    """
    
    def __init__(self):
        # print("MySQLConnection: __init__ cargando config.") 
        self.config = get_db_config()
        # No se guarda estado de conexión ni lock aquí
    
    def _connect_internal(self):
        """Intenta establecer una nueva conexión y la devuelve."""
        try:
            # print("MySQL Connection: _connect_internal() - Intentando nueva conexión.")
            conn = mysql.connector.connect(**self.config)
            # print("MySQL Connection: _connect_internal() - Nueva conexión establecida.")
            return conn
        except Error as e_connect:
            print(f"MySQL Connection: _connect_internal() - Error CRÍTICO al conectar: {e_connect}")
            return None

    # get_connection() y disconnect() explícitos ya no son necesarios con este modelo
    # ya que cada execute_query/many maneja su ciclo de vida de conexión.

    def execute_query(self, query, params=None, fetch=True):
        conn = None
        cursor = None
        try:
            conn = self._connect_internal()
            if not conn:
                print(f"MySQLConnection: execute_query() - FALLO al conectar para: {query[:100]}")
                return None

            # print(f"MySQLConnection: execute_query() - Ejecutando: {query[:100]}{'...' if len(query) > 100 else ''}")
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params or ())
            
            if fetch:
                results = cursor.fetchall()
                # print(f"MySQLConnection: execute_query() - Fetch. Filas: {len(results) if results else 0}")
                return results
            else:
                conn.commit()
                affected_rows = cursor.rowcount
                # print(f"MySQLConnection: execute_query() - Commit. Filas afectadas: {affected_rows}")
                return {"affected_rows": affected_rows}
                
        except Error as e_query:
            print(f"MySQLConnection: execute_query() - Error MySQL '{e_query.errno}' al ejecutar '{query[:100]}...': {e_query.msg}")
            return None # La conexión se cerrará en finally
        except Exception as e_generic: # Captura otras excepciones
            print(f"MySQLConnection: execute_query() - Error genérico: {e_generic}")
            # import traceback
            # traceback.print_exc() # Descomentar para debug si es necesario
            return None
        finally:
            if cursor:
                try:
                    cursor.close()
                except Error:
                    pass 
            if conn and conn.is_connected():
                try:
                    # print(f"MySQLConnection: execute_query() - Cerrando conexión para: {query[:100]}")
                    conn.close()
                except Error as e_close:
                    print(f"MySQLConnection: execute_query() - Error al cerrar conexión: {e_close}")
    
    def execute_many(self, query, params_list):
        conn = None
        cursor = None
        try:
            conn = self._connect_internal()
            if not conn:
                print(f"MySQLConnection: execute_many() - FALLO al conectar para: {query[:100]}")
                return None

            # print(f"MySQLConnection: execute_many() - Ejecutando masiva: {query[:100]}{'...' if len(query) > 100 else ''}")
            cursor = conn.cursor()
            cursor.executemany(query, params_list)
            conn.commit()
            affected_rows = cursor.rowcount
            # print(f"MySQLConnection: execute_many() - Commit masivo. Filas: {affected_rows}")
            return {"affected_rows": affected_rows}
                
        except Error as e_executemany:
            print(f"MySQLConnection: execute_many() - Error MySQL '{e_executemany.errno}' al ejecutar masiva '{query[:100]}...': {e_executemany.msg}")
            return None # La conexión se cerrará en finally
        except Exception as e_generic_many:
            print(f"MySQLConnection: execute_many() - Error genérico: {e_generic_many}")
            # import traceback
            # traceback.print_exc()
            return None
        finally:
            if cursor:
                try:
                    cursor.close()
                except Error:
                    pass
            if conn and conn.is_connected():
                try:
                    # print(f"MySQLConnection: execute_many() - Cerrando conexión para: {query[:100]}")
                    conn.close()
                except Error as e_close:
                    print(f"MySQLConnection: execute_many() - Error al cerrar conexión para masiva: {e_close}")

# Las funciones globales y el concepto de instancia compartida han sido eliminados.
# Cada función de ruta creará una instancia y llamará a sus métodos.
# Ejemplo en una ruta:
# from ..db.mysql_connection import MySQLConnection
# def alguna_ruta():
#     db_ops = MySQLConnection()
#     resultado = db_ops.execute_query("SELECT * FROM tu_tabla")
#     return jsonify(resultado) 