// frontend/src/context/AuthContext.jsx

import React, { createContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import PropTypes from 'prop-types';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // To handle the initial loading state

  useEffect(() => {
    const fetchUser = async () => {
      if (authToken) {
        try {
          const response = await axiosInstance.get('user/');
          setUser(response.data);
        } catch (error) {
          console.error('Error fetching user:', error);
          setAuthToken(null);
          localStorage.removeItem('authToken');
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [authToken]);

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    delete axiosInstance.defaults.headers['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ authToken, setAuthToken, user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
