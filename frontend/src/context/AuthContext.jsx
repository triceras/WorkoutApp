// src/context/AuthContext.jsx

import React, { createContext, useState, useEffect, useContext } from 'react';
import axiosInstance from '../api/axiosInstance';

// Create the context
export const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  // Initialize authToken from localStorage
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken'));

  // Initialize user from localStorage
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      console.log('AuthContext: Starting fetchUser', {
        authToken: authToken ? 'Token present' : 'No token',
        localStorage: localStorage.getItem('authToken')
      });

      if (authToken) {
        try {
          axiosInstance.defaults.headers['Authorization'] = `Token ${authToken}`;
          const response = await axiosInstance.get('users/me/');
          console.log('AuthContext: User fetch successful', response.data);
          
          // Update user state and localStorage atomically
          const userData = response.data;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('Authenticated user:', userData);
        } catch (error) {
          console.error('AuthContext: Error fetching user', {
            error: error.message,
            response: error.response?.data,
            status: error.response?.status
          });
          // Clear all auth state atomically
          setAuthToken(null);
          setUser(null);
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          delete axiosInstance.defaults.headers['Authorization'];
        }
      } else {
        console.log('AuthContext: No token, clearing auth state');
        setUser(null);
        localStorage.removeItem('user');
        delete axiosInstance.defaults.headers['Authorization'];
      }
      setLoading(false);
    };

    fetchUser();
  }, [authToken]);

  const login = async (token, userData) => {
    console.log('AuthContext: Login called with:', {
      hasToken: !!token,
      hasUserData: !!userData,
    });

    try {
      // Validate inputs
      if (!token || !userData) {
        throw new Error('Invalid login data: Token and user data are required');
      }

      // Update axios headers first
      axiosInstance.defaults.headers['Authorization'] = `Token ${token}`;

      // Then update localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));

      // Finally update state
      setAuthToken(token);
      setUser(userData);

      console.log('AuthContext: Login successful, state updated');
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      // Clean up on error
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      delete axiosInstance.defaults.headers['Authorization'];
      setAuthToken(null);
      setUser(null);
      throw error;
    }
  };

  const logout = () => {
    console.log('AuthContext: Logging out');
    // Clean up auth state
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    delete axiosInstance.defaults.headers['Authorization'];
  };

  const value = {
    authToken,
    user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};
