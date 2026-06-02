import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, setTokens, clearTokens } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('rankrush_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  // Pending verification state (userId + email stored between signup → verify)
  const [pendingVerification, setPendingVerification] = useState(() => {
    const stored = localStorage.getItem('rankrush_pending_verification');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    const token = localStorage.getItem('rankrush_access_token');

    if (!token) {
      setUser(null);
      localStorage.removeItem('rankrush_user');
      setLoading(false);
      return;
    }

    authAPI
      .getProfile()
      .then((res) => {
        const u = res.data.user;
        setUser(u);
        localStorage.setItem('rankrush_user', JSON.stringify(u));
      })
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const studentSignup = useCallback(async (data) => {
    const res = await authAPI.studentSignup(data);
    const pending = {
      userId: res.data.userId,
      email: res.data.email,
    };
    setPendingVerification(pending);
    localStorage.setItem('rankrush_pending_verification', JSON.stringify(pending));
    return res;
  }, []);

  const verifyEmail = useCallback(async (userId, otp) => {
    const res = await authAPI.verifyEmail({ userId, otp });
    const { user: userData, accessToken, refreshToken } = res.data;

    setTokens(accessToken, refreshToken);
    setUser(userData);
    localStorage.setItem('rankrush_user', JSON.stringify(userData));
    setPendingVerification(null);
    localStorage.removeItem('rankrush_pending_verification');

    return userData;
  }, []);

  const login = useCallback(async (email, password, expectedRole) => {
    const res = await authAPI.login({ email, password });

    if (res.data.requiresVerification) {
      const pending = { userId: res.data.userId, email: res.data.email };
      setPendingVerification(pending);
      localStorage.setItem('rankrush_pending_verification', JSON.stringify(pending));
      return { requiresVerification: true, ...pending };
    }

    const { user: userData, accessToken, refreshToken } = res.data;

    if (expectedRole && userData.role !== expectedRole) {
      throw new Error(`Access denied: Invalid credentials for ${expectedRole.toLowerCase()} portal.`);
    }

    setTokens(accessToken, refreshToken);
    setUser(userData);
    localStorage.setItem('rankrush_user', JSON.stringify(userData));
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('rankrush_refresh_token');
      if (refreshToken) {
        await authAPI.logout({ refreshToken });
      }
    } catch {
      // Logout even if API call fails
    }
    clearTokens();
    setUser(null);
    setPendingVerification(null);
    localStorage.removeItem('rankrush_pending_verification');
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('rankrush_user', JSON.stringify(userData));
  }, []);

  const clearPendingVerification = useCallback(() => {
    setPendingVerification(null);
    localStorage.removeItem('rankrush_pending_verification');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        pendingVerification,
        studentSignup,
        verifyEmail,
        login,
        logout,
        updateUser,
        clearPendingVerification,
      }}
    >
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
