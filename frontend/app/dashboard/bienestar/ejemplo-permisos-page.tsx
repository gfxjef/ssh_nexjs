'use client';

import { useState } from 'react';
import { PermissionButton, WithPermission, usePermissions } from '@/lib/permissions';

export default function EjemploPermisosPage() {
  const { userRole } = usePermissions();
  const [posts, setPosts] = useState([
    { id: 1, title: 'Novedades del mes', author: 'Admin', category: 'Noticias' },
    { id: 2, title: 'Tips de bienestar', author: 'RRHH', category: 'Consejos' },
    { id: 3, title: 'Eventos próximos', author: 'Marketing', category: 'Eventos' }
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ejemplo de Permisos</h1>
        
        {/* Este botón solo aparece para usuarios con permiso 'add-post' */}
        <PermissionButton 
          permissionId="add-post" 
          variant="primary"
          onClick={() => alert('Crear nuevo post')}
        >
          <span className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Nuevo Post
          </span>
        </PermissionButton>
      </div>
      
      {/* Información sobre permisos */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-blue-600">
          <strong>Tu rol actual:</strong> {userRole || 'No identificado'}
        </p>
        <p className="text-sm text-blue-500 mt-1">
          Los botones de acciones están controlados por permisos. Solo verás aquellos a los que tienes acceso.
        </p>
      </div>

      {/* Tabla de posts */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Autor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {posts.map((post) => (
              <tr key={post.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{post.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{post.author}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {post.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex space-x-2 justify-end">
                    {/* Botón de editar - solo visible para usuarios con permiso */}
                    <WithPermission permissionId="edit-post" type="button">
                      <button className="text-indigo-600 hover:text-indigo-900" onClick={() => alert(`Editar post ${post.id}`)}>
                        Editar
                      </button>
                    </WithPermission>
                    
                    {/* Botón de eliminar - solo visible para usuarios con permiso */}
                    <WithPermission permissionId="delete-post" type="button">
                      <button className="text-red-600 hover:text-red-900" onClick={() => alert(`Eliminar post ${post.id}`)}>
                        Eliminar
                      </button>
                    </WithPermission>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 