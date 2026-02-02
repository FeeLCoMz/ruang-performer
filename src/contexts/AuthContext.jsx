import React, { createContext, useState, useEffect } from 'react';
import * as authUtils from '../utils/auth.js';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in on mount
    const savedUser = authUtils.getUser();
    if (savedUser) {
      setUser(savedUser);
    }
    setIsLoading(false);
  }, []);

  const login = (token, userData) => {
    authUtils.saveToken(token);
    authUtils.saveUser(userData);
    setUser(userData);
    setError(null);
  };

  const logout = () => {
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
