// src/pages/LoginPage.jsx

import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Link, useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null); // Use setError if handling errors

  // Define the handleSubmit function
  const handleSubmit = (event) => {
    event.preventDefault();
    const { username, password } = event.target.elements;

    axiosInstance
      .post('auth/login/', {
        username: username.value,
        password: password.value,
      })
      .then((response) => {
        const { token } = response.data;
        // Store the token
        localStorage.setItem('authToken', token);
        console.log('Token stored:', token); // Add logging
        // Redirect to the dashboard
        navigate('/');
      })
      .catch((error) => {
        setError('Invalid username or password.');
        console.error('Login error:', error);
      });
  };

  return (
    <div>
      <h2>Login</h2>
      {error && <p>{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Username:
          <input type="text" name="username" required />
        </label>
        <br />
        <label>
          Password:
          <input type="password" name="password" required />
        </label>
        <br />
        <button type="submit">Login</button>
      </form>
      <p>
        Don't have an account? <Link to="/register">Register here</Link>.
      </p>
    </div>
  );
}

export default LoginPage;
