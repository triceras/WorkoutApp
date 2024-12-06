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
import { toast } from 'react-toastify';

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
  const { connected: wsConnected, reconnecting: wsReconnecting, latestWorkoutPlan } = useWebSocket();

  // State
  const [userData, setUserData] = useState(null);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const fetchUserData = useCallback(async () => {
    try {
      const response = await axiosInstance.get('users/me/');
      return response.data;
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Unable to fetch user data.');
    }
  }, []);

  const fetchWorkoutPlan = useCallback(async () => {
    try {
      console.log('Dashboard: Fetching workout plan from API');
      const response = await axiosInstance.get('workout-plans/');
      
      if (response.data && response.data.length > 0) {
        console.log('Dashboard: Workout plans fetched successfully:', response.data);
        setWorkoutPlans(response.data);
        setIsLoadingWorkoutPlan(false);
      } else {
        console.log('Dashboard: No workout plans found, waiting for WebSocket update...');
        // Don't navigate away immediately, wait for WebSocket updates
        setWorkoutPlans([]);
      }
    } catch (error) {
      console.error('Error fetching workout plans:', error);
      if (error.response?.status === 404) {
        console.log('Dashboard: No workout plans found (404)');
        // Don't navigate away immediately, wait for WebSocket updates
        setWorkoutPlans([]);
      } else {
        setError('Failed to fetch workout plans');
        setIsLoadingWorkoutPlan(false);
      }
    }
  }, []);

  // Listen for WebSocket updates with workout plan
  useEffect(() => {
    console.log('Dashboard: WebSocket update received:', { latestWorkoutPlan });
    if (latestWorkoutPlan) {
      console.log('Dashboard: New workout plan received via WebSocket');
      setWorkoutPlans(prevPlans => {
        // Check if plan already exists
        const exists = prevPlans.some(plan => plan.id === latestWorkoutPlan.id);
        if (!exists) {
          return [latestWorkoutPlan, ...prevPlans];
        }
        return prevPlans;
      });
      setIsLoadingWorkoutPlan(false);
    }
  }, [latestWorkoutPlan]);

  // Workout helpers
  const getTodayWorkout = useCallback((workoutPlan) => {
    if (!workoutPlan || !workoutPlan.workoutDays) {
      console.log('No workout plan or workoutDays available');
      return null;
    }

    try {
      // Get today and set to start of day
      const today = DateTime.now().startOf('day');
      
      // Get the current day of the week (1-7, Monday is 1)
      const currentDayOfWeek = today.weekday;

      // Adjust index to 0-based (Monday = 0, Sunday = 6)
      const currentDayIndex = currentDayOfWeek - 1;
      
      console.log('Workout calculation:', {
        today: today.toISO(),
        currentDayOfWeek,
        currentDayIndex,
        weekday: today.weekdayLong,
        totalDays: workoutPlan.workoutDays.length,
        workoutPlan: {
          workoutDaysCount: workoutPlan.workoutDays?.length
        }
      });

      // Return the workout for today
      return workoutPlan.workoutDays[currentDayIndex];
    } catch (error) {
      console.error('Error calculating today\'s workout:', error);
      return null;
    }
  }, []);

  // Effect to update current workout whenever workout plans change
  useEffect(() => {
    if (workoutPlans.length > 0) {
      const todayWorkout = getTodayWorkout(workoutPlans[0]);
      setCurrentWorkout(todayWorkout);
      console.log('Updated current workout:', todayWorkout);
    }
  }, [workoutPlans, getTodayWorkout]);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading || !authToken || !user) {
        return;
      }

      console.log('Dashboard: Fetching initial data');
      try {
        console.log('Fetching user data...');
        const userResponse = await fetchUserData();
        console.log('User data fetched:', userResponse);
        setUserData(userResponse);

        console.log('Fetching workout plans...');
        await fetchWorkoutPlan();

        console.log('Fetching progress data...');
        const progressResponse = await fetchProgressData();
        setProgressData(progressResponse);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authToken, user, authLoading, fetchUserData, fetchWorkoutPlan, fetchProgressData]);

  // Session logging
  const handleSessionLoggedCallback = useCallback(
    (sessionData) => {
      console.log('Session logged:', sessionData);
      fetchProgressData();
    },
    [fetchProgressData]
  );

  // Handle loading and error states
  if (loading) {
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

  // If no workout plans and not loading, show a message
  if (workoutPlans.length === 0 && !isLoadingWorkoutPlan) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Generating Your Workout Plan</h2>
          <CircularProgress />
          <p className="mt-4">
            Your personalized workout plan is being created. Please wait...
          </p>
          {!wsConnected && (
            <p className="mt-2 text-sm text-red-500">
              Reconnecting to server...
            </p>
          )}
        </div>
      </Box>
    );
  }

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
                {workoutPlans.length === 0 
                  ? "Generating your personalized workout plan..."
                  : "Loading workout plan..."}
              </Typography>
            </Box>
          ) : (
            <>
              <Container maxWidth="lg">
                <Typography variant="h4" gutterBottom>
                  Welcome {userData?.first_name || userData?.username}!
                </Typography>

                {currentWorkout && Array.isArray(currentWorkout.exercises) ? (
                  <>
                    <Typography variant="h5" className={classes.sectionTitle}>
                      Today's Workout
                    </Typography>
                    <WorkoutCard
                      workouts={currentWorkout.exercises}
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
