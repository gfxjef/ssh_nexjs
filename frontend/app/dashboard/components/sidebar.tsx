// Sidebar component for dashboard using react-mui-sidebar
'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar, Menu, MenuItem, Submenu, Logo } from 'react-mui-sidebar';
import { usePermissions } from '@/lib/permissions/PermissionsContext';

// Importar iconos de MUI
import FolderIcon from '@mui/icons-material/Folder'; // Genérico para agrupadores si se decide usar
import DescriptionIcon from '@mui/icons-material/Description'; // Genérico para items si se decide usar
import SettingsIcon from '@mui/icons-material/Settings';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import StorefrontIcon from '@mui/icons-material/Storefront';
import FavoriteIcon from '@mui/icons-material/Favorite';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import AddTaskIcon from '@mui/icons-material/AddTask';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HistoryIcon from '@mui/icons-material/History';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PollIcon from '@mui/icons-material/Poll';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed';
import EditNoteIcon from '@mui/icons-material/EditNote';


// Estructura de navegación adaptada para react-mui-sidebar con iconos
export const navItemsConfig = [
  {
    name: 'Marketing',
    icon: <BusinessCenterIcon />,
    submenus: [
      { name: 'Inventario', href: '/dashboard/marketing/inventario', icon: <InventoryIcon />, isGrouper: true, children: [
        { name: 'Agregar/Consultar', href: '/dashboard/marketing/inventario/agregar-consultar', icon: <AddCircleOutlineIcon /> }
      ]},
      { name: 'Merchandising', href: '/dashboard/marketing/merchandising', icon: <ShoppingBagIcon />, isGrouper: true, children: [
        { name: 'Solicitud', href: '/dashboard/marketing/merchandising/solicitud', icon: <AddTaskIcon /> },
        { name: 'Confirmación', href: '/dashboard/marketing/merchandising/confirmacion', icon: <CheckCircleOutlineIcon /> },
        { name: 'Historial', href: '/dashboard/marketing/merchandising/historial', icon: <HistoryIcon /> }
      ]},
      { name: 'Catálogos', href: '/dashboard/marketing/catalogos', icon: <MenuBookIcon /> }
    ],
  },
  {
    name: 'Ventas',
    icon: <StorefrontIcon />,
    submenus: [
      { name: 'Encuestas', href: '/dashboard/ventas/encuestas', icon: <PollIcon />, isGrouper: true, children: [
        { name: 'Registro Calificaciones', href: '/dashboard/ventas/encuestas/calificaciones', icon: <FactCheckIcon /> }
      ]}
    ],
  },
  {
    name: 'Bienestar y Talento',
    icon: <FavoriteIcon />,
    submenus: [
      { name: 'Posts', href: '/dashboard/bienestar/posts', icon: <DynamicFeedIcon /> },
      { name: 'Administrar Posts', href: '/dashboard/bienestar/admin-posts', icon: <EditNoteIcon /> }
    ],
  },
  {
    name: 'Configuración',
    icon: <SettingsIcon />,
    href: '/dashboard/configuracion',
    submenus: [],
  }
];

const GlobalSidebarStyles = () => (
  <style jsx global>{`
    .MuiListItemButton-root.Mui-selected {
      background-color: #cd8643 !important; // Color para el item de submenú seleccionado
    }
    .MuiListItemButton-root.Mui-selected .MuiTypography-root {
      color: white !important; // Opcional: Cambiar color del texto para mejor contraste
    }
    .MuiListItemButton-root.Mui-selected .MuiListItemIcon-root svg {
      color: white !important; // Opcional: Cambiar color del icono para mejor contraste
    }
  `}</style>
);

export default function AppSidebar() {
  const { hasMenuAccess } = usePermissions();
  const pathname = usePathname() || '';

  // Nueva función para verificar si un menú está activo basado en la ruta actual
  const isMenuActive = (menuName: string) => {
    const menuPath = `/dashboard/${menuName.toLowerCase().replace(/ y /g, '/')}`;
    return pathname.startsWith(menuPath);
  };

  // Nueva función para verificar si un submenu está activo
  const isSubmenuActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderSubmenuItems = (submenuItems: any[], parentPath: string) => {
    return submenuItems.map((subItem) => {
      const currentPath = `${parentPath}/${subItem.name}`;
      if (!hasMenuAccess(currentPath)) {
        return null;
      }

      if (subItem.children && subItem.children.length > 0) {
        // Este caso es para sub-submenús, si los hubiera.
        // react-mui-sidebar puede anidar Submenu dentro de Submenu.
        return (
          <Submenu 
            key={subItem.name} 
            title={subItem.name} 
            icon={subItem.icon}
          >
            {renderSubmenuItems(subItem.children, currentPath)}
          </Submenu>
        );
      }

      return (
        <MenuItem
          key={subItem.name}
          component={Link}
          link={subItem.href}
          isSelected={isSubmenuActive(subItem.href)}
          icon={subItem.icon}
        >
          {subItem.name}
        </MenuItem>
      );
    });
  };

  return (
    <>
      <GlobalSidebarStyles />
      <Sidebar width={"270px"} themeColor="#d3d3d3"  textColor="#828282" showProfile={false}>
        <Logo
          component={Link}
          href="/dashboard"
          img="/grupokossodo_color.png"
        >
          Grupo Kossodo
        </Logo>

        {navItemsConfig.map((item) => {
          if (!hasMenuAccess(item.name)) {
            return null;
          }

          // Verificar si este menú principal está activo
          const isActive = isMenuActive(item.name);

          return (
            <Menu key={item.name} subHeading={item.name.toUpperCase()}>
              {item.submenus && item.submenus.length > 0 
                ? item.submenus.map((submenu) => {
                    const submenuPath = `${item.name}/${submenu.name}`;
                    if (!hasMenuAccess(submenuPath)) return null;

                    if (submenu.isGrouper && submenu.children && submenu.children.length > 0) {
                      return (
                        <Submenu 
                          key={submenu.name} 
                          title={submenu.name} 
                          icon={submenu.icon}
                        >
                          {renderSubmenuItems(submenu.children, submenuPath)}
                        </Submenu>
                      );
                    } else if (!submenu.isGrouper) {
                      return (
                        <MenuItem
                          key={submenu.name}
                          component={Link}
                          link={submenu.href}
                          isSelected={isSubmenuActive(submenu.href)}
                          icon={submenu.icon}
                        >
                          {submenu.name}
                        </MenuItem>
                      );
                    }
                    return null;
                })
                : item.href ? (
                  <MenuItem
                    component={Link}
                    link={item.href}
                    isSelected={pathname === item.href}
                    icon={item.icon} 
                  >
                    {item.name}
                  </MenuItem>
                ) : null
              }
            </Menu>
          );
        })}
      </Sidebar>
    </>
  );
}
