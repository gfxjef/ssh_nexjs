import json
import logging
from flask import Blueprint, request, jsonify
from db.mysql_connection import MySQLConnection
from .stock_handler import ensure_table_exists # Importamos para reutilizarla

logger = logging.getLogger(__name__)
solicitudes_bp = Blueprint('solicitudes_bp', __name__, url_prefix='/api/marketing')

# Definición de columnas para la tabla de confirmación de solicitudes
# NOTA: La FK se define mejor directamente en el CREATE TABLE.
# ensure_table_exists es simple y no maneja la adición de FKs complejas después de crear columnas.
# Se recomienda que la FK exista en la BD o se ajuste ensure_table_exists si es crítico para esta función.
solicitudes_conf_columns = {
    "id": "INT AUTO_INCREMENT PRIMARY KEY",
    "solicitud_id": "INT NOT NULL", # Referencia a inventario_solicitudes.id
    "confirmador": "VARCHAR(255) NOT NULL",
    "observaciones": "TEXT",
    "productos": "JSON", # Productos finales aprobados y sus cantidades
    "grupo": "VARCHAR(50)", # Para saber a qué inventario afectaría (kossodo/kossomet)
    "timestamp": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    # Considerar añadir: FOREIGN KEY (solicitud_id) REFERENCES inventario_solicitudes(id)
    # Esto se haría en la creación manual de la tabla o con una herramienta de migración.
}

@solicitudes_bp.route('/solicitudes', methods=['GET'])
def obtener_solicitudes():
    """
    Recupera las solicitudes de inventario.
    Parámetros opcionales:
      - status: filtra por estado ('pending', 'confirmed', etc.)
      - id:    filtra por ID de solicitud
    Ejemplo de llamada: GET /api/marketing/solicitudes?status=pending&id=5
    """
    db_ops = MySQLConnection()
    conn = None
    cursor = None

    status_param = request.args.get('status')
    id_param     = request.args.get('id')

    try:
        conn = db_ops._connect_internal()
        if conn is None:
            logger.error("obtener_solicitudes: Error de conexión a la base de datos")
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        base_query = "SELECT * FROM inventario_solicitudes"
        conditions = []
        values     = []

        if status_param:
            conditions.append("status = %s")
            values.append(status_param)

        if id_param:
            conditions.append("id = %s")
            values.append(id_param)

        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)

        base_query += " ORDER BY timestamp DESC" # Ordenar por más reciente primero
        
        cursor.execute(base_query, tuple(values))
        rows = cursor.fetchall()

        # Convertir JSON de 'productos' en objeto/lista Python
        for row in rows:
            if row.get('productos'):
                try:
                    row['productos'] = json.loads(row['productos'])
                except json.JSONDecodeError:
                    logger.warning(f"obtener_solicitudes: No se pudo decodificar JSON para productos en solicitud ID {row.get('id')}: {row['productos']}")
                    # Mantener como string si no se puede parsear, o asignar None/lista vacía
                    pass 

        return jsonify(rows), 200

    except Exception as e:
        logger.error(f"Error al obtener solicitudes: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception as e_cursor:
                logger.error(f"Error cerrando cursor en obtener_solicitudes: {e_cursor}")
        if conn and conn.is_connected():
            try:
                conn.close()
            except Exception as e_conn:
                logger.error(f"Error cerrando conexión en obtener_solicitudes: {e_conn}")


@solicitudes_bp.route('/solicitudes/<int:solicitud_id>/confirm', methods=['PUT'])
def confirmar_solicitud(solicitud_id):
    """
    Confirma una solicitud de inventario:
      - Valida que exista y esté en estado 'pending'.
      - Lee del JSON el confirmador, observaciones y el diccionario productos.
      - Inserta en inventario_solicitudes_conf y actualiza el estado de la solicitud principal.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No se proporcionaron datos en formato JSON."}), 400

    confirmador       = data.get('confirmador')
    observaciones     = data.get('observaciones', "")
    productos_finales = data.get('productos', {}) # Espera un dict, ej: {"merch_lapicero_esco": 10}

    if not confirmador:
        return jsonify({"error": "El campo 'confirmador' es requerido."}), 400
    if not isinstance(productos_finales, dict):
        return jsonify({"error": "El campo 'productos' debe ser un objeto JSON (diccionario)."}), 400


    db_ops = MySQLConnection()
    conn = None
    cursor = None

    try:
        # Asegurar que la tabla de confirmaciones exista
        ensure_table_exists("inventario_solicitudes_conf", solicitudes_conf_columns)

        conn = db_ops._connect_internal()
        if conn is None:
            logger.error("confirmar_solicitud: Error de conexión a la base de datos")
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
        cursor = conn.cursor(dictionary=True)

        # 1) Verificar que la solicitud exista y esté pendiente
        cursor.execute(
            "SELECT status, grupo FROM inventario_solicitudes WHERE id = %s",
            (solicitud_id,)
        )
        solicitud_original = cursor.fetchone()
        if not solicitud_original:
            conn.rollback() # No es necesario si no se han hecho cambios, pero buena práctica
            return jsonify({"error": "La solicitud no existe."}), 404
        if solicitud_original['status'] != 'pending':
            conn.rollback()
            return jsonify({
                "error": f"La solicitud no está pendiente (estado actual: {solicitud_original['status']})."
            }), 400

        grupo_solicitud = solicitud_original['grupo']
        productos_json_finales = json.dumps(productos_finales)

        # 2) Insertar la confirmación
        insert_sql_conf = """
            INSERT INTO inventario_solicitudes_conf
              (solicitud_id, confirmador, observaciones, productos, grupo)
            VALUES (%s, %s, %s, %s, %s);
        """
        cursor.execute(insert_sql_conf, (
            solicitud_id,
            confirmador,
            observaciones,
            productos_json_finales,
            grupo_solicitud
        ))

        # 3) Actualizar el estado de la solicitud original
        cursor.execute(
            "UPDATE inventario_solicitudes SET status = 'confirmed' WHERE id = %s",
            (solicitud_id,)
        )

        conn.commit()
        return jsonify({"message": "Solicitud confirmada exitosamente"}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error en confirmación de solicitud ID {solicitud_id}: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception as e_cursor:
                logger.error(f"Error cerrando cursor en confirmar_solicitud: {e_cursor}")

        if conn and conn.is_connected():
            try:
                conn.close()
            except Exception as e_conn:
                logger.error(f"Error cerrando conexión en confirmar_solicitud: {e_conn}") 