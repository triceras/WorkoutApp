// frontend/src/api/axiosInstance.js

import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api/', // Adjust baseURL as needed
});

// Request interceptor to attach the token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    const nonAuthEndpoints = ['register/', 'auth/login/', 'auth/verify-token/'];
    const requiresAuth = !nonAuthEndpoints.some((endpoint) => config.url.endsWith(endpoint));

    if (token && requiresAuth) {
      config.headers.Authorization = `Token ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Optional: Response interceptor for handling global responses
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors globally if needed
    return Promise.reject(error);
  }
);

export default axiosInstance;
