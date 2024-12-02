// src/pages/Dashboard.jsx

import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';
import { DateTime } from 'luxon';
import { AuthContext } from '../context/AuthContext';
import {
  Typography,
  CircularProgress,
  Box,
  Grid,
  Paper,
  Chip,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import WorkoutCard from '../components/WorkoutCard';
import ProgressChart from '../components/ProgressChart';
import ErrorMessage from '../components/ErrorMessage';
import ReconnectingWebSocket from 'reconnecting-websocket';
import LogSessionForm from '../components/LogSessionForm';
import { processWorkoutPlan } from '../utils/processWorkoutPlan';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from '../components/ErrorBoundary'; // Import ErrorBoundary

const MAX_RETRIES = 5;

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
    flexDirection: 'column', // Stack spinner and message vertically
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
  const { authToken, loading: authLoading } = useContext(AuthContext);

  // State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userData, setUserData] = useState(null);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsReconnecting, setWsReconnecting] = useState(false);
  const [isLoadingWorkoutPlan, setIsLoadingWorkoutPlan] = useState(true); // New state for spinner

  // Refs
  const socketRef = useRef(null);
  const socketInitializedRef = useRef(false);

  // Error handling
  const handleFetchError = useCallback((error) => {
    if (error.response?.status === 401) {
      setError('Session expired. Please log in again.');
      navigate('/login');
    } else if (error.response?.status === 404) {
      setError('No workout plans found. Create one to get started!');
    } else {
      setError('Unable to load dashboard. Please try again.');
    }
  }, [navigate]);

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
      axiosInstance.defaults.headers['Authorization'] = `Token ${authToken}`;
      const userResponse = await axiosInstance.get('user/');
      setUserData(prevUserData => {
        if (JSON.stringify(prevUserData) !== JSON.stringify(userResponse.data)) {
          return userResponse.data;
        }
        return prevUserData;
      });

      const workoutPlansResponse = await axiosInstance.get('workout-plans/');
      if (workoutPlansResponse.data?.length > 0) {
        const sortedPlans = workoutPlansResponse.data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        const currentPlan = processWorkoutPlan(sortedPlans[0]);
        setWorkoutPlans(prevPlans => {
          if (JSON.stringify(prevPlans[0]) !== JSON.stringify(currentPlan)) {
            return [currentPlan];
          }
          return prevPlans;
        });
        console.log('Processed Workout Plan:', currentPlan);
        setIsLoadingWorkoutPlan(false); // Workout plan fetched, hide spinner
      } else {
        setIsLoadingWorkoutPlan(false); // No workout plan exists, hide spinner
      }

      await fetchProgressData();
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      handleFetchError(error);
    } finally {
      setLoading(false);
    }
  }, [authToken, fetchProgressData, handleFetchError]);

  // WebSocket handlers
  const handleWebSocketMessage = useCallback((data, user) => {
    if (data.type === 'workout_plan_generated') {
      const updatedPlan = {
        id: data.plan_id,
        user: user.id,
        workoutDays: data.plan_data || [],
        additionalTips: data.additional_tips || [],
        created_at: data.created_at || new Date().toISOString(),
      };
  
      const processedPlan = processWorkoutPlan(updatedPlan);
      setWorkoutPlans([processedPlan]);
      setIsLoadingWorkoutPlan(false); // Workout plan received, hide spinner
      toast.success('New workout plan received!');
      fetchData();
    }
  }, [fetchData]);

  const setupWebSocket = useCallback((user) => {
    if (!user || !authToken || socketInitializedRef.current) return;

    socketInitializedRef.current = true;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const port = process.env.NODE_ENV === 'development' ? '8001' : window.location.port; // Updated port
    const host = process.env.NODE_ENV === 'development'
      ? `localhost:${port}` 
      : window.location.host;
    const wsUrl = `${protocol}://${host}/ws/workout-plan/?token=${authToken}`;
  
    console.log('Attempting WebSocket connection to:', wsUrl);

    // Close existing socket if any
    if (socketRef.current) {
      console.log('Closing existing WebSocket connection');
      socketRef.current.close();
    }

    // Initialize ReconnectingWebSocket with desired options
    const socket = new ReconnectingWebSocket(wsUrl, [], {
      debug: process.env.NODE_ENV === 'development',
      reconnectionDelayGrowFactor: 1.3,
      maxReconnectionDelay: 10000,
      minReconnectionDelay: 1000,
      maxRetries: MAX_RETRIES,
      automaticOpen: true,
    });

    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connection established');
      setWsConnected(true);
      setWsReconnecting(false);
      toast.success('Connected to server');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        handleWebSocketMessage(data, user);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        toast.error('Error updating workout plan');
      }
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
      setWsConnected(false);
      setWsReconnecting(true);
      toast.warning('Connection lost. Reconnecting...');
      socketInitializedRef.current = false;
      // No manual reconnection logic; ReconnectingWebSocket handles it
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error('Connection error - check server status');
    };

    // Cleanup function
    return () => {
      console.log('Cleaning up WebSocket connection');
      socketInitializedRef.current = false;
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [authToken, handleWebSocketMessage]);

  // Effects
  useEffect(() => {
    if (authLoading) return;

    if (!authToken) {
      navigate('/login');
      return;
    }

    fetchData();
  }, [authToken, authLoading, fetchData, navigate]);

  useEffect(() => {
    if (userData) {
      const cleanup = setupWebSocket(userData);
      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [userData, setupWebSocket]);

  // Session logging
  const handleSessionLoggedCallback = useCallback((sessionData) => {
    console.log('Session logged:', sessionData);
    fetchProgressData();
  }, [fetchProgressData]);

  // Workout helpers
  const getTodayWorkout = useCallback((workoutPlan) => {
    if (!workoutPlan?.workoutDays?.length) return null;

    const todayWeekday = DateTime.local().weekday;
    return workoutPlan.workoutDays.find(
      (day) => day.dayNumber === todayWeekday && day.type === 'workout'
    ) || null;
  }, []);

  // Loading and error states
  if (loading || authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
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
  const todayWorkout = workoutPlans.length > 0 ? getTodayWorkout(workoutPlans[0]) : null;

  // Render
  return (
    <ErrorBoundary>
      <div className={classes.dashboardContainer}>
        <ToastContainer position="top-right" autoClose={5000} />

        <Chip
          className={classes.connectionStatus}
          color={wsConnected ? 'success' : wsReconnecting ? 'warning' : 'error'}
          label={wsConnected ? 'Connected' : wsReconnecting ? 'Reconnecting...' : 'Disconnected'}
        />

        <Sidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
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
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h5" className={classes.sectionTitle}>
                  Today's Workout
                </Typography>
                {todayWorkout ? (
                  <WorkoutCard
                    workouts={todayWorkout.exercises}
                    userName={userData?.first_name || userData?.username}
                  />
                ) : (
                  <Typography variant="body1">
                    {workoutPlans.length > 0
                      ? 'Today is a rest day. Take some time to recover!'
                      : 'You have no workout scheduled for today. Generate a new plan!'}
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h5" className={classes.sectionTitle}>
                  Your Progress
                </Typography>
                <Paper elevation={3} style={{ padding: '20px' }}>
                  {progressData ? (
                    <ProgressChart progressData={progressData} />
                  ) : (
                    <Typography variant="body1">
                      Start logging your sessions to see progress.
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
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
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default Dashboard;
