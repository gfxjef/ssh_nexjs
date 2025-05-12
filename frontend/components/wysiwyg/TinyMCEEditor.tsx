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
 * Implementado con enfoque no controlado para evitar problemas de cursor
 */
export default function TinyMCEEditor({ value, onChange, placeholder = 'Escribe aquí...' }: TinyMCEEditorProps) {
  const editorRef = useRef<any>(null);
  const isInitialMount = useRef(true);
  const lastKnownValueRef = useRef(value);

  // Solo actualizamos el contenido desde props cuando el valor cambia externamente
  // y no por edición interna del usuario
  useEffect(() => {
    // Saltamos la primera ejecución
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Solo actualizamos si el valor externo es diferente al último valor que procesamos
    if (editorRef.current && value !== lastKnownValueRef.current) {
      // Guardamos la selección actual
      const editor = editorRef.current;
      const bookmarkId = editor.selection.getBookmark(2, true);
      
      // Actualizamos el contenido
      editor.setContent(value);
      
      // Restauramos la selección
      editor.selection.moveToBookmark(bookmarkId);
      
      // Actualizamos la referencia del último valor conocido
      lastKnownValueRef.current = value;
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
    
    // Establecemos el valor inicial solo durante la inicialización
    if (value) {
      editor.setContent(value);
      lastKnownValueRef.current = value;
    }
    
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
          // Mejoras de rendimiento
          cache_suffix: '?v=' + new Date().getTime()
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