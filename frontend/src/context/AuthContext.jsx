import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearAppData = () => {
    localStorage.removeItem('shri-ganesh-user');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('billItems');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('pending-monday-notice-')) {
        localStorage.removeItem(key);
      }
    });
  };

  useEffect(() => {
    const stored = localStorage.getItem('shri-ganesh-user');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setUser(data);
      } catch {
        clearAppData();
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    // Clear previous user session/cart data before setting a new user session.
    clearAppData();
    const u = { ...userData, token };
    setUser(u);
    localStorage.setItem('shri-ganesh-user', JSON.stringify(u));
    if (token) {
      localStorage.setItem('token', token);
    }
    if (u?._id) {
      localStorage.setItem('userId', String(u._id));
    }
  };

  const logout = () => {
    setUser(null);
    clearAppData();
  };

  const isLoggedIn = !!(user?.token || localStorage.getItem('token'));

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
