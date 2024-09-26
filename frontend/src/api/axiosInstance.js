// src/api/axiosInstance.js

import axios from 'axios';

// Create an instance of axios
const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api/',
  timeout: 5000,
});

// Request interceptor to add auth token to headers
axiosInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken');

      // List of endpoints that do not require authentication
      const nonAuthEndpoints = ['/register/', '/login/', '/auth/verify-token/'];

      // Check if the request URL ends with any of the non-auth endpoints
      const requiresAuth = !nonAuthEndpoints.some((endpoint) =>
        config.url.endsWith(endpoint)
      );

      if (token && requiresAuth) {
        // Attach the token to the headers
        config.headers.Authorization = `Token ${token}`;
        console.log('Token attached to request:', config.headers.Authorization); // Add logging
      } else {
        delete config.headers.Authorization;
        console.log('No token found');
      }
      return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
axiosInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Token ${token}`;
        console.log('Token attached to request:', token);
      } else {
        console.log('No token found');
      }
      return config;
    },
    (error) => Promise.reject(error)
);

export default axiosInstance;
