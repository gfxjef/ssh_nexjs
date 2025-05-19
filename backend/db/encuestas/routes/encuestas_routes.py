"""
Rutas de la API para el módulo de gestión de envío de encuestas.
"""
from flask import Blueprint, request, jsonify
from ...mysql_connection import MySQLConnection # Para ejecutar consultas
from ..queries import (
    GET_ALL_ENVIOS_ENCUESTAS,
    GET_ENVIO_ENCUESTA_BY_ID,
    INSERT_ENVIO_ENCUESTA,
    UPDATE_ENVIO_ENCUESTA_BY_ID,
    DELETE_ENVIO_ENCUESTA_BY_ID
)
from ..models import envio_encuesta_schema

encuestas_bp = Blueprint(
    'encuestas_bp',
    __name__,
    # url_prefix='/api/encuestas' # El prefijo se definirá al registrar el blueprint en app.py
)

@encuestas_bp.route('/envios', methods=['GET'])
def get_envios_encuestas():
    """Obtiene todos los envíos de encuestas."""
    db_ops = MySQLConnection()
    try:
        results = db_ops.execute_query(GET_ALL_ENVIOS_ENCUESTAS)
        if results is None:
            return jsonify({'success': False, 'error': 'Error al obtener los envíos de encuestas'}), 500
        
        envios_formateados = [envio_encuesta_schema(row) for row in results]
        return jsonify({'success': True, 'data': envios_formateados})
    except Exception as e:
        print(f"Error en get_envios_encuestas: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@encuestas_bp.route('/envios/<int:idcalificacion>', methods=['GET'])
def get_envio_encuesta(idcalificacion):
    """Obtiene un envío de encuesta específico por su ID."""
    db_ops = MySQLConnection()
    try:
        result = db_ops.execute_query(GET_ENVIO_ENCUESTA_BY_ID, (idcalificacion,))
        if result is None:
             return jsonify({'success': False, 'error': f'Error obteniendo envío de encuesta o envío con ID {idcalificacion} no encontrado'}), 404
        if not result:
            return jsonify({'success': False, 'error': f'Envío de encuesta con ID {idcalificacion} no encontrado'}), 404
        
        return jsonify({'success': True, 'data': envio_encuesta_schema(result[0])})
    except Exception as e:
        print(f"Error en get_envio_encuesta (ID: {idcalificacion}): {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@encuestas_bp.route('/envios', methods=['POST'])
def create_envio_encuesta():
    """Crea un nuevo envío de encuesta."""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No se proporcionaron datos'}), 400

    # Extraer todos los campos necesarios. Validar más a fondo si es necesario.
    # Los campos que pueden ser NULL deben manejarse adecuadamente (ej. con data.get(campo, None))
    required_fields = ['asesor', 'nombres', 'ruc', 'correo', 'segmento', 'documento', 'tipo', 'calificacion', 'grupo', 'fecha_califacion', 'conformidad']
    for field in required_fields:
        if field not in data or data[field] is None: # Asegurar que no sea None si es requerido
            return jsonify({'success': False, 'error': f'Campo requerido ausente o nulo: {field}'}), 400
    
    # Validación para 'calificacion'
    calificacion_val = data.get('calificacion')
    try:
        calificacion_num = int(calificacion_val)
        if not (1 <= calificacion_num <= 10):
            return jsonify({'success': False, 'error': 'La calificación debe ser un número entero entre 1 y 10'}), 400
    except (ValueError, TypeError):
        return jsonify({'success': False, 'error': 'La calificación debe ser un número entero válido'}), 400

    params = (
        data.get('asesor'), data.get('nombres'), data.get('ruc'), data.get('correo'), 
        data.get('segmento'), data.get('documento'), data.get('tipo'), calificacion_num, # Usar calificacion_num validada 
        data.get('observaciones'), data.get('grupo'), data.get('fecha_califacion'), 
        data.get('conformidad'), data.get('conformidad_obs'), data.get('conformidad_timestamp')
    )
    
    db_ops = MySQLConnection()
    try:
        result = db_ops.execute_query(INSERT_ENVIO_ENCUESTA, params, fetch=False)
        if result and result.get('affected_rows', 0) > 0:
            # Idealmente, recuperar el ID del nuevo registro y retornarlo o el objeto completo
            # Para simplificar, solo confirmamos la creación.
            # Si tienes LAST_INSERT_ID() disponible y quieres el objeto: 
            # last_id_result = db_ops.execute_query("SELECT LAST_INSERT_ID() as id;")
            # new_id = last_id_result[0]['id']
            # new_envio = db_ops.execute_query(GET_ENVIO_ENCUESTA_BY_ID, (new_id,))
            # return jsonify({'success': True, 'data': envio_encuesta_schema(new_envio[0])}), 201
            return jsonify({'success': True, 'message': 'Envío de encuesta creado exitosamente'}), 201
        else:
            return jsonify({'success': False, 'error': 'No se pudo crear el envío de encuesta'}), 500
    except Exception as e:
        print(f"Error en create_envio_encuesta: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@encuestas_bp.route('/envios/<int:idcalificacion>', methods=['PUT'])
def update_envio_encuesta(idcalificacion):
    """Actualiza un envío de encuesta existente."""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No se proporcionaron datos'}), 400

    db_ops = MySQLConnection()
    try:
        current_envio_rows = db_ops.execute_query(GET_ENVIO_ENCUESTA_BY_ID, (idcalificacion,))
        if not current_envio_rows:
            return jsonify({'success': False, 'error': f'Envío de encuesta con ID {idcalificacion} no encontrado'}), 404
        
        current_envio = current_envio_rows[0] # Acceder al primer (y único) diccionario de la fila

        # Validación para 'calificacion' si se está actualizando
        calificacion_final = current_envio.get('calificacion') # Valor por defecto es el actual
        if 'calificacion' in data and data['calificacion'] is not None:
            try:
                calificacion_num_update = int(data['calificacion'])
                if not (1 <= calificacion_num_update <= 10):
                    return jsonify({'success': False, 'error': 'La calificación debe ser un número entero entre 1 y 10'}), 400
                calificacion_final = calificacion_num_update
            except (ValueError, TypeError):
                return jsonify({'success': False, 'error': 'La calificación debe ser un número entero válido'}), 400
        elif 'calificacion' in data and data['calificacion'] is None: # Si se envía explícitamente null
             # Aquí se podría decidir si permitir poner calificacion a NULL o si mantenerla con error
             # Por ahora, si es un campo que no puede ser NULL en BD (ahora es INT, puede ser NULL), esto causaría error en BD si no se maneja.
             # Si se quiere permitir NULL, calificacion_final = None. Sino, error o ignorar.
             # Asumiendo que INT puede ser NULL en la BD según la definición de queries.py (solo `calificacion INT`)
             calificacion_final = None

        # Preparar el timestamp de conformidad
        conformidad_val = data.get('conformidad', current_envio.get('conformidad'))
        conformidad_obs_val = data.get('conformidad_obs', current_envio.get('conformidad_obs'))
        
        # Si 'conformidad' está en data, es una actualización explícita de conformidad
        if 'conformidad' in data:
            if conformidad_val and str(conformidad_val).strip() != '' and str(conformidad_val) != 'Pendiente':
                from datetime import datetime
                conformidad_timestamp_val = datetime.now()
            else: # Conformidad es Pendiente, vacía o null
                conformidad_timestamp_val = None
        else: # No se está actualizando conformidad explícitamente, mantener el timestamp existente
            conformidad_timestamp_val = current_envio.get('conformidad_timestamp')


        params = (
            data.get('asesor', current_envio.get('asesor')),
            data.get('nombres', current_envio.get('nombres')),
            data.get('ruc', current_envio.get('ruc')),
            data.get('correo', current_envio.get('correo')),
            data.get('segmento', current_envio.get('segmento')),
            data.get('documento', current_envio.get('documento')),
            data.get('tipo', current_envio.get('tipo')),
            calificacion_final, # Usar calificacion_final validada o existente
            data.get('observaciones', current_envio.get('observaciones')),
            data.get('grupo', current_envio.get('grupo')),
            data.get('fecha_califacion', current_envio.get('fecha_califacion')),
            conformidad_val,
            conformidad_obs_val,
            conformidad_timestamp_val,
            idcalificacion
        )
        
        result = db_ops.execute_query(UPDATE_ENVIO_ENCUESTA_BY_ID, params, fetch=False)
        if result and result.get('affected_rows', 0) > 0:
            updated_envio = db_ops.execute_query(GET_ENVIO_ENCUESTA_BY_ID, (idcalificacion,))
            return jsonify({'success': True, 'data': envio_encuesta_schema(updated_envio[0])})
        elif result and result.get('affected_rows', 0) == 0:
            return jsonify({'success': True, 'message': 'No se realizaron cambios (datos iguales o envío no encontrado).'}), 200
        else:
            return jsonify({'success': False, 'error': 'No se pudo actualizar el envío de encuesta'}), 500
    except Exception as e:
        print(f"Error en update_envio_encuesta (ID: {idcalificacion}): {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@encuestas_bp.route('/envios/<int:idcalificacion>', methods=['DELETE'])
def delete_envio_encuesta(idcalificacion):
    """Elimina un envío de encuesta."""
    db_ops = MySQLConnection()
    try:
        # Opcional: Verificar si existe antes de intentar eliminar
        # current_envio = db_ops.execute_query(GET_ENVIO_ENCUESTA_BY_ID, (idcalificacion,))
        # if not current_envio:
        #     return jsonify({'success': False, 'error': f'Envío de encuesta con ID {idcalificacion} no encontrado'}), 404

        result = db_ops.execute_query(DELETE_ENVIO_ENCUESTA_BY_ID, (idcalificacion,), fetch=False)
        if result and result.get('affected_rows', 0) > 0:
            return jsonify({'success': True, 'message': f'Envío de encuesta con ID {idcalificacion} eliminado exitosamente'}), 200
        else:
            return jsonify({'success': False, 'error': f'No se pudo eliminar el envío de encuesta con ID {idcalificacion} o no fue encontrado'}), 404 # O 500 si fue error
    except Exception as e:
        print(f"Error en delete_envio_encuesta (ID: {idcalificacion}): {e}")
        return jsonify({'success': False, 'error': str(e)}), 500 