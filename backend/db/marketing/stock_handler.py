import json
import logging
from flask import Blueprint, request, jsonify
from db.mysql_connection import MySQLConnection # Ajuste de la ruta de importación
from datetime import datetime # Asegurar que datetime está importado
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Dict, Any # Para type hints
from .utils import ensure_column_exists # <-- Importar la nueva utilidad

logger = logging.getLogger(__name__)
stock_bp = Blueprint('stock_bp', __name__, url_prefix='/api/marketing')


def calculate_stock(grupo: str) -> dict:
    """
    Calcula el stock disponible para un grupo ('kossodo' o 'kossomet').
    """
    if grupo not in ['kossodo', 'kossomet']:
        raise ValueError("Grupo inválido. Use 'kossodo' o 'kossomet'.")

    inventario_table = f"inventario_merch_{grupo}"
    
    db_ops = MySQLConnection() # Renombrado para claridad, sigue siendo tu clase
    conn = None # Inicializar conn
    cursor = None # Inicializar cursor

    try:
        conn = db_ops._connect_internal() # Usar el método interno para obtener la conexión

        if conn is None:
            logger.error("Error de conexión a la base de datos al calcular stock")
            return {"error": "Error de conexión a la base de datos"}

        cursor = conn.cursor(dictionary=True)
        
        # 1) Obtener columnas merch_
        cursor.execute(
            """
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = %s
              AND COLUMN_NAME LIKE 'merch\\_%' # Escapar la barra invertida para la query SQL
            """,
            (inventario_table,)
        )
        cols_result = cursor.fetchall()
        if not cols_result:
            logger.warning(f"No se encontraron columnas 'merch_' en la tabla {inventario_table}")
            return {"error": f"No se encontraron columnas 'merch_' en la tabla {inventario_table}"}
        cols = [r['COLUMN_NAME'] for r in cols_result]


        # 2) Sumar totales en inventario
        inventory_totals = {}
        for col in cols:
            # Asegurarse de que la columna existe antes de sumar
            cursor.execute(f"SELECT SUM(`{col}`) AS total FROM {inventario_table}")
            total_result = cursor.fetchone()
            total = total_result.get('total') if total_result else 0
            inventory_totals[col] = total or 0


        # 3) Restar productos confirmados
        request_totals = {col: 0 for col in cols}
        # Asegurarse de que la tabla inventario_solicitudes_conf existe
        cursor.execute("SHOW TABLES LIKE 'inventario_solicitudes_conf'")
        if cursor.fetchone():
            cursor.execute(
                "SELECT productos FROM inventario_solicitudes_conf WHERE grupo = %s",
                (grupo,)
            )
            for row in cursor.fetchall():
                try:
                    productos_str = row.get('productos')
                    if productos_str: # Verificar que no sea None o vacío
                        productos_dict = json.loads(productos_str)
                        for prod, qty in productos_dict.items():
                            if prod in request_totals:
                                request_totals[prod] += int(qty) # Asegurar que qty sea entero
                    else:
                        logger.info(f"Fila con productos vacíos o None para grupo {grupo}")
                except json.JSONDecodeError as e:
                    logger.error(f"Error decodificando JSON de productos: {productos_str}. Error: {e}")
                except Exception as e:
                    logger.error(f"Error procesando fila de productos: {row}. Error: {e}")
        else:
            logger.warning("La tabla 'inventario_solicitudes_conf' no existe. Omitiendo resta de solicitudes.")


        # 4) Calcular stock disponible
        stock = {col: inventory_totals.get(col, 0) - request_totals.get(col, 0) for col in cols}
        return stock

    except Exception as e:
        logger.error(f"Error calculando stock para {grupo}: {e}", exc_info=True)
        return {"error": str(e)}
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception as e_cursor_close:
                logger.error(f"Error cerrando cursor: {e_cursor_close}")
        if conn and conn.is_connected(): # Asegurarse de que la conexión exista y esté abierta
            try:
                conn.close()
                logger.debug(f"Conexión cerrada para calculate_stock grupo {grupo}")
            except Exception as e_conn_close:
                logger.error(f"Error cerrando conexión: {e_conn_close}")


