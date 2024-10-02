// src/pages/LogoutPage.jsx

import React, { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';

function Logout() {
  const navigate = useNavigate();
  const { setAuthToken } = useContext(AuthContext);

  useEffect(() => {
    const performLogout = async () => {
      try {
        await axiosInstance.post('logout/'); // Ensure your backend handles logout
      } catch (error) {
        console.error('Error during logout:', error);
      } finally {
        localStorage.removeItem('authToken');
        setAuthToken(null); // Update context
        // Optionally, remove Authorization header from axiosInstance
        delete axiosInstance.defaults.headers['Authorization'];
        navigate('/login'); // Redirect to login page
      }
    };

    performLogout();
  }, [navigate, setAuthToken]);

  return <div>Logging out...</div>;
}

export default Logout;
