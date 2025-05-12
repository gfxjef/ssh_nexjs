"""
Módulo para gestionar conexiones a MySQL.
Proporciona funciones para conectar, ejecutar consultas y manejar transacciones.
"""
import mysql.connector
from mysql.connector import Error
from .config import get_db_config

class MySQLConnection:
    """
    Clase para manejar conexiones a MySQL de forma segura y centralizada.
    Implementa patrón singleton y context manager para uso con 'with'.
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MySQLConnection, cls).__new__(cls)
            cls._instance.connection = None
        return cls._instance
    
    def __init__(self):
        self.config = get_db_config()
        self.connection = None
        self.cursor = None
    
    def connect(self):
        """
        Establece una conexión a la base de datos MySQL.
        
        Returns:
            bool: True si la conexión fue exitosa, False en caso contrario.
        """
        try:
            if self.connection is None or not self.connection.is_connected():
                self.connection = mysql.connector.connect(**self.config)
                print("Conexión a MySQL establecida correctamente")
            return True
        except Error as e:
            print(f"Error al conectar a MySQL: {e}")
            return False
    
    def disconnect(self):
        """
        Cierra la conexión a la base de datos si está abierta.
        """
        if self.connection and self.connection.is_connected():
            if self.cursor:
                self.cursor.close()
            self.connection.close()
            print("Conexión a MySQL cerrada")
    
    def execute_query(self, query, params=None, fetch=True):
        """
        Ejecuta una consulta SQL y devuelve los resultados.
        
        Args:
            query (str): Consulta SQL a ejecutar
            params (tuple, optional): Parámetros para la consulta
            fetch (bool, optional): Si es True, devuelve los resultados
            
        Returns:
            list/None: Resultados de la consulta o None si hay error
        """
        try:
            if not self.connect():
                return None
                
            self.cursor = self.connection.cursor(dictionary=True)
            self.cursor.execute(query, params or ())
            
            if fetch:
                return self.cursor.fetchall()
            else:
                self.connection.commit()
                return {"affected_rows": self.cursor.rowcount}
                
        except Error as e:
            print(f"Error al ejecutar la consulta: {e}")
            if self.connection and self.connection.is_connected():
                self.connection.rollback()
            return None
            
        finally:
            if self.cursor:
                self.cursor.close()
                self.cursor = None
    
    def execute_many(self, query, params_list):
        """
        Ejecuta una consulta SQL con múltiples conjuntos de parámetros.
        
        Args:
            query (str): Consulta SQL a ejecutar
            params_list (list): Lista de tuplas con parámetros
            
        Returns:
            dict/None: Información de filas afectadas o None si hay error
        """
        try:
            if not self.connect():
                return None
                
            self.cursor = self.connection.cursor()
            self.cursor.executemany(query, params_list)
            self.connection.commit()
            return {"affected_rows": self.cursor.rowcount}
                
        except Error as e:
            print(f"Error al ejecutar la consulta masiva: {e}")
            if self.connection and self.connection.is_connected():
                self.connection.rollback()
            return None
            
        finally:
            if self.cursor:
                self.cursor.close()
                self.cursor = None
    
    def __enter__(self):
        """Permite usar la clase con 'with'"""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Cierra la conexión al salir del bloque 'with'"""
        self.disconnect()


# Funciones auxiliares para uso fácil

def get_connection():
    """
    Obtiene una instancia de la conexión a MySQL.
    
    Returns:
        MySQLConnection: Instancia de conexión
    """
    return MySQLConnection()

def execute_query(query, params=None, fetch=True):
    """
    Ejecuta una consulta y maneja automáticamente la conexión.
    
    Args:
        query (str): Consulta SQL a ejecutar
        params (tuple, optional): Parámetros para la consulta
        fetch (bool, optional): Si es True, devuelve los resultados
        
    Returns:
        list/dict/None: Resultados de la consulta o info de filas afectadas
    """
    with MySQLConnection() as conn:
        return conn.execute_query(query, params, fetch)

def execute_many(query, params_list):
    """
    Ejecuta una consulta con múltiples conjuntos de parámetros.
    
    Args:
        query (str): Consulta SQL a ejecutar
        params_list (list): Lista de tuplas con parámetros
        
    Returns:
        dict/None: Información de filas afectadas o None si hay error
    """
    with MySQLConnection() as conn:
        return conn.execute_many(query, params_list) 