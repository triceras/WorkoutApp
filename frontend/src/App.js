// src/App.js

//import React from 'react';
import { useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import RegistrationPage from './pages/RegistrationPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import WorkoutPlan from './components/WorkoutPlan';
import Navbar from './components/Navbar'; // Import Navbar
import { AuthProvider, AuthContext } from './context/AuthContext'; // Import AuthProvider and AuthContext
import axiosInstance from './api/axiosInstance'; // Ensure axiosInstance is imported

function App() {
  return (
    <AuthProvider> {/* Wrap the entire app with AuthProvider */}
      <Router>
        <Navbar /> {/* Navbar is always rendered except on Login and Register pages */}
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route
            path="/workout-plan"
            element={
              <ProtectedRoute>
                <WorkoutPlan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/logout"
            element={
              <ProtectedRoute>
                <Logout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

const Logout = () => {
  const { logout } = useContext(AuthContext); // Correct: Use AuthContext
  const navigate = useNavigate();
  const [error, setError] = useState(null); // State to handle errors

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Send POST request to backend to logout
        await axiosInstance.post('logout/');
      } catch (error) {
        console.error('Error during logout:', error);
        setError('Failed to logout. Please try again.');
      } finally {
        // Call logout from context to clear auth state
        logout();
        // Redirect to login page
        navigate('/login');
      }
    };

    performLogout();
  }, [logout, navigate]);

  return (
    <div>
      {error ? <p style={{ color: 'red' }}>{error}</p> : <p>Logging out...</p>}
    </div>
  );
};

export default App;
