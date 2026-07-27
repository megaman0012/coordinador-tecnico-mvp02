import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Calendar, Clock, Users, FileText, Settings, LogOut, Menu, X, ChevronRight, Home, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout, hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Menú según rol
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['admin', 'coordinador', 'tecnico'] },
    { path: '/ordenes', label: 'Órdenes', icon: <ClipboardList size={20} />, roles: ['admin', 'coordinador'] },
    { path: '/asignaciones', label: 'Asignaciones', icon: <Calendar size={20} />, roles: ['admin', 'coordinador', 'tecnico'] },
    { path: '/horas', label: 'Horas', icon: <Clock size={20} />, roles: ['admin', 'coordinador', 'tecnico'] },
    { path: '/tecnicos', label: 'Técnicos', icon: <Users size={20} />, roles: ['admin', 'coordinador'] },
    { path: '/facturas', label: 'Facturas', icon: <FileText size={20} />, roles: ['admin', 'coordinador'] },
    { path: '/informes', label: 'Informes', icon: <FileText size={20} />, roles: ['admin', 'coordinador', 'tecnico'] },
    { path: '/inventario', label: 'Inventario', icon: <Package size={20} />, roles: ['admin', 'coordinador'] },
    { path: '/configuracion', label: 'Configuración', icon: <Settings size={20} />, roles: ['admin', 'coordinador'] },
  ];

  // Filtrar menú según rol
  const filteredMenuItems = menuItems.filter(item => 
    item.roles.some(role => hasRole([role]))
  );

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Breadcrumb logic
  const getBreadcrumbs = () => {
    const currentItem = filteredMenuItems.find(item => item.path === location.pathname);
    if (!currentItem) return [{ label: 'Página', path: location.pathname }];
    return [
      { label: 'Inicio', path: '/' },
      { label: currentItem.label, path: currentItem.path }
    ];
  };

  const breadcrumbs = getBreadcrumbs();

  const getRolColor = (rol: string) => {
    switch (rol) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'coordinador': return 'bg-blue-100 text-blue-700';
      case 'tecnico': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRolLabel = (rol: string) => {
    switch (rol) {
      case 'admin': return 'Administrador';
      case 'coordinador': return 'Coordinador';
      case 'tecnico': return 'Técnico';
      default: return rol;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Botón hamburguesa - solo visible en móvil */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-slate-800 text-white rounded-lg shadow-lg"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar - Overlay en móvil, fijo en desktop */}
      <>
        {/* Overlay oscuro móvil */}
        {sidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeSidebar}
          />
        )}
        
        {/* Sidebar */}
        <aside className={`
          fixed md:fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 text-white flex flex-col transform transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Coordinador Técnico</h1>
              <p className="text-sm text-slate-400">Gestión de Servicios</p>
            </div>
            <button 
              onClick={closeSidebar}
              className="md:hidden p-1 hover:bg-slate-700 rounded"
            >
              <X size={20} />
            </button>
          </div>

          {/* Usuario info */}
          {usuario && (
            <div className="px-4 py-3 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">{usuario.username.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{usuario.username}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRolColor(usuario.rol)}`}>
                    {getRolLabel(usuario.rol)}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {filteredMenuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={closeSidebar}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-4 border-t border-slate-700">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white w-full hover:bg-slate-700 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>
      </>

      {/* Main Content - con margen en móvil para el botón hamburguesa */}
      <main className="flex-1 p-4 md:p-8 md:ml-64 overflow-auto">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/" className="hover:text-blue-600 flex items-center gap-1">
            <Home size={16} />
            Inicio
          </Link>
          {breadcrumbs.slice(1).map((crumb, idx) => (
            <React.Fragment key={crumb.path}>
              <ChevronRight size={16} />
              <span className="text-gray-800 font-medium">{crumb.label}</span>
            </React.Fragment>
          ))}
        </nav>
        {children}
      </main>
    </div>
  );
};

export default Layout;