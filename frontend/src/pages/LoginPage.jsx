// src/pages/LoginPage.jsx

import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Link, useNavigate } from 'react-router-dom';
import './LoginPage.css';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { username, password } = event.target.elements;
    const usernameValue = username.value.trim();
    const passwordValue = password.value.trim();

    // Basic front-end validation
    if (!usernameValue || !passwordValue) {
      setError('Please enter both username and password.');
      setLoading(false);
      return;
    }

    try {
      // Make the login request
      const response = await axiosInstance.post('auth/login/', {
        username: usernameValue,
        password: passwordValue,
      });

      console.log('Login response:', response.data);

      // Check if we have both token and user data
      const { token, user } = response.data;
      if (!token || !user) {
        throw new Error('Server response was incomplete: missing token or user data');
      }

      // Use the login function from AuthContext
      await login(token, user);

      // Navigate to the dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response?.status === 400) {
        setError('Invalid username or password.');
      } else if (error.response?.status === 401) {
        setError('Authentication failed. Please check your credentials.');
      } else if (error.message.includes('Server response was incomplete')) {
        setError('Server response was incomplete. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2 className="login-title">Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Enter your username"
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <p className="register-link">
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
