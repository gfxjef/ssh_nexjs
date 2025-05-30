"""
Funciones para configurar e inicializar la base de datos para el módulo de bienestar.
"""
from datetime import datetime
import random
from ..mysql_connection import MySQLConnection
from .queries import (
    CREATE_CATEGORIES_TABLE, 
    CREATE_POSTS_TABLE, 
    INSERT_CATEGORY, 
    INSERT_POST, 
    CREATE_POSTULACIONES_TABLE
)

def setup_database():
    """
    Crea las tablas necesarias para el módulo de bienestar si no existen.
    
    Returns:
        bool: True si la configuración fue exitosa, False en caso contrario
    """
    try:
        # Crear tabla de categorías
        db_ops_setup = MySQLConnection()
        result_cat = db_ops_setup.execute_query(CREATE_CATEGORIES_TABLE, fetch=False)
        
        # Crear tabla de posts
        result_posts = db_ops_setup.execute_query(CREATE_POSTS_TABLE, fetch=False)
        
        if result_cat is None or result_posts is None:
            print("Error al crear las tablas de bienestar (categorías o posts)")
            return False
        
        # Crear tabla de postulaciones
        result_postulaciones = db_ops_setup.execute_query(CREATE_POSTULACIONES_TABLE, fetch=False)
        if result_postulaciones is None: # Asumiendo que devuelve None en error, igual que las otras
            print("Error al crear la tabla de postulaciones")
            return False
        
        # Ejecutar migraciones necesarias
        migrate_database(db_ops_setup)
        
        print("Tablas de bienestar (categorías, posts, postulaciones) creadas/verificadas correctamente")
        return True
        
    except Exception as e:
        print(f"Error al configurar la base de datos: {e}")
        return False

def migrate_database(db_ops):
    """
    Ejecuta migraciones necesarias para actualizar el esquema de la base de datos.
    
    Args:
        db_ops: Instancia de MySQLConnection
    """
    try:
        # Migración 1: Agregar campo email_sent a tabla posts_bienestar
        print("🔄 [MIGRATION] Verificando campo email_sent en posts_bienestar...")
        
        # Verificar si el campo ya existe
        check_column = """
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'posts_bienestar' 
        AND COLUMN_NAME = 'email_sent'
        """
        
        column_exists = db_ops.execute_query(check_column)
        
        if not column_exists or len(column_exists) == 0:
            # El campo no existe, agregarlo
            add_column = """
            ALTER TABLE posts_bienestar 
            ADD COLUMN email_sent BOOLEAN DEFAULT FALSE 
            AFTER imagen_url
            """
            
            result = db_ops.execute_query(add_column, fetch=False)
            if result is not None:
                print("✅ [MIGRATION] Campo email_sent agregado exitosamente a posts_bienestar")
            else:
                print("❌ [MIGRATION] Error al agregar campo email_sent")
        else:
            print("ℹ️ [MIGRATION] Campo email_sent ya existe en posts_bienestar")
            
        # Aquí se pueden agregar más migraciones en el futuro
        
    except Exception as e:
        print(f"❌ [MIGRATION] Error durante migración: {e}")
        # No fallar el setup por errores de migración
        pass

