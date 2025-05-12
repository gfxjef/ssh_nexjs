'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Importación dinámica para evitar problemas con SSR
const ReactQuillNoSSR = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <p>Cargando editor...</p> 
});

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function EditorBasic({ value, onChange }: EditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-32 border rounded border-gray-300 p-2 bg-gray-50">Cargando editor...</div>;
  }

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'clean']
    ]
  };

  return (
    <div>
      <ReactQuillNoSSR
        value={value}
        onChange={onChange}
        modules={modules}
        theme="snow"
        className="h-64"
      />
      <style jsx global>{`
        .ql-container {
          min-height: 10rem;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
        }
        .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
        }
      `}</style>
    </div>
  );
} 