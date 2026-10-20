import React, { createContext, useState, useEffect } from 'react';
import * as authUtils from '../utils/auth.js';
import * as apiClient from '../apiClient.js';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in on mount
    const savedUser = authUtils.getUser();
    const token = authUtils.getToken();
    if (savedUser && token) {
      apiClient.getCurrentUser()
        .then(res => {
          if (res && res.user) {
            const userWithRole = { ...res.user, role: res.user.role || savedUser.role || 'member' };
            setUser(userWithRole);
            authUtils.saveUser(userWithRole);
          } else {
            setUser(savedUser);
          }
        })
        .catch(() => {
          setUser(savedUser);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    authUtils.saveToken(token);
    const userWithRole = { ...userData, role: userData.role || 'member' };
    authUtils.saveUser(userWithRole);
    setUser(userWithRole);
    setError(null);
  };

  const logout = () => {
    // Catat USER_LOGOUT selagi token masih ada, lalu bersihkan sesi lokal.
    // Tidak di-await: navigasi keluar tidak boleh menunggu jaringan.
    apiClient.logout();
    authUtils.logout();
    setUser(null);
    setError(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, error, setError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
