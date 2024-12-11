// src/App.js

import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from './context/AuthContext';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  createRoutesFromElements,
  createBrowserRouter,
} from 'react-router-dom';
import RegistrationPage from './pages/RegistrationPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import WorkoutPlan from './components/WorkoutPlan';
import AuthListener from './components/AuthListener';
import Navbar from './components/Navbar';
import GeneratingWorkout from './pages/GeneratingWorkout';
import NotFoundPage from './pages/NotFoundPage';
import TrainingSessionDetail from './pages/TrainingSessionDetail';
import LandingPage from './pages/LandingPage';
import TrainingSessionList from './pages/TrainingSessionList';
import './App.css';
import { CircularProgress } from '@mui/material';
import { WebSocketProvider } from './context/WebSocketContext';

// Configure future flags
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      {/* Your routes here */}
    </Route>
  ),
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

function App() {
  const { authToken, loading: authLoading } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authToken) {
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [authToken]);

  if (loading || authLoading) {
    return (
      <div className="loading-container">
        <CircularProgress />
      </div>
    );
  }

  return (
    <Router future={{ 
      v7_startTransition: true,
      v7_relativeSplatPath: true 
    }}>
      <WebSocketProvider>
        <Navbar />
        <div className="app-container">
          <div className="main-content">
            <AuthListener />
            <Routes>
              <Route
                path="/"
                element={
                  authToken ? <Navigate to="/dashboard" replace /> : <LandingPage />
                }
              />
              <Route 
                path="/login" 
                element={
                  authToken ? <Navigate to="/dashboard" replace /> : <LoginPage />
                }
              />
              <Route 
                path="/register" 
                element={
                  authToken ? <Navigate to="/dashboard" replace /> : <RegistrationPage />
                }
              />
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
                path="/workout-plans"
                element={
                  <ProtectedRoute>
                    <WorkoutPlan />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/training-sessions"
                element={
                  <ProtectedRoute>
                    <TrainingSessionList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/training-session/:id"
                element={
                  <ProtectedRoute>
                    <TrainingSessionDetail />
                  </ProtectedRoute>
                }
              />
              <Route path="/generating-workout" element={<GeneratingWorkout />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </WebSocketProvider>
    </Router>
  );
}

export default App;
