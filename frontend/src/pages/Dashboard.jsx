// src/pages/Dashboard.jsx

import React, { useEffect, useState, useContext, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import WorkoutPlan from '../components/WorkoutPlan';
import LogSessionForm from '../components/LogSessionForm';
import ErrorMessage from '../components/ErrorMessage';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Typography, Container, CircularProgress, Box } from '@mui/material';
import './Dashboard.css';

function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const socketRef = React.useRef(null);

  const { authToken, loading: authLoading } = useContext(AuthContext);

  const handleSessionLogged = (sessionData) => {
    console.log('Session logged:', sessionData);
    // Handle session logged actions if needed
  };

  const setupWebSocket = useCallback(
    (user) => {
      if (!user || !authToken) return;

      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${window.location.hostname}:8001/ws/workout-plan/?token=${authToken}`;

      const socket = new ReconnectingWebSocket(wsUrl);

      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connection opened.');
      };

      socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        console.log('WebSocket message received:', data);

        if (data.type === 'workout_plan_generated') {
          setWorkoutPlans((prevPlans) => {
            const updatedPlan = {
              id: data.plan_id || prevPlans[0]?.id,
              user: user.id,
              plan_data: data.plan_data,
            };

            return [updatedPlan];
          });
        }
      };

      socket.onclose = () => {
        console.log('WebSocket connection closed.');
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    },
    [authToken]
  );

  useEffect(() => {
    if (authLoading) return;

    if (!authToken) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        axiosInstance.defaults.headers['Authorization'] = `Token ${authToken}`;

        const userResponse = await axiosInstance.get('user/');
        setUserData(userResponse.data);

        const workoutPlansResponse = await axiosInstance.get('workout-plans/');
        if (workoutPlansResponse.data && workoutPlansResponse.data.length > 0) {
          setWorkoutPlans(workoutPlansResponse.data);
        } else {
          setError('No workout plans available.');
        }

        setupWebSocket(userResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        if (error.response) {
          if (error.response.status === 404) {
            setError('No workout plans found. Please create one.');
          } else if (error.response.status === 401) {
            setError('Unauthorized access. Please log in again.');
            navigate('/login');
          } else {
            setError('An error occurred while fetching data.');
          }
        } else {
          setError('Network error. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [navigate, authToken, authLoading, setupWebSocket]);

  if (loading || authLoading) {
    return (
      <Box className="dashboard-loading">
        <CircularProgress />
        <Typography variant="h6" style={{ marginTop: '20px' }}>
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!workoutPlans || workoutPlans.length === 0 || !workoutPlans[0].id) {
    return (
      <Container maxWidth="md">
        <Typography variant="h5" align="center" color="textSecondary">
          No valid workout plans available.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" className="dashboard-container">
      <Typography variant="h4" className="welcome-message">
        Welcome, {userData?.first_name || userData?.username || 'Valued User'}
      </Typography>
      {workoutPlans.length > 0 ? (
        <>
          <WorkoutPlan
            initialWorkoutData={workoutPlans[0].plan_data}
            username={userData?.first_name || userData?.username}
          />

          <LogSessionForm
            workoutPlans={workoutPlans}
            onSessionLogged={handleSessionLogged}
          />
        </>
      ) : (
        <Typography variant="h6" align="center" color="textSecondary">
          No workout plans available.
        </Typography>
      )}
    </Container>
  );
}

export default Dashboard;
