import React, { createContext, useState, useEffect } from 'react';
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
          const response = await axiosInstance.get('user/me/');
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
