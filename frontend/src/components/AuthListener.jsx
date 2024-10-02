// src/components/AuthListener.jsx

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'authToken' && !event.newValue) {
        // Token was removed, redirect to login
        navigate('/login');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate]);

  return null;
};

export default AuthListener;
