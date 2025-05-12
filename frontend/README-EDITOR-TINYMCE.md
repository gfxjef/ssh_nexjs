# Sistema de Edición WYSIWYG con TinyMCE

## Descripción General

Se ha implementado un sistema completo de edición de contenido enriquecido WYSIWYG (What You See Is What You Get) para los posts del sistema, basado en TinyMCE. El sistema incluye:

1. **Editor visual completo** con las siguientes capacidades:
   - Formateo de texto (negrita, cursiva, subrayado, tachado)
   - Encabezados y estilos de texto
   - Listas ordenadas y no ordenadas
   - Alineación de texto
   - Colores de texto
   - Inserción de enlaces
   - Inserción de imágenes (con carga automática al servidor)
   - Tablas y contenido multimedia
   - Vista previa y código HTML

2. **Sistema de carga de imágenes** con las siguientes características:
   - Almacenamiento de imágenes en el servidor
   - Conversión automática de imágenes pegadas al editor
   - Gestión de imágenes mediante el API de subida

## Estructura de Archivos

La implementación incluye los siguientes componentes:

- **TinyMCEEditor.tsx**: Componente principal que implementa el editor WYSIWYG con TinyMCE
- **API endpoints**:
  - `/api/images/upload`: Endpoint para subir imágenes
  - `/api/images/delete`: Endpoint para eliminar imágenes

## Cómo Utilizar el Editor

1. **En formularios de creación/edición de posts**:
   ```tsx
   import TinyMCEEditor from '../components/wysiwyg/TinyMCEEditor';
   
   // Dentro del componente:
   const [contenido, setContenido] = useState('');
   
   // Función para manejar cambios en el editor
   const handleEditorChange = (value: string) => {
     setContenido(value);
   };
   
   // En el JSX:
   <TinyMCEEditor 
     value={contenido}
     onChange={handleEditorChange}
     placeholder="Escribe el contenido completo del post"
   />
   ```

## Configuración Avanzada

El editor TinyMCE puede personalizarse para incluir funcionalidades adicionales modificando el objeto `init` en `TinyMCEEditor.tsx`:

```tsx
init={{
  height: 350,
  menubar: false,
  plugins: [
    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
    'insertdatetime', 'media', 'table', 'preview', 'help', 'wordcount'
  ],
  toolbar: 'undo redo | blocks | ' +
    'bold italic forecolor | alignleft aligncenter ' +
    'alignright alignjustify | bullist numlist outdent indent | ' +
    'removeformat | image link | help',
  // ... más opciones de configuración
}}
```

## API Key de TinyMCE

El editor utiliza una API key registrada de TinyMCE. Si necesitas actualizar esta clave:

1. Regístrate en [TinyMCE Cloud](https://www.tiny.cloud/)
2. Obtén una API key gratuita
3. Actualiza la propiedad `apiKey` en el componente `TinyMCEEditor.tsx`

## Notas Adicionales

- Las imágenes se guardan en el directorio `public/uploads`
- El límite de tamaño por imagen es configurable en el API de carga
- El editor está configurado en español
- Se recomienda usar una conexión a Internet activa para cargar los recursos de TinyMCE
- La versión gratuita de TinyMCE es suficiente para la mayoría de casos de uso 