@stock_bp.route('/stock', methods=['GET']) # Ruta simplificada ya que el prefijo está en el Blueprint
def obtener_stock():
    """
    Endpoint para devolver el stock disponible.
    Parámetros: ?grupo=kossodo|kossomet
    """
    grupo = request.args.get('grupo')
    if not grupo:
        return jsonify({"error": "Parámetro 'grupo' es requerido."}), 400
    if grupo not in ['kossodo', 'kossomet']:
        return jsonify({"error": "Grupo inválido. Use 'kossodo' o 'kossomet'."}), 400

    try:
        stock_calculado = calculate_stock(grupo)
        if "error" in stock_calculado:
             # Loguear el error que vino de calculate_stock
            logger.error(f"Error desde calculate_stock para grupo {grupo}: {stock_calculado['error']}")
            return jsonify(stock_calculado), 500 # Internal Server Error si hay un error de cálculo
        return jsonify(stock_calculado), 200
    except ValueError as ve: # Capturar el ValueError de calculate_stock
        logger.error(f"ValueError en obtener_stock para grupo {grupo}: {ve}")
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.error(f"Excepción inesperada en obtener_stock para grupo {grupo}: {e}", exc_info=True)
        return jsonify({"error": "Ocurrió un error inesperado al obtener el stock."}), 500 

# Definición de columnas para la tabla de solicitudes (debe coincidir con tu BD)
# Esto es un ejemplo, ajústalo a tu esquema real.
solicitud_columns = {
    "id": "INT AUTO_INCREMENT PRIMARY KEY",
    "solicitante": "VARCHAR(255) NOT NULL",
    "grupo": "VARCHAR(50) NOT NULL",
    "ruc": "VARCHAR(20) NOT NULL",
    "fecha_visita": "DATE NOT NULL",
    "cantidad_packs": "INT DEFAULT 0",
    "productos": "JSON",
    "catalogos": "TEXT",
    "timestamp": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    "status": "VARCHAR(50) DEFAULT 'pending'"
}

def ensure_table_exists(table_name: str, columns_definition: dict):
    """
    Asegura que una tabla exista en la base de datos. Si no, la crea.
    Esta es una función de utilidad y podría vivir en un módulo de BD más general.
    ADVERTENCIA: Esta implementación es básica y puede necesitar ajustes para producción.
    """
    db_ops = MySQLConnection()
    # Verificar si la tabla existe
    # Nota: information_schema.TABLES es más estándar pero SHOW TABLES es más simple aquí.
    check_table_query = f"SHOW TABLES LIKE '{table_name}'"
    result = db_ops.execute_query(check_table_query)

    if not result:
        logger.info(f"La tabla '{table_name}' no existe. Creándola...")
        cols_str = ", ".join([f"`{col_name}` {col_type}" for col_name, col_type in columns_definition.items()])
        create_table_query = f"CREATE TABLE {table_name} ({cols_str})"
        try:
            db_ops.execute_query(create_table_query, fetch=False) # fetch=False para DDL
            logger.info(f"Tabla '{table_name}' creada exitosamente.")
        except Exception as e_create:
            logger.error(f"Error al crear la tabla '{table_name}': {e_create}")
            # Podrías querer relanzar el error o manejarlo de forma más específica
    # else:
        # logger.debug(f"La tabla '{table_name}' ya existe.")

