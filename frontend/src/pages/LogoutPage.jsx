// src/pages/LogoutPage.jsx

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

function Logout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await axiosInstance.post('logout/'); // Ensure your backend handles logout
      } catch (error) {
        console.error('Error during logout:', error);
      } finally {
        // Use the logout function from AuthContext
        logout();
        navigate('/'); // Redirect to landing page instead of login
      }
    };

    performLogout();
  }, [navigate, logout]);

  return <div>Logging out...</div>;
}

export default Logout;
