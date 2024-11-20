// src/App.js

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RegistrationPage from './pages/RegistrationPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import WorkoutPlan from './components/WorkoutPlan';
import AuthListener from './components/AuthListener';
import Navbar from './components/Navbar'; // Import Navbar
import Sidebar from './components/Sidebar'; // Import Sidebar
import { AuthProvider } from './context/AuthContext';
import GeneratingWorkout from './pages/GeneratingWorkout';
import Logout from './pages/LogoutPage'; // Import LogoutPage
import NotFoundPage from './pages/NotFoundPage'; // Ensure this exists
import TrainingSessionDetail from './pages/TrainingSessionDetail';
import TrainingSessionList from './pages/TrainingSessionList';
import './App.css'; // Import any global CSS needed

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <AuthProvider> {/* Wrap the entire app with AuthProvider */}
      <Router> {/* Wrap routing components within Router */}
        <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        <div className="app-container">
          <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
          <div className="main-content">
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
                path="/training_sessions"
                element={
                  <ProtectedRoute>
                    <TrainingSessionList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/training_sessions/:id"
                element={
                  <ProtectedRoute>
                    <TrainingSessionDetail />
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
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div> {/* End of main-content */}
        </div> {/* End of app-container */}
      </Router>
    </AuthProvider>
  );
}

export default App;
