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
  Grid,
  Card,
  CardContent
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
import RestDaySuggestions from '../components/RestDaySuggestions';

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
  const { latestWorkoutPlan, latestFeedbackAnalysis } = useWebSocket();

  // State
  const [userData, setUserData] = useState(null);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [isLoadingWorkoutPlan, setIsLoadingWorkoutPlan] = useState(true);
  const [sessionFeedback, setSessionFeedback] = useState(null);


  const openVideoModal = (videoUrl) => {
    window.open(videoUrl, '_blank');
    console.log('Opening video modal:', videoUrl);
  };


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
      const response = await axiosInstance.get('workout-plans/current/');
      
      if (response.data) {
        console.log('Dashboard: Workout plan fetched successfully:', response.data);
        const processedPlan = processWorkoutPlan(response.data);
        console.log('Dashboard: Processed workout plan:', processedPlan);
        setWorkoutPlans([processedPlan]);
        setIsLoadingWorkoutPlan(false);
      } else {
        console.log('Dashboard: No workout plan found, waiting for WebSocket update...');
        setWorkoutPlans([]);
      }
    } catch (error) {
      console.error('Error fetching workout plan:', error);
      if (error.response?.status === 404) {
        console.log('Dashboard: No workout plan found (404)');
        setWorkoutPlans([]);
      } else {
        setError('Failed to fetch workout plan');
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

  // Listen for feedback analysis updates
  useEffect(() => {
    const handleFeedbackAnalysis = (event) => {
      const { sessionId, feedbackData } = event.detail;
      setSessionFeedback(feedbackData);
      toast.success('Workout feedback analysis updated');
    };

    window.addEventListener('workoutFeedbackAnalyzed', handleFeedbackAnalysis);
    return () => {
      window.removeEventListener('workoutFeedbackAnalyzed', handleFeedbackAnalysis);
    };
  }, []);

  // Update feedback when received through WebSocket context
  useEffect(() => {
    if (latestFeedbackAnalysis) {
      setSessionFeedback(latestFeedbackAnalysis);
    }
  }, [latestFeedbackAnalysis]);

  // Process workout plans and set current workout
  useEffect(() => {
    if (workoutPlans && workoutPlans.length > 0) {
      const today = DateTime.now().setZone('Australia/Sydney');
      const currentPlan = workoutPlans[0];  // Get most recent plan
      
      if (currentPlan.workouts) {
        const todayWorkout = currentPlan.workouts.find(workout => {
          const workoutDate = DateTime.fromISO(workout.date);
          return workoutDate.hasSame(today, 'day');
        });

        console.log('Setting current workout:', todayWorkout);
        setCurrentWorkout(todayWorkout);
      }
    }
  }, [workoutPlans]);

  // Workout helpers
  const getTodayWorkout = useCallback((workoutPlan) => {
    try {
      if (!workoutPlan?.workoutDays) {
        return null;
      }

      const today = DateTime.now().setZone('Australia/Sydney');
      
      // Get the current day of the week (1-7, Monday is 1)
      const currentDayOfWeek = today.weekday;
      
      // Map Luxon's weekday (1-7, Mon-Sun) to array index (0-6, Mon-Sun)
      const currentDayIndex = (currentDayOfWeek - 1) % 7;
      
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
    if (workoutPlans?.length > 0 && workoutPlans[0]?.workoutDays) {
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
  const handleSessionLogged = (sessionData) => {
    // Dispatch a custom event when a session is logged
    const event = new CustomEvent('session-logged', { detail: sessionData });
    window.dispatchEvent(event);
    console.log('Session logged event dispatched:', sessionData);
    
    // Show success message or update UI as needed
    // You can add a snackbar or toast notification here
    console.log('Session logged:', sessionData);
    // Refresh progress data
    fetchProgressData();
    // Show success message
    toast.success('Workout session logged successfully!');
  };

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
        </div>
      </Box>
    );
  }

  // Render
  return (
    <ErrorBoundary>
      <div className={classes.dashboardContainer}>
        <ToastContainer position="top-right" autoClose={5000} />

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

                {sessionFeedback && (
                  <Card sx={{ mb: 4 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Latest Workout Analysis
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" color="primary">
                          Rating: {sessionFeedback.rating}
                        </Typography>
                      </Box>
                      <Typography variant="body1" paragraph>
                        {sessionFeedback.analysis}
                      </Typography>
                      {sessionFeedback.recommendations && (
                        <>
                          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                            Recommendations for Next Workout:
                          </Typography>
                          <Typography variant="body1">
                            {sessionFeedback.recommendations}
                          </Typography>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {currentWorkout && (
                  <React.Fragment>
                    <Paper elevation={0} sx={{
                      p: 3,
                      mb: 4,
                      background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
                      border: '1px solid rgba(75, 0, 130, 0.1)',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2.5,
                    }}>
                      <Box sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #6B46C1 0%, #553C9A 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 16px rgba(107, 70, 193, 0.2)',
                      }}>
                        <span style={{ fontSize: '40px' }}>🎯</span>
                      </Box>
                      <Box>
                        <Typography variant="overline" sx={{
                          color: '#6B46C1',
                          fontWeight: 700,
                          letterSpacing: '2px',
                          fontSize: '0.875rem',
                        }}>
                          TODAY'S WORKOUT
                        </Typography>
                        <Typography variant="h4" sx={{
                          fontWeight: 800,
                          color: '#2D3748',
                          marginTop: '4px',
                          fontSize: '2rem',
                          lineHeight: 1.2,
                        }}>
                          {currentWorkout.name || "Day 1: Upper Body Strength"}
                        </Typography>
                      </Box>
                    </Paper>
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                      <Grid item xs={12} sm={6}>
                        <Paper elevation={0} sx={{
                          p: 3,
                          height: '100%',
                          background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)',
                          border: '1px solid rgba(33, 150, 243, 0.1)',
                          borderRadius: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2.5,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 12px 28px rgba(33, 150, 243, 0.15)',
                          }
                        }}>
                          <Box sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 16px rgba(33, 150, 243, 0.2)',
                          }}>
                            <span style={{ fontSize: '32px' }}>💪</span>
                          </Box>
                          <Box>
                            <Typography variant="overline" sx={{
                              color: '#1976d2',
                              fontWeight: 700,
                              letterSpacing: '1.5px',
                              fontSize: '0.75rem',
                            }}>
                              WORKOUT TYPE
                            </Typography>
                            <Typography variant="h6" sx={{
                              fontWeight: 700,
                              color: '#1a237e',
                              marginTop: '4px',
                            }}>
                              {currentWorkout.workout_type}
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Paper elevation={0} sx={{
                          p: 3,
                          height: '100%',
                          background: 'linear-gradient(135deg, #fce4ec 0%, #ffffff 100%)',
                          border: '1px solid rgba(233, 30, 99, 0.1)',
                          borderRadius: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2.5,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 12px 28px rgba(233, 30, 99, 0.15)',
                          }
                        }}>
                          <Box sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #e91e63 0%, #c2185b 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 16px rgba(233, 30, 99, 0.2)',
                          }}>
                            <span style={{ fontSize: '32px' }}>⏱️</span>
                          </Box>
                          <Box>
                            <Typography variant="overline" sx={{
                              color: '#c2185b',
                              fontWeight: 700,
                              letterSpacing: '1.5px',
                              fontSize: '0.75rem',
                            }}>
                              DURATION
                            </Typography>
                            <Typography variant="h6" sx={{
                              fontWeight: 700,
                              color: '#880e4f',
                              marginTop: '4px',
                            }}>
                              {currentWorkout.duration}
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    </Grid>
                    <WorkoutCard
                      workouts={currentWorkout.exercises}
                      userName={userData?.first_name || userData?.username}
                      openVideoModal={openVideoModal}
                    />
                  </React.Fragment>
                )}

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

                <Box marginTop={4}>
                  <Paper elevation={3} style={{ padding: '20px' }}>
                    {workoutPlans && workoutPlans.length > 0 ? (
                      <LogSessionForm
                        workoutPlans={workoutPlans}
                        currentWorkout={currentWorkout}
                        source="dashboard"
                        onSessionLogged={handleSessionLogged}
                        isLoading={isLoadingWorkoutPlan}
                      />
                    ) : (
                      <Typography variant="body1" color="textSecondary">
                        No workout plans available. Generate a workout plan to start logging sessions.
                      </Typography>
                    )}
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
