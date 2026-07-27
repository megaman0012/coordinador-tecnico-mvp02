import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Ordenes from './pages/Ordenes';
import Horas from './pages/Horas';
import Tecnicos from './pages/Tecnicos';
import Facturas from './pages/Facturas';
import Asignaciones from './pages/Asignaciones';
import Configuracion from './pages/Configuracion';
import Informes from './pages/Informes';
import Inventario from './pages/Inventario';

// Componente para proteger rutas
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/ordenes" element={
        <ProtectedRoute allowedRoles={['admin', 'coordinador']}>
          <Layout>
            <Ordenes />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/asignaciones" element={
        <ProtectedRoute>
          <Layout>
            <Asignaciones />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/horas" element={
        <ProtectedRoute>
          <Layout>
            <Horas />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/tecnicos" element={
        <ProtectedRoute allowedRoles={['admin', 'coordinador']}>
          <Layout>
            <Tecnicos />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/facturas" element={
        <ProtectedRoute allowedRoles={['admin', 'coordinador']}>
          <Layout>
            <Facturas />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/configuracion" element={
        <ProtectedRoute allowedRoles={['admin', 'coordinador']}>
          <Layout>
            <Configuracion />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/informes" element={
        <ProtectedRoute allowedRoles={['admin', 'coordinador']}>
          <Layout>
            <Informes />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/inventario" element={
        <ProtectedRoute allowedRoles={['admin', 'coordinador']}>
          <Layout>
            <Inventario />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;