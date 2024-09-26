// src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RegistrationPage from './pages/RegistrationPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import WorkoutPlan from './components/WorkoutPlan';

function App() {
  return (
    <Router>
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
      </Routes>
    </Router>
  );
}

export default App;
