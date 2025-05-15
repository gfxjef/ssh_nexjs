"""
Módulo para la gestión de encuestas.
Contiene el Blueprint para las rutas de la API y la inicialización de la base de datos.
"""
from flask import current_app
from .routes.encuestas_routes import encuestas_bp # Importar el Blueprint
from .queries import CREATE_ENVIOS_ENCUESTAS_TABLE
from ..mysql_connection import MySQLConnection # Para ejecutar la creación de la tabla

def init_encuestas_db():
    """
    Crea la tabla 'envio_de_encuestas' si no existe.
    Se debe llamar en el contexto de la aplicación Flask.
    """
    try:
        # Este patrón es similar a como inicializamos otras tablas
        # Asegurarse de que MySQLConnection está disponible y configurada
        # print("ENCUESTAS INIT: Intentando crear tabla 'envio_de_encuestas'...")
        db_ops = MySQLConnection()
        result = db_ops.execute_query(CREATE_ENVIOS_ENCUESTAS_TABLE, fetch=False)
        # execute_query con fetch=False para DDL no devuelve None en éxito, sino un dict o nada.
        # La verificación de result puede necesitar ajuste según el comportamiento exacto de tu MySQLConnection.
        if result is not None: # Asumiendo que no devuelve None si la conexión y la sintaxis son OK
            print("ENCUESTAS INIT: Tabla 'envio_de_encuestas' verificada/creada exitosamente o ya existía.")
        else:
            # Esto podría indicar un problema más serio si la conexión falló y devolvió None.
            print("ENCUESTAS INIT: Hubo un problema al verificar/crear la tabla 'envio_de_encuestas', la consulta DDL pudo fallar o la conexión no se estableció.")

    except Exception as e:
        # Usar current_app.logger si está configurado, o print para debug.
        error_message = f"ENCUESTAS INIT: Error CRÍTICO al inicializar la tabla 'envio_de_encuestas': {e}"
        try:
            current_app.logger.error(error_message)
        except RuntimeError: # Fuera del contexto de la aplicación
            print(error_message) 