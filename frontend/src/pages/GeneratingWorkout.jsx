// src/components/GeneratingWorkout.jsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { toast } from 'react-toastify';

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
  statusText: {
    marginTop: theme.spacing(1),
    color: theme.palette.text.secondary,
  },
}));

const TIMEOUT_DURATION = 180000; // 3 minutes timeout
const CONNECTION_TIMEOUT = 30000; // 30 seconds to establish connection

const GeneratingWorkout = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const { latestWorkoutPlan, wsConnected, wsReconnecting, clearLatestWorkoutPlan } = useWebSocket();
  const { authToken, user } = useAuth();
  const timeoutRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const [loadingMessage, setLoadingMessage] = useState('Connecting to workout service...');

  useEffect(() => {
    if (latestWorkoutPlan) {
      console.log('GeneratingWorkout: Received workout plan, navigating to dashboard');
      clearLatestWorkoutPlan();
      navigate('/dashboard', { 
        replace: true,
        state: { workoutPlan: latestWorkoutPlan }
      });
    }
  }, [latestWorkoutPlan, navigate, clearLatestWorkoutPlan]);

  useEffect(() => {
    // Check authentication
    if (!authToken || !user) {
      console.log('GeneratingWorkout: No authentication, redirecting to login');
      navigate('/login', { replace: true });
      return;
    }

    // Update loading message based on WebSocket status
    if (wsConnected) {
      setLoadingMessage('Generating your personalized workout plan...\nThis may take up to a minute.');
    } else if (wsReconnecting) {
      setLoadingMessage('Reconnecting to workout service...');
    }

    // Set timeout for workout plan generation
    timeoutRef.current = setTimeout(() => {
      console.log('GeneratingWorkout: Generation timeout reached');
      toast.error('Workout plan generation is taking longer than expected. Please try again.');
      navigate('/dashboard', { replace: true });
    }, TIMEOUT_DURATION);

    // Set timeout for WebSocket connection
    connectionTimeoutRef.current = setTimeout(() => {
      if (!wsConnected && !wsReconnecting) {
        console.log('GeneratingWorkout: Connection timeout reached');
        toast.error('Unable to connect to workout service. Please try again.');
        navigate('/dashboard', { replace: true });
      }
    }, CONNECTION_TIMEOUT);

    // Log connection status
    console.log('GeneratingWorkout: WebSocket status:', { 
      wsConnected, 
      wsReconnecting,
      hasLatestPlan: !!latestWorkoutPlan 
    });

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, [navigate, authToken, user, wsConnected, wsReconnecting]);

  return (
    <Box className={classes.root}>
      <CircularProgress size={60} />
      <Typography variant="h6" className={classes.loadingText}>
        {loadingMessage}
      </Typography>
      <Typography variant="body2" className={classes.statusText}>
        {wsConnected ? 
          'Connected to workout service' : 
          wsReconnecting ? 
            'Reconnecting to workout service...' : 
            'Connecting to workout service...'}
      </Typography>
    </Box>
  );
};

export default GeneratingWorkout;
