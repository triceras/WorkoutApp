// src/App.js

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import RegistrationPage from './pages/RegistrationPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import WorkoutPlan from './components/WorkoutPlan';
import axiosInstance from './api/axiosInstance'; // Ensure this path is correct
import Navbar from './components/Navbar'; // Import Navbar

function App() {
  // Define the Logout component inside App.js
  const Logout = () => {
    const navigate = useNavigate();

    useEffect(() => {
      const performLogout = async () => {
        try {
          // Send POST request to backend to logout
          await axiosInstance.post('logout/');
        } catch (error) {
          console.error('Error during logout:', error);
          // Optionally, handle specific error messages or display to the user
        } finally {
          // Remove the auth token from local storage
          localStorage.removeItem('authToken');
          // Redirect to login page
          navigate('/login');
        }
      };

      performLogout();
    }, [navigate]);

    return <div>Logging out...</div>;
  };

  return (
    <Router>
      <Navbar /> {/* Include Navbar at the top */}
      <Routes>
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route
          path="/workout-plan"
          element={
            <PrivateRoute>
              <WorkoutPlan />
            </PrivateRoute>
          }
        />
        <Route
          path="/logout"
          element={
            <PrivateRoute>
              <Logout />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
