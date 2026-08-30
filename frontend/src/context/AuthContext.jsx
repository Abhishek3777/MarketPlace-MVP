import { createContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/auth.service.js';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('marketplace_token'));
  const [loading, setLoading] = useState(true);

  // Restore authenticated session
  const checkAuth = useCallback(async () => {
    const savedToken = localStorage.getItem('marketplace_token');
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const res = await authApi.getMe();
      if (res.success && res.data.user) {
        setUser(res.data.user);
        setToken(savedToken);
      } else {
        localStorage.removeItem('marketplace_token');
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      console.warn('Session verification failed:', err.message);
      localStorage.removeItem('marketplace_token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.success && res.data) {
      localStorage.setItem('marketplace_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (userData) => {
    const res = await authApi.register(userData);
    if (res.success && res.data) {
      localStorage.setItem('marketplace_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      if (token) await authApi.logout();
    } catch (err) {
      console.warn('Logout API notification error:', err);
    } finally {
      localStorage.removeItem('marketplace_token');
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        role: user?.role || null,
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
