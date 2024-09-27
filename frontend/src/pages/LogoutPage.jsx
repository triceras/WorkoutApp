// src/pages/LogoutPage.jsx

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await axiosInstance.post('logout/'); // Ensure your backend handles logout
      } catch (error) {
        console.error('Error during logout:', error);
      } finally {
        localStorage.removeItem('authToken');
        navigate('/login'); // Redirect to login page
      }
    };

    performLogout();
  }, [navigate]);

  return <div>Logging out...</div>;
}

export default Logout;