def seed_initial_data():
    """
    Inserta datos iniciales para categorías y posts.
    Solo debe usarse en un entorno de desarrollo o pruebas.
    
    Returns:
        bool: True si la carga de datos fue exitosa, False en caso contrario
    """
    try:
        # Verificar si ya existen datos
        db_ops_seed = MySQLConnection()
        categories_check = db_ops_seed.execute_query("SELECT COUNT(*) as count FROM categorias_bienestar")
        if categories_check and categories_check[0].get('count', 0) > 0:
            print("Ya existen categorías en la base de datos. No se cargarán datos iniciales.")
        else:
            # Datos iniciales para categorías
            categories_data = [
                ('Nutrición', '#4C9F70'),
                ('Ejercicio', '#E74C3C'),
                ('Salud Mental', '#3498DB'),
                ('Bienestar Laboral', '#F1C40F'),
                ('Descanso', '#9B59B6'),
                ('Postulaciones', '#007BFF') # Nueva categoría
            ]
            
            # Insertar categorías
            for cat_data in categories_data:
                db_ops_seed.execute_query(INSERT_CATEGORY, cat_data, fetch=False)
            
            print("Categorías iniciales insertadas correctamente")

        # Obtenemos las categorías para asignarlas a los posts
        categories = db_ops_seed.execute_query("SELECT id FROM categorias_bienestar")
        if not categories:
            print("No se encontraron categorías después del intento de inserción. No se pueden sembrar posts.")
            return False
            
        cat_ids = [cat['id'] for cat in categories]
        
        # Verificar si ya existen posts antes de intentar sembrar
        posts_exist = db_ops_seed.execute_query("SELECT COUNT(*) as count FROM posts_bienestar")
        if posts_exist and posts_exist[0].get('count', 0) > 0:
            print("Ya existen posts en la base de datos. No se cargarán posts iniciales.")
        else:
            # Datos iniciales para posts
            posts_data = [
                {
                    'titulo': 'Alimentación saludable en la oficina',
                    'extracto': 'Consejos prácticos para mantener una dieta equilibrada durante la jornada laboral.',
                    'contenido': '''
                    <h2>Alimentación saludable en la oficina</h2>
                    <p>Mantener una alimentación equilibrada durante la jornada laboral puede ser un desafío, especialmente cuando pasamos muchas horas sentados frente a un ordenador. Sin embargo, con una buena planificación y algunos hábitos saludables, es posible nutrir adecuadamente nuestro cuerpo incluso en el entorno de oficina.</p>
                    
                    <h3>Planifica tus comidas</h3>
                    <p>La clave para una alimentación saludable en el trabajo es la planificación. Dedica un tiempo durante el fin de semana para preparar tus comidas de la semana. Esto no solo te ayudará a comer mejor, sino que también ahorrarás dinero.</p>
                    
                    <h3>Opciones nutritivas para llevar</h3>
                    <ul>
                        <li>Ensaladas con proteínas (pollo, atún, huevo, legumbres)</li>
                        <li>Wraps o sándwiches integrales con verduras y proteínas</li>
                        <li>Tuppers con arroz integral o quinoa, verduras y proteínas</li>
                        <li>Frutos secos y frutas frescas para snacks</li>
                    </ul>
                    
                    <h3>Mantente hidratado</h3>
                    <p>Beber suficiente agua durante el día es fundamental. Mantén una botella de agua en tu escritorio y rellenala regularmente. Puedes añadir rodajas de frutas para darle sabor natural.</p>
                    
                    <h3>Evita las trampas de la oficina</h3>
                    <p>Es fácil caer en tentaciones como dulces en reuniones, máquinas expendedoras o pedidos de comida rápida. Prepárate mentalmente para estas situaciones teniendo alternativas saludables a mano.</p>
                    
                    <h3>Conclusión</h3>
                    <p>Una alimentación equilibrada durante la jornada laboral no solo beneficia tu salud, sino que también mejora tu concentración, productividad y estado de ánimo. ¡Tu cuerpo y tu mente te lo agradecerán!</p>
                    ''',
                    'autor': 'Dra. María López',
                    'categoriaId': cat_ids[0],  # Nutrición
                    'estado': 'publicado',
                    'destacado': True,
                    'vistas': random.randint(100, 500)
                },
                {
                    'titulo': 'Ejercicios de 5 minutos para hacer en tu escritorio',
                    'extracto': 'Pequeñas rutinas que pueden marcar una gran diferencia en tu bienestar físico durante la jornada laboral.',
                    'contenido': '''
                    <h2>Ejercicios de 5 minutos para hacer en tu escritorio</h2>
                    <p>Pasar muchas horas sentado frente al ordenador puede tener consecuencias negativas para nuestra salud. Sin embargo, con solo 5 minutos puedes realizar ejercicios que ayudarán a reducir la tensión muscular y mejorar la circulación.</p>
                    
                    <h3>Estiramiento de cuello</h3>
                    <p>Inclina suavemente la cabeza hacia un lado, acercando la oreja al hombro. Mantén 15 segundos y cambia de lado. Repite 3 veces por cada lado.</p>
                    
                    <h3>Rotación de hombros</h3>
                    <p>Gira los hombros hacia adelante 10 veces y luego hacia atrás otras 10 veces. Esto ayuda a liberar la tensión acumulada en la zona superior de la espalda.</p>
                    
                    <h3>Estiramiento de muñecas</h3>
                    <p>Extiende un brazo frente a ti con la palma hacia arriba. Con la otra mano, tira suavemente de los dedos hacia abajo. Mantén 15 segundos y cambia de mano.</p>
                    
                    <h3>Sentadillas de escritorio</h3>
                    <p>Levántate de la silla, separa los pies a la anchura de los hombros y baja como si fueras a sentarte, sin llegar a tocar la silla. Mantén 3 segundos y sube. Repite 10 veces.</p>
                    
                    <h3>Elongación de espalda</h3>
                    <p>Sentado en el borde de la silla, estira los brazos hacia adelante y baja el torso entre las piernas, dejando caer la cabeza. Mantén 15 segundos y vuelve a la posición inicial. Repite 3 veces.</p>
                    
                    <h3>Beneficios a largo plazo</h3>
                    <p>Realizar estos ejercicios varias veces al día puede ayudar a prevenir lesiones por uso repetitivo, mejorar la postura y reducir el estrés. Recuerda que el movimiento regular es clave para contrarrestar los efectos del sedentarismo.</p>
                    ''',
                    'autor': 'Carlos Ramírez',
                    'categoriaId': cat_ids[1],  # Ejercicio
                    'estado': 'publicado',
                    'destacado': True,
                    'vistas': random.randint(100, 500)
                },
                {
                    'titulo': 'Técnicas de respiración para reducir el estrés laboral',
                    'extracto': 'Aprende a utilizar la respiración consciente como herramienta para gestionar situaciones de tensión en el trabajo.',
                    'contenido': '''
                    <h2>Técnicas de respiración para reducir el estrés laboral</h2>
                    <p>El estrés laboral es una realidad para muchas personas, pero existen herramientas sencillas y eficaces para gestionarlo, como las técnicas de respiración consciente. A continuación, te compartimos algunas que puedes practicar incluso en tu lugar de trabajo.</p>
                    
                    <h3>Respiración 4-7-8</h3>
                    <p>Esta técnica es excelente para momentos de alta tensión:</p>
                    <ol>
                        <li>Inhala por la nariz durante 4 segundos</li>
                        <li>Mantén el aire en tus pulmones durante 7 segundos</li>
                        <li>Exhala lentamente por la boca durante 8 segundos</li>
                    </ol>
                    <p>Repite el ciclo 4 veces. Esta respiración activa el sistema nervioso parasimpático, responsable de la relajación.</p>
                    
                    <h3>Respiración abdominal</h3>
                    <p>Coloca una mano sobre tu abdomen y otra sobre tu pecho. Inhala profundamente por la nariz, asegurándote de que se eleve la mano del abdomen, no la del pecho. Exhala lentamente por la boca. Repite durante 2-3 minutos.</p>
                    
                    <h3>Respiración alternada por fosas nasales</h3>
                    <p>Esta técnica viene del yoga y es excelente para equilibrar el sistema nervioso:</p>
                    <ol>
                        <li>Cierra la fosa nasal derecha con el pulgar y inhala por la izquierda</li>
                        <li>Cierra ambas fosas y retén el aire brevemente</li>
                        <li>Libera la fosa derecha y exhala por ella</li>
                        <li>Inhala por la fosa derecha</li>
                        <li>Cierra ambas y retén el aire</li>
                        <li>Libera la izquierda y exhala por ella</li>
                    </ol>
                    <p>Repite este ciclo durante 5 minutos.</p>
                    
                    <h3>Micro-pausas de respiración</h3>
                    <p>Durante el día, programa recordatorios para hacer pausas de 30 segundos. En cada pausa, simplemente cierra los ojos y respira profundamente, siendo consciente de cada inhalación y exhalación.</p>
                    
                    <h3>Beneficios a largo plazo</h3>
                    <p>La práctica regular de estas técnicas no solo reduce el estrés inmediato, sino que también mejora la concentración, fortalece el sistema inmunológico y contribuye a un mejor equilibrio emocional. Incorporar la respiración consciente como hábito puede transformar tu experiencia laboral.</p>
                    ''',
                    'autor': 'Psic. Laura Martínez',
                    'categoriaId': cat_ids[2],  # Salud Mental
                    'estado': 'publicado',
                    'destacado': False,
                    'vistas': random.randint(100, 500)
                },
                {
                    'titulo': 'Ergonomía: Cómo configurar tu espacio de trabajo',
                    'extracto': 'Recomendaciones para adaptar tu entorno laboral y prevenir lesiones por malas posturas.',
                    'contenido': '''
                    <h2>Ergonomía: Cómo configurar tu espacio de trabajo</h2>
                    <p>Un espacio de trabajo correctamente configurado es fundamental para prevenir lesiones y mejorar la productividad. La ergonomía busca adaptar el entorno a las necesidades del trabajador, no al revés.</p>
                    
                    <h3>Altura correcta de la pantalla</h3>
                    <p>El borde superior de tu monitor debe estar a la altura de tus ojos o ligeramente por debajo. Esto evita la tensión en el cuello. Si usas un portátil, considera un soporte para elevarlo y un teclado externo.</p>
                    
                    <h3>Posición de la silla</h3>
                    <ul>
                        <li>Ajusta la altura para que tus pies descansen planos en el suelo</li>
                        <li>Tus rodillas deben formar un ángulo de 90 grados</li>
                        <li>El respaldo debe soportar la curva natural de tu espalda</li>
                        <li>Los brazos de la silla deben permitir que tus hombros estén relajados</li>
                    </ul>
                    
                    <h3>Disposición del teclado y ratón</h3>
                    <p>El teclado debe estar colocado de manera que tus codos formen un ángulo de 90 grados. El ratón debe estar junto al teclado y a la misma altura, permitiendo que tu muñeca permanezca recta.</p>
                    
                    <h3>Iluminación adecuada</h3>
                    <p>Evita los reflejos en la pantalla ajustando la posición del monitor respecto a ventanas y luces. Considera usar luz natural siempre que sea posible, complementada con iluminación artificial adecuada.</p>
                    
                    <h3>Organización del escritorio</h3>
                    <p>Mantén los elementos de uso frecuente al alcance de la mano. Organiza tu espacio para minimizar movimientos repetitivos o incómodos.</p>
                    
                    <h3>Descansos regulares</h3>
                    <p>Incluso con la mejor configuración ergonómica, es importante levantarse y moverse cada 30-45 minutos. Esto mejora la circulación y reduce la fatiga muscular.</p>
                    
                    <h3>Conclusión</h3>
                    <p>Invertir tiempo en configurar correctamente tu espacio de trabajo puede prevenir problemas de salud a largo plazo y mejorar significativamente tu bienestar diario. Recuerda que pequeños ajustes pueden marcar una gran diferencia.</p>
                    ''',
                    'autor': 'Ing. Pedro Sánchez',
                    'categoriaId': cat_ids[3],  # Bienestar Laboral
                    'estado': 'publicado',
                    'destacado': False,
                    'vistas': random.randint(100, 500)
                },
                {
                    'titulo': 'La importancia del sueño reparador para el rendimiento profesional',
                    'extracto': 'Descubre cómo la calidad del descanso nocturno influye directamente en tu productividad y bienestar laboral.',
                    'contenido': '''
                    <h2>La importancia del sueño reparador para el rendimiento profesional</h2>
                    <p>El sueño es mucho más que un simple descanso; es un proceso activo fundamental para la recuperación física y mental. Su influencia en el rendimiento profesional es mucho mayor de lo que solemos reconocer.</p>
                    
                    <h3>El ciclo del sueño y la productividad</h3>
                    <p>Durante el sueño, especialmente en las fases de sueño profundo y REM, el cerebro consolida memorias, procesa información y repara el desgaste diario. Un ciclo de sueño completo permite que al día siguiente podamos:</p>
                    <ul>
                        <li>Tomar decisiones más acertadas</li>
                        <li>Resolver problemas de forma creativa</li>
                        <li>Mantener mejor la concentración</li>
                        <li>Regular adecuadamente las emociones</li>
                    </ul>
                    
                    <h3>Consecuencias de la falta de sueño</h3>
                    <p>Dormir menos de 7 horas regularmente puede provocar:</p>
                    <ul>
                        <li>Reducción del tiempo de reacción (comparable a la intoxicación alcohólica)</li>
                        <li>Disminución de la capacidad para analizar información</li>
                        <li>Mayor propensión a cometer errores</li>
                        <li>Irritabilidad y deterioro de las relaciones laborales</li>
                        <li>Compromiso del sistema inmunológico</li>
                    </ul>
                    
                    <h3>Estrategias para mejorar la calidad del sueño</h3>
                    <h4>Antes de acostarte:</h4>
                    <ul>
                        <li>Establece una rutina regular para acostarte y levantarte</li>
                        <li>Evita pantallas al menos 1 hora antes de dormir (o usa filtros de luz azul)</li>
                        <li>Crea un ambiente propicio: temperatura fresca, oscuridad y silencio</li>
                        <li>Limita la cafeína después del mediodía</li>
                    </ul>
                    
                    <h4>Durante el día:</h4>
                    <ul>
                        <li>Exponte a luz natural por la mañana</li>
                        <li>Realiza actividad física regular (pero no justo antes de dormir)</li>
                        <li>Considera técnicas de relajación como meditación o respiración profunda</li>
                        <li>Si es posible, haz una breve siesta (20 minutos máximo) después de comer</li>
                    </ul>
                    
                    <h3>El valor de priorizar el sueño</h3>
                    <p>En una cultura que a menudo glorifica el trabajo excesivo, priorizar el sueño puede parecer improductivo. Sin embargo, los estudios demuestran lo contrario: las personas bien descansadas son más eficientes, creativas y efectivas. Dormir adecuadamente no es un lujo, sino una inversión en tu rendimiento profesional y bienestar general.</p>
                    ''',
                    'autor': 'Dr. Fernando García',
                    'categoriaId': cat_ids[4],  # Descanso
                    'estado': 'publicado',
                    'destacado': False,
                    'vistas': random.randint(100, 500)
                },
                {
                    'titulo': 'Mindfulness en el trabajo: técnicas para estar presente',
                    'extracto': 'Aprende a aplicar la atención plena para reducir el estrés y mejorar tu enfoque durante la jornada laboral.',
                    'contenido': '''
                    <h2>Mindfulness en el trabajo: técnicas para estar presente</h2>
                    <p>El mindfulness o atención plena es una práctica que nos permite conectar con el momento presente, observando nuestros pensamientos y sensaciones sin juzgarlos. Aplicado al entorno laboral, puede transformar nuestra experiencia diaria y mejorar significativamente nuestro bienestar.</p>
                    
                    <h3>¿Qué es el mindfulness?</h3>
                    <p>El mindfulness consiste en prestar atención deliberadamente al momento presente, con una actitud de apertura y curiosidad. No se trata de vaciar la mente, sino de observar lo que sucede en ella sin dejarnos arrastrar por cada pensamiento.</p>
                    
                    <h3>Beneficios en el entorno laboral</h3>
                    <ul>
                        <li>Reducción del estrés y la ansiedad</li>
                        <li>Mayor capacidad de concentración</li>
                        <li>Mejora en la toma de decisiones</li>
                        <li>Aumento de la creatividad</li>
                        <li>Mayor resiliencia ante situaciones difíciles</li>
                        <li>Mejora en las relaciones interpersonales</li>
                    </ul>
                    
                    <h3>Ejercicios de mindfulness para la oficina</h3>
                    
                    <h4>1. Respiración consciente (1 minuto)</h4>
                    <p>Siéntate cómodamente con la espalda recta. Cierra los ojos si te resulta más fácil. Observa tu respiración natural sin intentar cambiarla. Nota cómo el aire entra y sale de tu cuerpo. Si tu mente divaga, simplemente vuelve a la respiración sin juzgarte.</p>
                    
                    <h4>2. Escaneo corporal rápido (3 minutos)</h4>
                    <p>Presta atención secuencialmente a diferentes partes de tu cuerpo, notando sensaciones de tensión, relajación, temperatura o peso. Comienza por los pies y sube gradualmente hasta la cabeza.</p>
                    
                    <h4>3. Comer con atención plena</h4>
                    <p>Durante tu almuerzo, desconecta de dispositivos y dedica unos minutos a comer conscientemente. Observa los colores, olores, texturas y sabores de tu comida. Mastica lentamente y percibe todas las sensaciones.</p>
                    
                    <h4>4. Transiciones conscientes</h4>
                    <p>Utiliza los momentos de transición (entrar o salir de reuniones, cambiar de tarea) para hacer una pausa breve. Respira profundamente y toma consciencia del momento presente antes de continuar.</p>
                    
                    <h4>5. Escucha atenta</h4>
                    <p>Durante conversaciones con colegas, practica la escucha plena. Enfócate completamente en lo que la otra persona está diciendo, sin preparar tu respuesta mientras habla.</p>
                    
                    <h3>Integrando el mindfulness en tu rutina diaria</h3>
                    <p>Lo ideal es comenzar con períodos cortos (1-5 minutos) varias veces al día. Puedes programar recordatorios o asociar la práctica a actividades habituales como encender el ordenador, antes de comer o al finalizar una tarea.</p>
                    
                    <p>Recuerda que el mindfulness es una habilidad que se desarrolla con la práctica. Los beneficios pueden empezar a notarse en pocas semanas de práctica regular, contribuyendo a un entorno laboral más equilibrado y satisfactorio.</p>
                    ''',
                    'autor': 'Psic. Ana Gutiérrez',
                    'categoriaId': cat_ids[2],  # Salud Mental
                    'estado': 'borrador',
                    'destacado': False,
                    'vistas': 0
                }
            ]
            
            # Insertar posts
            for post_data in posts_data:
                db_ops_seed.execute_query(
                    INSERT_POST,
                    (
                        post_data['titulo'],
                        post_data['extracto'],
                        post_data['contenido'],
                        post_data['autor'],
                        datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        post_data['estado'],
                        post_data['destacado'],
                        post_data['categoriaId'],
                        ''  # imagen_url
                    ),
                    fetch=False
                )
            
            print("Posts iniciales insertados correctamente")
        return True
        
    except Exception as e:
        print(f"Error al cargar datos iniciales: {e}")
        return False 