def generate_email_template(data: Dict[str, Any]) -> str:
    """
    Generate HTML template for email notifications

    Args:
        data: Data to include in the template

    Returns:
        str: HTML content for email
    """
    productos_html = ""
    productos = data.get('productos', [])
    if isinstance(productos, str):
        try:
            productos = json.loads(productos)
        except:
            productos = []

    if isinstance(productos, list):
        productos_html = "".join(f"<li>{p}</li>" for p in productos)
    elif isinstance(productos, dict):
        productos_html = "".join(f"<li>{k}: {v}</li>" for k, v in productos.items())

    return f"""
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {{
            font-family: Arial, sans-serif;
            background-color: #f9f9f9;
            margin: 0;
            padding: 0;
          }}
          .container {{
            max-width: 600px;
            margin: 20px auto;
            background: #fff;
            padding: 20px;
            border: 1px solid #ddd;
          }}
          h2 {{
            color: #006699;
            margin-top: 0;
          }}
          table {{
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
          }}
          table, th, td {{
            border: 1px solid #ddd;
          }}
          th {{
            background-color: #f2f2f2;
          }}
          th, td {{
            text-align: left;
            padding: 8px;
          }}
          .button {{
            display: inline-block;
            background-color: #006699;
            color: #fff;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            margin: 15px 0;
          }}
          .footer {{
            margin-top: 20px;
            font-size: 12px;
            color: #777;
          }}
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Nueva Solicitud de {data.get('solicitante', 'N/A')}</h2>
          <p>Estimados,</p>
          <p>Se ha registrado una nueva solicitud de inventario con la siguiente información:</p>
          <table>
            <tr>
              <th>ID</th>
              <td>{data.get('id', 'N/A')}</td>
            </tr>
            <tr>
              <th>Fecha/Hora de Registro</th>
              <td>{data.get('timestamp', 'N/A')}</td>
            </tr>
            <tr>
              <th>Solicitante</th>
              <td>{data.get('solicitante', 'N/A')}</td>
            </tr>
            <tr>
              <th>Grupo</th>
              <td>{data.get('grupo', 'N/A')}</td>
            </tr>
            <tr>
              <th>RUC</th>
              <td>{data.get('ruc', 'N/A')}</td>
            </tr>
            <tr>
              <th>Fecha de Visita</th>
              <td>{data.get('fecha_visita', 'N/A')}</td>
            </tr>
            <tr>
              <th>Cantidad de Packs</th>
              <td>{data.get('cantidad_packs', 'N/A')}</td>
            </tr>
            <tr>
              <th>Productos</th>
              <td>
                <ul>{productos_html}</ul>
              </td>
            </tr>
            <tr>
              <th>Catálogos</th>
              <td>{data.get('catalogos', 'N/A')}</td>
            </tr>
            <tr>
              <th>Estado</th>
              <td>{data.get('status', 'pending')}</td>
            </tr>
          </table>
          <p>Para aprobar o procesar esta solicitud, haga clic en el siguiente enlace:</p>
          <p>
            <a href="https://kossodo.estilovisual.com/marketing/inventario/confirmacion.html" class="button">
              Aprobar/Procesar Solicitud
            </a>
          </p>
          <p>Si necesita más información, revise la solicitud en el sistema.</p>
          <p>Saludos cordiales,<br/><strong>Sistema de Inventario</strong></p>
          <div class="footer">
            Este mensaje ha sido generado automáticamente. No responda a este correo.
          </div>
        </div>
      </body>
    </html>
    """

def send_email_notification(recipients: List[str], subject: str, template_data: Dict[str, Any]) -> bool:
    """
    Send email notification.

    Args:
        recipients: List of email addresses
        subject: Email subject
        template_data: Data to include in the email template

    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Obtener credenciales de entorno
        email_user = os.environ.get('EMAIL_USER')
        email_password = os.environ.get('EMAIL_PASSWORD')

        if not email_user or not email_password:
            logger.error("Credenciales de email no configuradas en las variables de entorno (EMAIL_USER, EMAIL_PASSWORD)")
            return False

        # Crear mensaje MIME
        msg = MIMEMultipart("alternative")
        msg["From"] = email_user
        msg["To"] = ", ".join(recipients)
        msg["Subject"] = subject

        # Generar cuerpo HTML
        body_html = generate_email_template(template_data)
        msg.attach(MIMEText(body_html, "html"))

        # Enviar vía SMTP
        # Asegúrate de que la configuración de tu servidor SMTP (host, puerto) sea la correcta.
        # Gmail usa 'smtp.gmail.com' y puerto 587 para TLS.
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls() # Habilitar seguridad
        server.login(email_user, email_password)
        server.sendmail(email_user, recipients, msg.as_string())
        server.quit()

        logger.info(f"Email enviado exitosamente a {', '.join(recipients)}")
        return True

    except smtplib.SMTPAuthenticationError:
        logger.error("Error de autenticación SMTP. Verifica EMAIL_USER y EMAIL_PASSWORD.")
        return False
    except Exception as e:
        logger.error(f"Error enviando email: {e}", exc_info=True)
        return False

@stock_bp.route('/solicitud', methods=['POST'])
def crear_solicitud():
    """
    Crea una nueva solicitud de inventario.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No se proporcionaron datos en formato JSON."}), 400

    solicitante    = data.get('solicitante')
    grupo          = data.get('grupo')
    ruc            = data.get('ruc')
    fecha_visita   = data.get('fechaVisita') # Frontend envía fechaVisita (camelCase)
    cantidad_packs = data.get('cantidad_packs', 0)
    productos      = data.get('productos', [])
    catalogos      = data.get('catalogos', "")

    # Validaciones básicas
    if not all([solicitante, grupo, ruc, fecha_visita, isinstance(cantidad_packs, int), isinstance(productos, list)]):
        missing_fields = []
        if not solicitante: missing_fields.append('solicitante')
        if not grupo: missing_fields.append('grupo')
        if not ruc: missing_fields.append('ruc')
        if not fecha_visita: missing_fields.append('fechaVisita')
        if not isinstance(cantidad_packs, int): missing_fields.append('cantidad_packs (debe ser int)')
        if not isinstance(productos, list): missing_fields.append('productos (debe ser array)')
        return jsonify({"error": f"Faltan campos requeridos o tienen tipo incorrecto: {', '.join(missing_fields)}."}), 400
    
    if grupo not in ['kossodo', 'kossomet']:
        return jsonify({"error": "Grupo inválido. Use 'kossodo' o 'kossomet'."}), 400

    productos_str = json.dumps(productos)

    db_ops = MySQLConnection()
    conn = None
    cursor = None
    
    try:
        ensure_table_exists("inventario_solicitudes", solicitud_columns)
        
        conn = db_ops._connect_internal()
        if conn is None:
            logger.error("crear_solicitud: Error de conexión a la base de datos")
            return jsonify({"error": "Error de conexión a la base de datos"}), 500

        cursor = conn.cursor()
        
        insert_sql = """
            INSERT INTO inventario_solicitudes
                (solicitante, grupo, ruc, fecha_visita, cantidad_packs, productos, catalogos, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
        """
        cursor.execute(insert_sql, (
            solicitante,
            grupo,
            ruc,
            fecha_visita,
            cantidad_packs,
            productos_str,
            catalogos,
            'pending' # Status inicial
        ))
        conn.commit()
        nuevo_id = cursor.lastrowid

        solicitud_data = {
            "id": nuevo_id,
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "solicitante": solicitante,
            "grupo": grupo,
            "ruc": ruc,
            "fecha_visita": fecha_visita,
            "cantidad_packs": cantidad_packs,
            "productos": productos,
            "catalogos": catalogos,
            "status": "pending"
        }
        recipients = [
            "jcamacho@kossodo.com",
            "rbazan@kossodo.com",
            "creatividad@kossodo.com",
            "eventos@kossodo.com"
        ]
        subject = f"Nueva Solicitud de Merchandising (ID: {nuevo_id}) - {solicitante}"

        from threading import Thread
        Thread(
            target=send_email_notification,
            args=(recipients, subject, solicitud_data)
        ).start()

        return jsonify({"message": "Solicitud creada exitosamente", "id_solicitud": nuevo_id}), 201

    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error creando solicitud: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception as e_cursor_close:
                logger.error(f"Error cerrando cursor en crear_solicitud: {e_cursor_close}")
        if conn and conn.is_connected():
            try:
                conn.close()
            except Exception as e_conn_close:
                logger.error(f"Error cerrando conexión en crear_solicitud: {e_conn_close}") 

