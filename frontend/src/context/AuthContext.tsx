import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Usuario {
  id: number;
  username: string;
  rol: 'admin' | 'coordinador' | 'tecnico';
  tecnico?: {
    id: number;
    nombre: string;
  };
}

interface AuthContextType {
  usuario: Usuario | null;
  setUsuario: (usuario: Usuario | null) => void;
  isAuthenticated: boolean;
  login: (usuario: Usuario, token: string) => void;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay sesión guardada
    const token = localStorage.getItem('token');
    const usuarioData = localStorage.getItem('usuario');
    
    if (token && usuarioData) {
      try {
        const parsed = JSON.parse(usuarioData);
        setUsuario(parsed);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
      }
    }
    setLoading(false);
  }, []);

  const login = (usuarioData: Usuario, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuarioData));
    setUsuario(usuarioData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  const hasRole = (roles: string[]) => {
    if (!usuario) return false;
    return roles.includes(usuario.rol);
  };

  return (
    <AuthContext.Provider value={{
      usuario,
      setUsuario,
      isAuthenticated: !!usuario,
      login,
      logout,
      hasRole,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export default AuthContext;