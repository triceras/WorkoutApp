// src/pages/Dashboard.jsx

import React, { useEffect, useState, useContext, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { DateTime } from 'luxon';
import { AuthContext } from '../context/AuthContext';
import {
  Typography,
  CircularProgress,
  Box,
  Grid,
  Paper,
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

const useStyles = makeStyles((theme) => ({
  dashboardContainer: {
    display: 'flex',
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  welcomeMessage: {
    marginBottom: theme.spacing(2),
  },
  sectionTitle: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(2),
  },
}));

function Dashboard() {
  const classes = useStyles();

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [userData, setUserData] = useState(null);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState(null);

  const navigate = useNavigate();
  const socketRef = React.useRef(null);
  const { authToken, loading: authLoading } = useContext(AuthContext);

  const handleSessionLogged = (sessionData) => {
    console.log('Session logged:', sessionData);
    // Update progress data after a session is logged
    fetchProgressData();
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
            let updatedPlan = {
              id: data.plan_id || prevPlans[0]?.id,
              user: user.id,
              workoutDays: data.plan_data,
              additionalTips:
                data.additional_tips || prevPlans[0]?.additionalTips || [],
              created_at: data.created_at || new Date().toISOString(),
            };

            // Process the workout plan
            updatedPlan = processWorkoutPlan(updatedPlan);

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

  const fetchProgressData = useCallback(async () => {
    try {
      const response = await axiosInstance.get('user/progression/');
      setProgressData(response.data);
    } catch (error) {
      console.error('Error fetching progress data:', error);
      setError('Unable to fetch progress data.');
    }
  }, []);

  // Fetch data function
  const fetchData = useCallback(async () => {
    try {
      axiosInstance.defaults.headers['Authorization'] = `Token ${authToken}`;

      const userResponse = await axiosInstance.get('user/');
      setUserData(userResponse.data);

      const workoutPlansResponse = await axiosInstance.get('workout-plans/');

      if (
        workoutPlansResponse.data &&
        workoutPlansResponse.data.length > 0
      ) {
        // Sort the workout plans by created_at date descending
        const sortedPlans = workoutPlansResponse.data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        // Process the most recent workout plan
        let currentPlan = sortedPlans[0];
        currentPlan = processWorkoutPlan(currentPlan);

        setWorkoutPlans([currentPlan]);

        console.log('Processed Workout Plan:', currentPlan);
      } else {
        setError('No workout plans available.');
      }

      await fetchProgressData();
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
  }, [authToken, navigate, fetchProgressData, setupWebSocket]);

  // useEffect for fetching data
  useEffect(() => {
    if (authLoading) return;

    if (!authToken) {
      navigate('/login');
      return;
    }

    fetchData();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [authToken, authLoading, fetchData, navigate]);

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

  const getTodayWorkout = (workoutPlan) => {
    if (
      !workoutPlan ||
      !workoutPlan.workoutDays ||
      workoutPlan.workoutDays.length === 0
    ) {
      return null;
    }

    const todayWeekday = DateTime.local().weekday; // 1 (Monday) to 7 (Sunday)
    const todayWorkoutDay = workoutPlan.workoutDays.find(
      (day) => day.dayNumber === todayWeekday
    );

    if (todayWorkoutDay && todayWorkoutDay.type === 'workout') {
      return todayWorkoutDay;
    } else {
      return null; // Rest day or no workout scheduled
    }
  };

  const todayWorkout =
    workoutPlans.length > 0 ? getTodayWorkout(workoutPlans[0]) : null;

  // Log the workoutPlans and progressData to ensure they contain the expected data
  console.log('workoutPlans:', workoutPlans);
  if (workoutPlans.length > 0) {
    console.log('workoutDays:', workoutPlans[0].workoutDays);
    console.log('todayWorkout:', todayWorkout);
  }

  return (
    <div className={classes.dashboardContainer}>
      {/* Sidebar */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Main Content */}
      <main className={classes.content}>
        <Grid container spacing={4}>
          {/* Today's Workout */}
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

          {/* Progress Chart */}
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

        {/* Log Session Form */}
        <Box marginTop={4}>
          <Typography variant="h5" className={classes.sectionTitle}>
            Log a Workout Session
          </Typography>
          <Paper elevation={3} style={{ padding: '20px' }}>
            <LogSessionForm
              workoutPlans={workoutPlans}
              source="dashboard"
              onSessionLogged={handleSessionLogged}
            />
          </Paper>
        </Box>
      </main>
    </div>
  );
}

export default Dashboard;
