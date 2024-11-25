// src/App.js

import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from './context/AuthContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RegistrationPage from './pages/RegistrationPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import WorkoutPlan from './components/WorkoutPlan';
import AuthListener from './components/AuthListener';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import GeneratingWorkout from './pages/GeneratingWorkout';
import Logout from './pages/LogoutPage';
import NotFoundPage from './pages/NotFoundPage';
import TrainingSessionDetail from './pages/TrainingSessionDetail';
import LandingPage from './pages/LandingPage';
import TrainingSessionList from './pages/TrainingSessionList';
import './App.css';
import axiosInstance from './api/axiosInstance';
import { CircularProgress } from '@mui/material';

function App() {
  const { authToken, loading: authLoading } = useContext(AuthContext);
  const [initialWorkoutData, setInitialWorkoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWorkoutData = async () => {
      if (!authToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await axiosInstance.get('workout-plans/current/');
        console.log('Workout Plans Current Response:', response.data);

        if (response.data.workoutDays && response.data.workoutDays.length > 0) {
          setInitialWorkoutData(response.data);
        } else {
          setError('No workout plans available.');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching workout data:', err);
        setError('Failed to load workout data.');
        setLoading(false);
      }
    };

    fetchWorkoutData();
  }, [authToken]);

  if (loading || authLoading) {
    return (
      <div className="loading-container">
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  return (
    <Router>
      <Navbar />
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <AuthListener />
          <Routes>
            <Route
              path="/"
              element={
                authToken ? <Navigate to="/dashboard" replace /> : <LandingPage />
              }
            />
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
              path="/workout-plans"
              element={
                <ProtectedRoute>
                  <WorkoutPlan
                    initialWorkoutData={initialWorkoutData}
                    username={authToken ? authToken.username : ''}
                  />
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
            <Route path="/logout" element={<Logout />} />
            <Route path="/generating-workout" element={<GeneratingWorkout />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
