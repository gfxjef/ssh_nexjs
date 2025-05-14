"""
Módulo para gestionar conexiones a MySQL.
Proporciona funciones para conectar, ejecutar consultas y manejar transacciones.
"""
import mysql.connector
from mysql.connector import Error
import threading # Añadido
from .config import get_db_config

class MySQLConnection:
    """
    Clase para manejar conexiones a MySQL de forma segura y centralizada.
    """
    # _instance = None # Eliminado Singleton
    
    # def __new__(cls):
    #     if cls._instance is None:
    #         cls._instance = super(MySQLConnection, cls).__new__(cls)
    #         cls._instance.connection = None
    #         cls._instance.config = get_db_config()
    #     return cls._instance
    
    def __init__(self):
        print("MySQLConnection: __init__ creando nueva instancia y configuración.") # Log para ver cuándo se crea
        self.config = get_db_config()
        self.connection = None
        self._lock = threading.Lock() # Añadido
        # self.cursor = None # El cursor debe ser por ejecución
    
    def _connect_internal(self):
        """Intenta establecer una nueva conexión."""
        try:
            print("MySQL Connection: _connect_internal() - Intentando nueva conexión.")
            self.connection = mysql.connector.connect(**self.config)
            print("MySQL Connection: _connect_internal() - Nueva conexión establecida.")
            return True
        except Error as e_connect:
            print(f"MySQL Connection: _connect_internal() - Error CRÍTICO al conectar: {e_connect}")
            self.connection = None
            return False

    def get_connection(self):
        """
        Asegura que haya una conexión activa y la devuelve.
        Si no hay conexión o no está activa, intenta (re)conectar.
        """
        with self._lock: # Añadido protector de hilo
            try:
                if self.connection is None or not self.connection.is_connected():
                    print("MySQL Connection: get_connection() - Conexión inexistente o cerrada. (Re)conectando...")
                    # Intentar cerrar "formalmente" si existe el objeto pero no está conectado
                    if self.connection is not None:
                        try:
                            self.connection.close()
                        except Exception:
                            pass # Ignorar errores al cerrar una conexión ya mala
                    self._connect_internal() # _connect_internal es llamado dentro del lock
                
                if self.connection and self.connection.is_connected():
                    # print("MySQL Connection: get_connection() - Conexión activa disponible.")
                    return self.connection
                else:
                    print("MySQL Connection: get_connection() - FALLO al obtener conexión activa después del intento.")
                    return None
            except Exception as e:
                print(f"MySQL Connection: get_connection() - Excepción inesperada: {e}")
                self.connection = None # Asegurar que esté limpia para el próximo intento
                return None

    def disconnect(self): # Este método puede ser llamado explícitamente si se necesita.
        """Cierra la conexión activa si existe."""
        with self._lock: # Añadido protector de hilo
            print("MySQL Connection: disconnect() - Solicitud de desconexión...")
            if self.connection and self.connection.is_connected():
                try:
                    self.connection.close()
                    print("MySQL Connection: disconnect() - Conexión cerrada.")
                except Error as e_conn:
                    print(f"MySQL Connection: disconnect() - Error al cerrar la conexión: {e_conn}")
                finally:
                    self.connection = None
            else:
                print("MySQL Connection: disconnect() - No había conexión activa para cerrar.")
                self.connection = None
    
    def execute_query(self, query, params=None, fetch=True):
        conn = self.get_connection()
        if not conn:
            print(f"MySQL Connection: execute_query() - No se pudo obtener conexión para: {query[:100]}")
            return None

        cursor = None
        try:
            print(f"MySQL Connection: execute_query() - Ejecutando: {query[:100]}{'...' if len(query) > 100 else ''}")
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params or ())
            
            if fetch:
                results = cursor.fetchall()
                print(f"MySQL Connection: execute_query() - Fetch exitoso. Filas: {len(results) if results else 0}")
                return results
            else:
                conn.commit()
                affected_rows = cursor.rowcount
                print(f"MySQL Connection: execute_query() - Commit exitoso. Filas afectadas: {affected_rows}")
                return {"affected_rows": affected_rows}
                
        except Error as e_query:
            print(f"MySQL Connection: execute_query() - Error MySQL '{e_query.errno}' al ejecutar '{query[:100]}...': {e_query.msg}")
            if e_query.errno == 2006: # MySQL server has gone away
                print("MySQL Connection: execute_query() - Error 'MySQL server has gone away'. Intentando limpiar conexión.")
                self.disconnect() # Usar disconnect() que ya está protegido por lock
            elif e_query.errno == 2013: # Lost connection to MySQL server during query
                 print("MySQL Connection: execute_query() - Error 'Lost connection to MySQL server during query'. Intentando limpiar conexión.")
                 self.disconnect() # Usar disconnect() que ya está protegido por lock
            # No hacer rollback aquí, ya que la conexión podría estar mal.
            # El rollback debería ser manejado por el llamador si es una transacción más grande.
            return None
        except Exception as e_generic:
            print(f"MySQL Connection: execute_query() - Error genérico: {e_generic}")
            import traceback
            traceback.print_exc()
            return None
        finally:
            if cursor:
                try:
                    cursor.close()
                except Error:
                    pass 
    
    def execute_many(self, query, params_list):
        conn = self.get_connection()
        if not conn:
            print(f"MySQL Connection: execute_many() - No se pudo obtener conexión para: {query[:100]}")
            return None
        
        cursor = None
        try:
            print(f"MySQL Connection: execute_many() - Ejecutando masiva: {query[:100]}{'...' if len(query) > 100 else ''}")
            cursor = conn.cursor()
            cursor.executemany(query, params_list)
            conn.commit()
            affected_rows = cursor.rowcount
            print(f"MySQL Connection: execute_many() - Commit masivo exitoso. Filas afectadas: {affected_rows}")
            return {"affected_rows": affected_rows}
                
        except Error as e_executemany:
            print(f"MySQL Connection: execute_many() - Error MySQL '{e_executemany.errno}' al ejecutar masiva '{query[:100]}...': {e_executemany.msg}")
            if e_executemany.errno == 2006 or e_executemany.errno == 2013:
                self.disconnect() # Usar disconnect() que ya está protegido por lock
            return None
        except Exception as e_generic_many:
            print(f"MySQL Connection: execute_many() - Error genérico: {e_generic_many}")
            import traceback
            traceback.print_exc()
            return None
        finally:
            if cursor:
                try:
                    cursor.close()
                except Error:
                    pass

    # Los métodos __enter__ y __exit__ ya no son necesarios si no usamos 'with MySQLConnection()'
    # directamente en las funciones globales que hemos eliminado.
    # Si alguna vez se necesita un context manager para la conexión, se pueden reintroducir.

# Las funciones globales get_connection, execute_query, y execute_many han sido eliminadas.
# Ahora se debe obtener la instancia y llamar a sus métodos directamente:
# db_conn = MySQLConnection()
# result = db_conn.execute_query(...) 