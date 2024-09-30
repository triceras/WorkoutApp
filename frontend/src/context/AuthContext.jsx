// src/context/AuthContext.jsx

import React, { createContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance'; // Ensure axiosInstance is correctly set up

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');

    if (token) {
      setAuthToken(token);
      if (userData) {
        setUser(JSON.parse(userData));
      } else {
        // Fetch user data from the backend if not present in localStorage
        axiosInstance.get('user/')
          .then(response => {
            setUser(response.data);
            localStorage.setItem('userData', JSON.stringify(response.data));
          })
          .catch(error => {
            console.error('Error fetching user data:', error);
            logout(); // If fetching user fails, perform logout
          });
      }
    }

    setLoading(false);
  }, []);

  // Function to handle login
  const login = (token, userData) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(userData));
    setAuthToken(token);
    setUser(userData);
  };

  // Function to handle logout
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ authToken, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