# Endpoint para obtener todos los registros de inventario para un grupo
@stock_bp.route('/inventory', methods=['GET'])
def obtener_inventario_completo(): # Renombrado para evitar colisión con un posible endpoint de stock
    """
    Parámetros: ?tabla=kossodo|kossomet
    Devuelve todos los registros de inventario ordenados por timestamp.
    """
    tabla = request.args.get('tabla')
    if tabla not in ['kossodo', 'kossomet']:
        return jsonify({"error": "Parámetro 'tabla' inválido. Use 'kossodo' o 'kossomet'"}), 400
    table_name = f"inventario_merch_{tabla}"

    db_ops = MySQLConnection()
    conn = None
    cursor = None
    try:
        conn = db_ops._connect_internal()
        if conn is None:
            logger.error(f"obtener_inventario_completo: Error de conexión a la base de datos para {table_name}")
            return jsonify({"error": "Error de conexión a la base de datos"}), 500

        cursor = conn.cursor(dictionary=True)
        # Asegurar que la tabla exista (opcional, pero bueno para robustez)
        # Podrías tener una función ensure_table_exists similar a ensure_column_exists
        cursor.execute(f"SELECT * FROM `{table_name}` ORDER BY timestamp DESC;") # Usar backticks para el nombre de tabla
        registros = cursor.fetchall()
        return jsonify(registros), 200
    except Exception as e:
        logger.error(f"Error al obtener inventario de {table_name}: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


# Endpoint para agregar un nuevo registro de inventario
@stock_bp.route('/inventory', methods=['POST'])
def agregar_inventario():
    """
    Parámetros: ?tabla=kossodo|kossomet
    Body JSON con campos 'responsable', 'observaciones' y cualquiera que empiece con 'merch_'.
    """
    tabla = request.args.get('tabla')
    if tabla not in ['kossodo', 'kossomet']:
        return jsonify({"error": "Parámetro 'tabla' inválido. Use 'kossodo' o 'kossomet'"}), 400
    table_name = f"inventario_merch_{tabla}"
    data = request.get_json() or {}

    columnas = []
    valores = []
    for key, val in data.items():
        if key in ['responsable', 'observaciones'] or key.startswith('merch_'):
            columnas.append(key)
            valores.append(val)

    if not columnas:
        return jsonify({"error": "No se han enviado campos válidos para insertar."}), 400

    placeholders = ", ".join(["%s"] * len(valores))
    cols_str = ", ".join([f"`{c}`" for c in columnas]) # Usar backticks para nombres de columna
    query = f"INSERT INTO `{table_name}` ({cols_str}) VALUES ({placeholders});" # Usar backticks para nombre de tabla

    db_ops = MySQLConnection()
    conn = None
    cursor = None
    try:
        conn = db_ops._connect_internal()
        if conn is None:
            logger.error(f"agregar_inventario: Error de conexión a la base de datos para {table_name}")
            return jsonify({"error": "Error de conexión a la base de datos"}), 500

        cursor = conn.cursor()
        cursor.execute(query, tuple(valores))
        conn.commit()
        return jsonify({"message": "Registro agregado exitosamente", "id": cursor.lastrowid}), 201
    except Exception as e:
        if conn: conn.rollback()
        logger.error(f"Error al agregar inventario en {table_name}: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


# Endpoint para añadir un nuevo producto al inventario (nueva columna)
@stock_bp.route('/nuevo_producto', methods=['POST'])
def nuevo_producto():
    """
    Añade una nueva columna de producto al inventario y crea un registro inicial si se provee cantidad.
    Body JSON con:
      - grupo: 'kossodo' o 'kossomet'
      - columna: nombre de la nueva columna (p.ej. 'merch_nuevo_item')
      - cantidad: cantidad inicial (int, opcional, por defecto no se inserta si es None o no presente)
      - responsable: (string, opcional para el registro inicial)
    """
    data = request.get_json() or {}
    grupo = data.get('grupo')
    columna_nombre_base = data.get('columna') # ej: merch_lapicero_nuevo o merch_lapicero_nuevo_eje
    cantidad = data.get('cantidad') # Puede ser None
    responsable = data.get('responsable') # Opcional

    if grupo not in ['kossodo', 'kossomet'] or not columna_nombre_base or not columna_nombre_base.startswith('merch_'):
        return jsonify({"error": "Datos inválidos: grupo incorrecto o nombre de columna no válido (debe empezar con 'merch_')."}), 400

    table_name = f"inventario_merch_{grupo}"

    # Definición de la nueva columna. Podría ser más configurable.
    column_definition = "INT DEFAULT 0"

    if not ensure_column_exists(table_name, columna_nombre_base, column_definition):
        return jsonify({"error": f"No se pudo crear o verificar la columna '{columna_nombre_base}' en '{table_name}'."}), 500

    # Si se proporciona una cantidad, se inserta un registro inicial.
    # Esto es opcional, la columna ya está creada.
    if cantidad is not None:
        db_ops = MySQLConnection()
        conn = None
        cursor = None
        try:
            conn = db_ops._connect_internal()
            if conn is None:
                logger.error(f"nuevo_producto: Error de conexión para registro inicial en {table_name}")
                return jsonify({"error": "Error de conexión para registro inicial"}), 500
            
            cursor = conn.cursor()
            insert_cols = [f"`{columna_nombre_base}`"]
            insert_vals = [cantidad]
            placeholders = ["%s"]

            if responsable:
                insert_cols.append("`responsable`")
                insert_vals.append(responsable)
                placeholders.append("%s")
            
            cols_str = ", ".join(insert_cols)
            placeholders_str = ", ".join(placeholders)
            
            # Asumiendo que la tabla tiene `timestamp` que se actualiza automáticamente
            insert_query = f"INSERT INTO `{table_name}` ({cols_str}) VALUES ({placeholders_str});"
            
            cursor.execute(insert_query, tuple(insert_vals))
            conn.commit()
            return jsonify({
                "message": f"Nuevo producto '{columna_nombre_base}' agregado y registro inicial creado con ID: {cursor.lastrowid}",
                "id": cursor.lastrowid
            }), 201
        except Exception as e:
            if conn: conn.rollback()
            logger.error(f"Error al crear registro inicial para nuevo producto '{columna_nombre_base}' en {table_name}: {e}", exc_info=True)
            # La columna fue creada, pero el registro inicial falló. Informar esto podría ser útil.
            return jsonify({"error": f"Columna creada, pero falló el registro inicial: {str(e)}"}), 500
        finally:
            if cursor: cursor.close()
            if conn and conn.is_connected(): conn.close()
    else:
        # Si no se proporciona cantidad, solo se confirma la creación de la columna (hecho por ensure_column_exists)
        return jsonify({"message": f"Columna '{columna_nombre_base}' asegurada/creada en '{table_name}'. No se creó registro inicial."}), 200 