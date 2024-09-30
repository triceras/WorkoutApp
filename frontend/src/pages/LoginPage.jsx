// src/pages/LoginPage.jsx

import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Link, useNavigate } from 'react-router-dom';
import './LoginPage.css'; // Import the corresponding CSS

function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null); // For handling error messages
  const [loading, setLoading] = useState(false); // For handling the loading state

  // Define the handleSubmit function
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null); // Reset previous errors
    setLoading(true); // Start loading

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
      const response = await axiosInstance.post('auth/login/', {
        username: usernameValue,
        password: passwordValue,
      });

      const { token } = response.data;
      // Store the token
      localStorage.setItem('authToken', token);
      console.log('Token stored:', token); // For debugging
      // Redirect to the dashboard
      navigate('/');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        setError('Invalid username or password.');
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
      console.error('Login error:', error);
    } finally {
      setLoading(false); // End loading
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Optional: Add a logo or branding */}
        {/* <img src="/path-to-logo.png" alt="App Logo" className="login-logo" /> */}
        
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
            />
          </div>
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        {/* Optional: Forgot Password Link */}
        {/* <div className="forgot-password">
          <Link to="/forgot-password">Forgot your password?</Link>
        </div> */}
        <p className="register-link">
          Don't have an account? <Link to="/register">Register here</Link>.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
