'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { menuAccessManager, usePermissions, updatePermission } from '@/lib/permissions';

export default function PruebaPermisosPage() {
  const [user, setUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<string>('');
  const { userRole } = usePermissions();
  const [customPermission, setCustomPermission] = useState<string>('');
  const [customRoles, setCustomRoles] = useState<string>('');
  const [permissionType, setPermissionType] = useState<'menu' | 'button'>('menu');
  const router = useRouter();

  // Cargar usuario al montar el componente
  useEffect(() => {
    const storedUserJson = localStorage.getItem('user');
    if (storedUserJson) {
      try {
        const storedUser = JSON.parse(storedUserJson);
        setUser(storedUser);
      } catch (error) {
        console.error('Error al parsear usuario:', error);
      }
    }
  }, []);

  // Función para cambiar el rol manualmente
  const handleRoleChange = () => {
    if (!newRole) return;
    
    if (user) {
      const updatedUser = {
        ...user,
        rango: newRole
      };
      
      // Actualizar en localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Actualizar en el gestor de permisos
      menuAccessManager.setUserRole(newRole);
      
      // Actualizar estado
      setUser(updatedUser);
      
      // Mostrar mensaje
      alert(`Rol cambiado a: ${newRole}. Los permisos se actualizarán cuando recargues la página.`);
      
      // Recargar la página para que los cambios tomen efecto
      router.refresh();
    }
  };

  // Función para crear o actualizar un permiso personalizado
  const handleAddCustomPermission = () => {
    if (!customPermission || !customRoles) return;
    
    const roles = customRoles.split(',').map(role => role.trim());
    const success = updatePermission(customPermission, roles, permissionType);
    
    if (success) {
      alert(`Permiso "${customPermission}" actualizado para roles: ${roles.join(', ')}`);
      setCustomPermission('');
      setCustomRoles('');
    } else {
      alert('Error al actualizar el permiso');
    }
  };

  const roleOptions = [
    'admin', 'gerente', 'vendedor', 'almacen', 'asesor', 'marketing', 'rrhh', 'atencion'
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Prueba de Permisos</h1>
      
      {/* Información actual */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Información Actual</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600 mb-2">Usuario:</p>
            <p className="font-medium">{user?.nombre || user?.usuario || 'No identificado'}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-2">Rol actual:</p>
            <p className="font-medium">{userRole || user?.rango || 'No definido'}</p>
          </div>
        </div>
      </div>
      
      {/* Cambiar rol */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Cambiar Rol del Usuario</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Selecciona un nuevo rol:
            </label>
            <select
              id="role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Selecciona un rol...</option>
              {roleOptions.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleRoleChange}
            disabled={!newRole}
            className="mt-7 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cambiar Rol
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Nota: Al cambiar el rol, los cambios en los permisos se reflejarán al recargar la página.
        </p>
      </div>
      
      {/* Agregar permiso personalizado */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Agregar Permiso Personalizado</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="permissionType" className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Permiso:
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="permissionType"
                  value="menu"
                  checked={permissionType === 'menu'}
                  onChange={() => setPermissionType('menu')}
                />
                <span className="ml-2">Menú</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="permissionType"
                  value="button"
                  checked={permissionType === 'button'}
                  onChange={() => setPermissionType('button')}
                />
                <span className="ml-2">Botón</span>
              </label>
            </div>
          </div>
          
          <div>
            <label htmlFor="customPermission" className="block text-sm font-medium text-gray-700 mb-2">
              {permissionType === 'menu' ? 'Ruta del Menú' : 'ID del Botón'}:
            </label>
            <input
              id="customPermission"
              type="text"
              value={customPermission}
              onChange={(e) => setCustomPermission(e.target.value)}
              placeholder={permissionType === 'menu' ? 'Ejemplo: Marketing/Inventario' : 'Ejemplo: edit-post'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              {permissionType === 'menu' 
                ? 'Para menús anidados, use la notación: "Menú/Submenú"' 
                : 'Use un ID único que se usará en los componentes PermissionButton'}
            </p>
          </div>
          
          <div>
            <label htmlFor="customRoles" className="block text-sm font-medium text-gray-700 mb-2">
              Roles permitidos:
            </label>
            <input
              id="customRoles"
              type="text"
              value={customRoles}
              onChange={(e) => setCustomRoles(e.target.value)}
              placeholder="Ejemplo: admin, gerente, rrhh"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Separa los roles con comas.
            </p>
          </div>
          
          <button
            onClick={handleAddCustomPermission}
            disabled={!customPermission || !customRoles}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Agregar/Actualizar Permiso
          </button>
        </div>
      </div>
      
      {/* Enlaces para pruebas */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-3">Enlaces para probar los permisos:</h3>
        <ul className="space-y-2 list-disc pl-5">
          <li>
            <a href="/dashboard" className="text-blue-600 hover:underline">Dashboard principal</a>
            {' '}- Ver cómo se filtran los menús en el sidebar
          </li>
          <li>
            <a href="/dashboard/bienestar/admin-posts" className="text-blue-600 hover:underline">Admin Posts</a>
            {' '}- Ver los botones con permisos
          </li>
        </ul>
      </div>
    </div>
  );
} 