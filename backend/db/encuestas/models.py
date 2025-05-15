"""
Modelos y esquemas de datos para el módulo de encuestas.
"""
from datetime import datetime, date

def envio_encuesta_schema(db_row):
    """
    Convierte un registro de la base de datos de envio_de_encuestas a un diccionario.
    Maneja la conversión de tipos de datos como datetime y date a ISO format strings.
    """
    if not db_row:
        return None
    
    # Crear una copia para no modificar el original si es un Row object de alguna librería
    data = dict(db_row)
    
    # Convertir campos de fecha/hora a string formato ISO
    for field in ['timestamp', 'fecha_califacion']:
        if data.get(field) and isinstance(data[field], datetime):
            data[field] = data[field].isoformat()
            
    if data.get('conformidad_timestamp') and isinstance(data['conformidad_timestamp'], date):
        data['conformidad_timestamp'] = data['conformidad_timestamp'].isoformat()
        
    return data 