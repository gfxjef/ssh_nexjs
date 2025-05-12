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
    try {
      const formData = new FormData();
      formData.append('image', blobInfo.blob(), blobInfo.filename());
      
      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al subir la imagen');
      }
      
      const data = await response.json();
      return data.url; // Retorna la URL de la imagen subida
    } catch (error) {
      console.error('Error al subir imagen:', error);
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
            // Desactivar cualquier evento que pueda reiniciar el cursor
            editor.on('BeforeSetContent', (e: any) => {
              // Siempre permitir establecer contenido durante la inicialización
              if (!initialValueSet.current) {
                return;
              }
              
              // Bloquear actualizaciones de contenido SOLO cuando el editor tiene foco
              // Esto previene que el cursor salte al inicio mientras se escribe
              if (editorFocused.current) {
                e.preventDefault();
                return false;
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