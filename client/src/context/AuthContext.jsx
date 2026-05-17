import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('rankrush_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('rankrush_token');
    
    if (!token) {
      setUser(null);
      localStorage.removeItem('rankrush_user');
      setLoading(false);
      return;
    }

    authAPI
      .getProfile()
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem('rankrush_user', JSON.stringify(res.data.user));
      })
      .catch(() => {
        localStorage.removeItem('rankrush_token');
        localStorage.removeItem('rankrush_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { user: userData, token } = res.data;
    localStorage.setItem('rankrush_token', token);
    localStorage.setItem('rankrush_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('rankrush_token');
    localStorage.removeItem('rankrush_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
