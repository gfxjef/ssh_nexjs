import json
import logging
from flask import Blueprint, request, jsonify
from db.mysql_connection import MySQLConnection

logger = logging.getLogger(__name__)
historial_bp = Blueprint('historial_bp', __name__, url_prefix='/api/marketing')

@historial_bp.route('/confirmaciones', methods=['GET'])
def obtener_historial_confirmaciones():
    """
    Recupera el historial de confirmaciones (todas las entradas de inventario_solicitudes_conf),
    junto con datos clave de la solicitud original de inventario_solicitudes.
    Admite paginación.
    """
    db_ops = MySQLConnection()
    conn = None
    cursor = None

    try:
        # Obtener parámetros de paginación de la query string
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        offset = (page - 1) * limit

        conn = db_ops._connect_internal()
        if conn is None:
            logger.error("obtener_historial_confirmaciones: Error de conexión a la base de datos")
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Query para obtener el total de registros (sin LIMIT/OFFSET)
        count_query = "SELECT COUNT(*) as total FROM inventario_solicitudes_conf isc JOIN inventario_solicitudes s ON isc.solicitud_id = s.id;"
        cursor.execute(count_query)
        total_records = cursor.fetchone()['total']

        # Query principal con paginación
        query = """
            SELECT 
                isc.id AS confirmacion_id, 
                isc.solicitud_id, 
                isc.confirmador, 
                isc.observaciones, 
                isc.productos AS productos_confirmados, 
                isc.grupo AS grupo_confirmacion,
                isc.timestamp AS fecha_confirmacion,
                s.solicitante,
                s.ruc,
                s.fecha_visita,
                s.cantidad_packs AS cantidad_packs_solicitada,
                s.catalogos AS catalogos_solicitados,
                s.status AS status_solicitud_original,
                s.timestamp AS fecha_creacion_solicitud
            FROM inventario_solicitudes_conf isc
            JOIN inventario_solicitudes s ON isc.solicitud_id = s.id
            ORDER BY isc.timestamp DESC
            LIMIT %s OFFSET %s;
        """ 
        
        cursor.execute(query, (limit, offset))
        confirmaciones = cursor.fetchall()

        # Parsear JSON de productos confirmados
        for conf in confirmaciones:
            if conf.get('productos_confirmados'):
                try:
                    conf['productos_confirmados'] = json.loads(conf['productos_confirmados'])
                except json.JSONDecodeError:
                    logger.warning(f"obtener_historial_confirmaciones: No se pudo decodificar JSON para productos_confirmados en confirmacion_id {conf.get('confirmacion_id')}")
                    pass # Mantener como string si no se puede parsear

        return jsonify({
            'total_records': total_records,
            'page': page,
            'limit': limit,
            'total_pages': (total_records + limit - 1) // limit, # Calcular total de páginas
            'records': confirmaciones
        }), 200

    except Exception as e:
        logger.error(f"Error al obtener historial de confirmaciones: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception as e_cursor:
                logger.error(f"Error cerrando cursor en obtener_historial_confirmaciones: {e_cursor}")
        if conn and conn.is_connected():
            try:
                conn.close()
            except Exception as e_conn:
                logger.error(f"Error cerrando conexión en obtener_historial_confirmaciones: {e_conn}") 