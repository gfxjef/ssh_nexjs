'use client';

import { useRef, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';

interface TinyMCEEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Componente de editor TinyMCE con soporte para carga de imágenes
 * Implementado con enfoque completamente no controlado para solucionar problemas de cursor
 */
export default function TinyMCEEditor({ value, onChange, placeholder = 'Escribe aquí...' }: TinyMCEEditorProps) {
  const editorRef = useRef<any>(null);
  const initialValueSet = useRef(false);
  const lastKnownValueRef = useRef(value);
  const initialValueRef = useRef(value);
  const editorFocused = useRef(false); // Referencia para rastrear si el editor tiene el foco
  
  // Solo capturamos el valor inicial una vez
  useEffect(() => {
    if (!initialValueSet.current) {
      console.log("TinyMCEEditor valor inicial capturado:", value ? (value.substring(0, 50) + "...") : "empty");
      initialValueRef.current = value;
      initialValueSet.current = true;
    }
  }, [value]);

  // Función para subir imágenes
  const handleImageUpload = async (blobInfo: any): Promise<string> => {
    console.log('[TinyMCE] handleImageUpload triggered. BlobInfo:', blobInfo);
    try {
      const formData = new FormData();
      formData.append('image', blobInfo.blob(), blobInfo.filename());
      console.log('[TinyMCE] FormData preparado:', formData.get('image'));
      
      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });
      
      console.log('[TinyMCE] Respuesta cruda del servidor:', response);

      if (!response.ok) {
        let errorText = response.statusText;
        try {
            const errorJson = await response.json();
            console.error('[TinyMCE] Error JSON del servidor:', errorJson);
            errorText = errorJson.error || errorText;
        } catch (e) {
            console.error('[TinyMCE] No se pudo parsear el error JSON:', e);
        }
        throw new Error(errorText);
      }
      
      const data = await response.json();
      console.log('[TinyMCE] Datos JSON de la respuesta:', data);
      if (!data.url) {
        console.error('[TinyMCE] La respuesta del servidor no contiene una URL.');
        throw new Error('La respuesta del servidor no contiene una URL.');
      }
      return data.url; // Retorna la URL de la imagen subida
    } catch (error) {
      console.error('[TinyMCE] Error detallado en handleImageUpload:', error);
      // Notificar al usuario aquí si es posible, o lanzar para que TinyMCE lo maneje
      // TinyMCE por defecto muestra un error si la promesa es rechazada.
      throw error;
    }
  };

  // Función para manejar la inicialización del editor
  const handleEditorInit = (evt: any, editor: any) => {
    editorRef.current = editor;
    
    // Establecemos el valor inicial solo una vez cuando el editor está listo
    const initialContent = initialValueRef.current || '';
    editor.setContent(initialContent);
    lastKnownValueRef.current = initialContent;
    console.log("Inicializando editor con contenido:", initialContent.substring(0, Math.min(50, initialContent.length)) + (initialContent.length > 50 ? "..." : ""));
    
    // Detectar cuando el editor gana o pierde el foco
    editor.on('focus', () => {
      editorFocused.current = true;
      console.log("Editor ha ganado el foco");
    });
    
    editor.on('blur', () => {
      editorFocused.current = false;
      console.log("Editor ha perdido el foco");
    });
    
    // Añadimos un manejador de eventos para detectar cambios en el contenido
    editor.on('Change KeyUp Undo Redo', () => {
      const newContent = editor.getContent();
      if (newContent !== lastKnownValueRef.current) {
        lastKnownValueRef.current = newContent;
        onChange(newContent);
      }
    });
  };

  return (
    <div className="tinymce-editor-container">
      <Editor
        apiKey="6zroariyyi687yb34ckq1xmh0udodac6ri1yv7r2sjw5g6kf"
        onInit={handleEditorInit}
        // Añadimos initialValue de vuelta para la carga inicial correcta
        initialValue={value}
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
          content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
          placeholder: placeholder,
          images_upload_handler: handleImageUpload,
          paste_data_images: true,
          language: 'es',
          skin: 'oxide',
          branding: false,
          // Opciones para mejorar la experiencia de edición
          inline: false,
          entity_encoding: 'raw',
          convert_urls: false,
          relative_urls: false,
          browser_spellcheck: true,
          // Eliminamos el cache_suffix para evitar reinicios
          setup: (editor: any) => {
            editor.on('BeforeSetContent', (e: any) => {
              const currentContent = editor.getContent();
          
              // 1. Permitir siempre la carga inicial del editor
              if (!initialValueSet.current) {
                console.log('[TinyMCE] BeforeSetContent: Permitiendo carga inicial.');
                // initialValueSet.current = true; // Esto se maneja en el useEffect ahora
                // editor.setContent(e.content || ''); // No establecer aquí, ya se hace con initialValue o onInit
                // lastKnownValueRef.current = e.content || '';
                return; // Permitir
              }
          
              // 2. Si el editor tiene el foco (el usuario está escribiendo o interactuando directamente)
              if (editorFocused.current) {
                // Heurística para inserción de imagen: si el contenido nuevo contiene una etiqueta de imagen 
                // que no estaba en el contenido actual, y el formato es html.
                if (e.format === 'html' && e.content !== currentContent &&
                    /<img[^>]+src="[^"]+"[^>]*>/.test(e.content) && 
                    !/<img[^>]+src="[^"]+"[^>]*>/.test(currentContent)) {
                  console.log('[TinyMCE] BeforeSetContent: Editor enfocado, PERO permitiendo inserción de NUEVA imagen.');
                  // No hacemos preventDefault aquí, permitimos que la imagen se inserte.
                  // Es crucial que `lastKnownValueRef` se actualice después para que el siguiente `onChange` no lo duplique.
                  // Sin embargo, el `onChange` se disparará por el `setContent` que permitimos.
                } else {
                  // Para cualquier otra modificación mientras el editor está enfocado (escritura, etc.)
                  // Prevenir el comportamiento por defecto de setContent para evitar el salto del cursor.
                  // Nuestro manejador on('Change KeyUp Undo Redo') se encargará de llamar a onChange.
                  console.log('[TinyMCE] BeforeSetContent: Editor enfocado, PREVINIENDO setContent para escritura normal.');
                  e.preventDefault();
                  return false;
                }
              } else {
                // 3. Si el editor NO tiene el foco (ej. setContent programático que no sea la carga inicial)
                // Podríamos permitirlo, o ser más específicos si es necesario.
                // Por ahora, si no está enfocado, lo permitimos, asumiendo que es una actualización legítima.
                console.log('[TinyMCE] BeforeSetContent: Editor NO enfocado, permitiendo setContent.');
              }
            });
          }
        }}
      />
      <style jsx global>{`
        .tinymce-editor-container .tox-tinymce {
          border-radius: 0.5rem;
          border-color: #e2e8f0;
        }
        .tinymce-editor-container .tox-statusbar {
          border-top: 1px solid #e2e8f0 !important;
        }
      `}</style>
    </div>
  );
} 