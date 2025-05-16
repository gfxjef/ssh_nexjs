'use client';

import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { usePermissions } from './PermissionsContext';

interface PermissionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  permissionId: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

/**
 * Botón que se muestra solo si el usuario tiene los permisos adecuados
 */
export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permissionId,
  children,
  variant = 'primary',
  className = '',
  ...rest
}) => {
  const { hasButtonAccess } = usePermissions();
  
  if (!hasButtonAccess(permissionId)) {
    return null;
  }
  
  const baseStyles = "px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50";
  
  const variantStyles = {
    primary: "bg-[#d48b45] text-white hover:bg-[#be7b3d] focus:ring-[#d48b45]",
    secondary: "bg-[#8dbba3] text-white hover:bg-[#7daa93] focus:ring-[#8dbba3]",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600",
    ghost: "bg-transparent text-[#2e3954] hover:bg-gray-100 focus:ring-gray-400"
  };
  
  const buttonClassName = `${baseStyles} ${variantStyles[variant]} ${className}`;

  return (
    <button 
      className={buttonClassName}
      data-permission-id={permissionId}
      {...rest}
    >
      {children}
    </button>
  );
}; 