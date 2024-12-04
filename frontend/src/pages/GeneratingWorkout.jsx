// src/pages/GeneratingWorkout.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';
import { CircularProgress, Typography, Box } from '@mui/material';
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
  }
}));

const GeneratingWorkout = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const { latestWorkoutPlan, wsConnected } = useWebSocket();
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    // If we receive a workout plan and haven't navigated yet
    if (latestWorkoutPlan && !hasNavigated) {
      console.log('Workout plan received in GeneratingWorkout:', latestWorkoutPlan);
      // Navigate to dashboard with the workout plan data
      navigate('/dashboard', { 
        replace: true,
        state: { workoutPlan: latestWorkoutPlan }
      });
      setHasNavigated(true);
    }
  }, [latestWorkoutPlan, navigate, hasNavigated]);

  return (
    <Box className={classes.root}>
      <CircularProgress size={60} />
      <Typography variant="h6" className={classes.loadingText}>
        {wsConnected 
          ? "Your workout plan is being generated. Please wait..."
          : "Connecting to server..."}
      </Typography>
    </Box>
  );
};

export default GeneratingWorkout;
