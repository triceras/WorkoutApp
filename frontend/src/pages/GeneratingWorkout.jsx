// src/components/GeneratingWorkout.jsx

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext'; // Assuming useAuth is imported from AuthContext
import { Box, CircularProgress, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh',
    padding: theme.spacing(2),
  },
  loadingText: {
    marginTop: theme.spacing(2),
    textAlign: 'center',
  },
}));

const GeneratingWorkout = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const { latestWorkoutPlan, wsConnected } = useWebSocket();
  const { authToken, user } = useAuth();

  useEffect(() => {
    // Check authentication
    if (!authToken || !user) {
      console.log('GeneratingWorkout: No authentication, redirecting to login');
      navigate('/login', { replace: true });
      return;
    }

    // Handle workout plan updates
    if (latestWorkoutPlan) {
      console.log('GeneratingWorkout: Workout plan received:', latestWorkoutPlan);
      console.log('Navigating to dashboard...');
      // Add a small delay to ensure state updates are complete
      setTimeout(() => {
        navigate('/dashboard', { 
          replace: true,
          state: { workoutPlanReceived: true }
        });
      }, 1000);
    }
  }, [latestWorkoutPlan, navigate, authToken, user]);

  return (
    <Box className={classes.root}>
      <CircularProgress size={60} />
      <Typography variant="h6" className={classes.loadingText}>
        {wsConnected
          ? 'Your workout plan is being generated. Please wait...'
          : 'Connecting to server...'}
      </Typography>
      {!wsConnected && (
        <Typography variant="body2" color="textSecondary" style={{ marginTop: '1rem' }}>
          This may take a few moments...
        </Typography>
      )}
    </Box>
  );
};

export default GeneratingWorkout;
