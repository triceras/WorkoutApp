// src/components/PrivateRoute.jsx

import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

function PrivateRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // Initialize as null to indicate loading state

  useEffect(() => {
    const checkAuthentication = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        // Verify token validity by making a backend API call
        const response = await axiosInstance.get('auth/verify-token/');
        if (response.status === 200) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuthentication();
  }, []);

  if (isAuthenticated === null) {
    // Render a loading indicator while checking authentication status
    return <div>Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default PrivateRoute;
