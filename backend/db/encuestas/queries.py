"""
Consultas SQL para el módulo de envío de encuestas.
"""

CREATE_ENVIOS_ENCUESTAS_TABLE = """
CREATE TABLE IF NOT EXISTS envio_de_encuestas (
    idcalificacion INT AUTO_INCREMENT PRIMARY KEY,
    asesor VARCHAR(255),
    nombres VARCHAR(255),
    ruc VARCHAR(50),
    correo VARCHAR(255),
    segmento VARCHAR(255),
    documento VARCHAR(255),
    tipo VARCHAR(50),
    calificacion VARCHAR(50),
    observaciones TEXT,
    `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
    grupo VARCHAR(255),
    fecha_califacion DATETIME,
    conformidad VARCHAR(255),
    conformidad_obs TEXT,
    conformidad_timestamp DATE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

GET_ALL_ENVIOS_ENCUESTAS = "SELECT * FROM envio_de_encuestas ORDER BY `timestamp` DESC;"

GET_ENVIO_ENCUESTA_BY_ID = "SELECT * FROM envio_de_encuestas WHERE idcalificacion = %s;"

INSERT_ENVIO_ENCUESTA = """
INSERT INTO envio_de_encuestas (
    asesor, nombres, ruc, correo, segmento, documento, tipo, 
    calificacion, observaciones, grupo, fecha_califacion,
    conformidad, conformidad_obs, conformidad_timestamp
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
"""

UPDATE_ENVIO_ENCUESTA_BY_ID = """
UPDATE envio_de_encuestas SET
    asesor = %s,
    nombres = %s,
    ruc = %s,
    correo = %s,
    segmento = %s,
    documento = %s,
    tipo = %s,
    calificacion = %s,
    observaciones = %s,
    grupo = %s,
    fecha_califacion = %s,
    conformidad = %s,
    conformidad_obs = %s,
    conformidad_timestamp = %s
WHERE idcalificacion = %s;
"""

DELETE_ENVIO_ENCUESTA_BY_ID = "DELETE FROM envio_de_encuestas WHERE idcalificacion = %s;" 