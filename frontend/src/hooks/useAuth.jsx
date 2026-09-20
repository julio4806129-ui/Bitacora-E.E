import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shiftCounter, setShiftCounter] = useState(0);

  const fetchUserProfile = async () => {
    try {
      const userData = await apiClient.get('/usuarios/me/');
      setUser(userData);
      setIsAuthenticated(true);
      setIsAdmin(userData.rol === 'admin' || userData.es_admin === true || userData.isAdmin === true);
      setShiftCounter(userData.atendidos_hoy || 0);
      return userData;
    } catch (error) {
      console.error('Failed to authenticate token', error);
      logout();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        await fetchUserProfile();
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/token/', { username, password });
      const { access, refresh } = response.data;
      
      localStorage.setItem('token', access);
      localStorage.setItem('refreshToken', refresh);
      setToken(access);
      
      const userData = await axios.get('/api/usuarios/me/', {
        headers: { Authorization: `Bearer ${access}` }
      });
      
      setUser(userData.data);
      setIsAuthenticated(true);
      setIsAdmin(userData.data.rol === 'admin' || userData.data.es_admin === true || userData.data.isAdmin === true);
      setShiftCounter(userData.data.atendidos_hoy || 0);
      
      return true;
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };

  const loginByCodigo = async (codigo, pin) => {
    try {
      const response = await axios.post('/api/auth/codigo/', { codigo, pin });
      const { access, refresh, user: userData } = response.data;

      localStorage.setItem('token', access);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('userCodigo', codigo);
      setToken(access);

      setUser(userData);
      setIsAuthenticated(true);
      setIsAdmin(userData.rol === 'admin' || userData.es_admin === true || userData.isAdmin === true);
      setShiftCounter(userData.atendidos_hoy || 0);

      return userData;
    } catch (error) {
      console.error('Login by code failed', error);
      throw error;
    }
  };

  const refreshCounter = async () => {
    if (!token) return;
    try {
      const res = await apiClient.get('/usuarios/contador/');
      setShiftCounter(res.count);
      return res.count;
    } catch (e) {
      console.error('Error refreshing shift counter', e);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userCodigo');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setShiftCounter(0);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isAdmin, 
      login, 
      loginByCodigo, 
      logout, 
      loading, 
      shiftCounter, 
      setShiftCounter, 
      refreshCounter,
      fetchUserProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
