// src/pages/Dashboard.jsx

import React, { useEffect, useState, useContext, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { DateTime } from 'luxon';
import { AuthContext } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import {
  Typography,
  CircularProgress,
  Box,
  Paper,
  Chip,
  Container,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import WorkoutCard from '../components/WorkoutCard';
import ProgressChart from '../components/ProgressChart';
import ProgressionMetrics from '../components/ProgressionMetrics'; // Import ProgressionMetrics
import ErrorMessage from '../components/ErrorMessage';
import LogSessionForm from '../components/LogSessionForm';
import { processWorkoutPlan } from '../utils/processWorkoutPlan';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from '../components/ErrorBoundary';

const useStyles = makeStyles((theme) => ({
  dashboardContainer: {
    display: 'flex',
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  welcomeMessage: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginTop: 40,
    marginBottom: 20,
  },
  connectionStatus: {
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 1000,
  },
  spinnerContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '60vh',
    flexDirection: 'column',
  },
  loadingMessage: {
    fontSize: '1.2rem',
    color: '#555',
    marginTop: '20px',
  },
}));

function Dashboard() {
  const classes = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const { authToken, user, loading: authLoading } = useContext(AuthContext);
  const { latestWorkoutPlan, wsConnected, wsReconnecting } = useWebSocket();

  // State
  const [userData, setUserData] = useState(null);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState(null);
  const [isLoadingWorkoutPlan, setIsLoadingWorkoutPlan] = useState(true);

  // Error handling
  const handleFetchError = useCallback(
    (error) => {
      if (error.response?.status === 401) {
        setError('Session expired. Please log in again.');
        navigate('/login');
      } else if (error.response?.status === 404) {
        setError('No workout plans found. Create one to get started!');
      } else {
        setError('Unable to load dashboard. Please try again.');
      }
    },
    [navigate]
  );

  // Data fetching
  const fetchProgressData = useCallback(async () => {
    try {
      const response = await axiosInstance.get('user/progression/');
      setProgressData(response.data);
    } catch (error) {
      console.error('Error fetching progress data:', error);
      setError('Unable to fetch progress data.');
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!authToken) return;

    try {
      console.log('Fetching user data...');
      axiosInstance.defaults.headers['Authorization'] = `Token ${authToken}`;
      const userResponse = await axiosInstance.get('users/me/');
      console.log('User data fetched:', userResponse.data);
      setUserData(userResponse.data);

      console.log('Fetching workout plans...');
      const workoutPlansResponse = await axiosInstance.get('workout-plans/');
      console.log('Workout plans fetched:', workoutPlansResponse.data);

      if (workoutPlansResponse.data?.length > 0) {
        const sortedPlans = workoutPlansResponse.data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        const currentPlan = processWorkoutPlan(sortedPlans[0]);
        console.log('Current Plan after processing:', currentPlan);
        setWorkoutPlans([currentPlan]);
      } else {
        console.log('No workout plans found.');
      }

      setIsLoadingWorkoutPlan(false); // Hide spinner after fetching
      console.log('Fetching progress data...');
      await fetchProgressData();
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      handleFetchError(error);
    } finally {
      setLoading(false);
    }
  }, [authToken, fetchProgressData, handleFetchError]);

  useEffect(() => {
    const fetchWorkoutPlan = async () => {
      try {
        // If we have a workout plan from navigation state, use it
        if (location.state?.workoutPlan) {
          setWorkoutPlans([location.state.workoutPlan]);
          setIsLoadingWorkoutPlan(false);
          setLoading(false);
          return;
        }

        // Otherwise fetch from the API
        if (!authToken) return;

        const response = await axiosInstance.get('workout-plans/');
        if (response.data?.length > 0) {
          const sortedPlans = response.data.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );
          const currentPlan = processWorkoutPlan(sortedPlans[0]);
          setWorkoutPlans([currentPlan]);
        }
        setIsLoadingWorkoutPlan(false); // Hide spinner after fetching
        setLoading(false);
      } catch (err) {
        console.error('Error fetching workout plan:', err);
        setError('Failed to load workout plan. Please try again later.');
        setLoading(false);
      }
    };

    fetchWorkoutPlan();
  }, [location.state, authToken]);

  // Effect to fetch data on component mount and when authToken changes
  useEffect(() => {
    if (authLoading) return;

    if (!authToken) {
      navigate('/login');
      return;
    }

    fetchData();
  }, [authToken, authLoading, fetchData, navigate]);

  // Effect to handle latestWorkoutPlan from WebSocket
  useEffect(() => {
    if (latestWorkoutPlan) {
      console.log('Dashboard: Received latest workout plan:', latestWorkoutPlan);
      setWorkoutPlans(prevPlans => {
        // If it's an array, use it directly, otherwise wrap it in an array
        const newPlan = Array.isArray(latestWorkoutPlan) ? latestWorkoutPlan : [latestWorkoutPlan];
        return [...newPlan, ...prevPlans];
      });
      setIsLoadingWorkoutPlan(false);
    }
  }, [latestWorkoutPlan]);

  // Effect to handle initial data load
  useEffect(() => {
    if (authLoading) return;

    if (!authToken) {
      navigate('/login');
      return;
    }

    fetchData();
  }, [authToken, authLoading, fetchData, navigate]);

  // Session logging
  const handleSessionLoggedCallback = useCallback(
    (sessionData) => {
      console.log('Session logged:', sessionData);
      fetchProgressData();
    },
    [fetchProgressData]
  );

  // Workout helpers
  const getTodayWorkout = useCallback((workoutPlan) => {
    if (!workoutPlan?.workoutDays?.length) return null;

    const todayWeekday = DateTime.local().weekday;
    return (
      workoutPlan.workoutDays.find(
        (day) => day.dayNumber === todayWeekday && day.type === 'workout'
      ) || null
    );
  }, []);

  // Loading and error states
  if (loading || authLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
        <Typography variant="h6" style={{ marginLeft: '10px' }}>
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  // Get today's workout
  const todayWorkout =
    workoutPlans.length > 0 ? getTodayWorkout(workoutPlans[0]) : null;

  // Render
  return (
    <ErrorBoundary>
      <div className={classes.dashboardContainer}>
        <ToastContainer position="top-right" autoClose={5000} />

        <Chip
          className={classes.connectionStatus}
          color={wsConnected ? 'success' : wsReconnecting ? 'warning' : 'error'}
          label={
            wsConnected
              ? 'Connected'
              : wsReconnecting
              ? 'Reconnecting...'
              : 'Disconnected'
          }
        />

        <main className={classes.content}>
          {isLoadingWorkoutPlan ? (
            <Box className={classes.spinnerContainer}>
              <CircularProgress />
              <Typography variant="h6" className={classes.loadingMessage}>
                Generating your workout plan...
              </Typography>
            </Box>
          ) : (
            <>
              <Container maxWidth="lg">
                <Typography variant="h4" gutterBottom>
                  Welcome {userData?.first_name || userData?.username}!
                </Typography>

                {todayWorkout && Array.isArray(todayWorkout.exercises) ? (
                  <>
                    <Typography variant="h5" className={classes.sectionTitle}>
                      Today's Workout
                    </Typography>
                    <WorkoutCard
                      workouts={todayWorkout.exercises}
                      userName={userData?.first_name || userData?.username}
                    />

                    {/* Progress Chart placed below the exercise cards */}
                    <Typography variant="h5" className={classes.sectionTitle}>
                      Your Progress
                    </Typography>
                    <Paper elevation={3} style={{ padding: '20px', marginBottom: '20px' }}>
                      {progressData ? (
                        <ProgressChart progressData={progressData} />
                      ) : (
                        <Typography variant="body1">
                          Start logging your sessions to see progress.
                        </Typography>
                      )}
                    </Paper>

                    {/* Progression Metrics */}
                    <ProgressionMetrics />

                  </>
                ) : (
                  <Typography variant="body1">
                    {workoutPlans.length > 0
                      ? 'Today is a rest day. Take some time to recover!'
                      : 'You have no workout scheduled for today. Generate a new plan!'}
                  </Typography>
                )}

                <Box marginTop={4}>
                  <Typography variant="h5" className={classes.sectionTitle}>
                    Log a Workout Session
                  </Typography>
                  <Paper elevation={3} style={{ padding: '20px' }}>
                    <LogSessionForm
                      workoutPlans={workoutPlans}
                      source="dashboard"
                      onSessionLogged={handleSessionLoggedCallback}
                    />
                  </Paper>
                </Box>
              </Container>
            </>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default Dashboard;
