// src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RegistrationPage from './pages/RegistrationPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import WorkoutPlan from './components/WorkoutPlan';
import AuthListener from './components/AuthListener';
import Navbar from './components/Navbar'; // Import Navbar
import { AuthProvider } from './context/AuthContext';
import GeneratingWorkout from './pages/GeneratingWorkout';
import Logout from './pages/LogoutPage'; // Import LogoutPage
import NotFoundPage from './pages/NotFoundPage'; // Ensure this exists

function App() {
  return (
    <AuthProvider> {/* Wrap the entire app with AuthProvider */}
      <Router> {/* Wrap routing components within Router */}
        <Navbar /> {/* Navbar is always rendered except on Login and Register pages */}
        <AuthListener />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workout-plan"
            element={
              <ProtectedRoute>
                <WorkoutPlan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/generating-workout"
            element={<GeneratingWorkout />}
          />
          <Route
            path="/logout"
            element={
              <ProtectedRoute>
                <Logout />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
