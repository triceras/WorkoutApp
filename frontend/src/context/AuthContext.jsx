// src/context/AuthContext.jsx

import React, { createContext, useState, useEffect, useContext } from 'react';
import axiosInstance from '../api/axiosInstance';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (authToken) {
        try {
          axiosInstance.defaults.headers['Authorization'] = `Token ${authToken}`;
          const response = await axiosInstance.get('users/me/');
          setUser(response.data);
          console.log('Authenticated user:', response.data); // Add this line
        } catch (error) {
          console.error('Error fetching user:', error);
          setAuthToken(null);
          localStorage.removeItem('authToken');
          delete axiosInstance.defaults.headers['Authorization'];
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };
  
    fetchUser();
  }, [authToken]);

  const login = (token) => {
    localStorage.setItem('authToken', token);
    setAuthToken(token);
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    delete axiosInstance.defaults.headers['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ authToken, setAuthToken, login, user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};
