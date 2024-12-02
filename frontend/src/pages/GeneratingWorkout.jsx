// src/pages/GeneratingWorkout.jsx

import React, { useEffect, useState, useRef, useContext, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';
import { CircularProgress, Typography, Box, Button } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import ReconnectingWebSocket from 'reconnecting-websocket';
import './GeneratingWorkout.css';
import { toast } from 'react-toastify';

const MAX_RETRIES = 45;
const POLLING_INTERVAL = 3000;

function GeneratingWorkout() {
  const navigate = useNavigate();
  const { authToken } = useContext(AuthContext);
  const socketRef = useRef(null);
  const intervalRef = useRef(null);

  // State declarations
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState(false);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(async () => {
      if (attempts >= MAX_RETRIES) {
        clearInterval(intervalRef.current);
        setError('Generating workout plan is taking longer than expected. Please try again.');
        toast.error('Generating workout plan is taking longer than expected.');
        return;
      }

      try {
        const response = await axiosInstance.get('/check-workout-plan/');
        if (response.data.status === 'completed') {
          clearInterval(intervalRef.current);
          navigate('/dashboard', { replace: true });
        }
        setAttempts(prev => prev + 1);
      } catch (error) {
        console.error('Error checking workout plan status:', error);
        if (attempts >= MAX_RETRIES - 1) {
          clearInterval(intervalRef.current);
          setError('Generating workout plan is taking longer than expected. Please try again.');
          toast.error('Generating workout plan is taking longer than expected.');
        }
      }
    }, POLLING_INTERVAL);
  }, [attempts, navigate]);

  const setupWebSocket = useCallback(() => {
    if (!authToken) {
      console.error('No auth token available for WebSocket connection.');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const port = process.env.NODE_ENV === 'development' ? '8001' : window.location.port;
    const host = process.env.NODE_ENV === 'development' ? `localhost:${port}` : window.location.host;
    const wsUrl = `${protocol}://${host}/ws/workout-plan/?token=${authToken}`;


    console.log('Attempting WebSocket connection to:', wsUrl);

    if (socketRef.current) {
      socketRef.current.close();
    }

    const socket = new ReconnectingWebSocket(wsUrl, [], {
      debug: process.env.NODE_ENV === 'development',
      reconnectionDelayGrowFactor: 1.3,
      maxReconnectionDelay: 10000,
      minReconnectionDelay: 1000,
      maxRetries: 5,
      connectionTimeout: 4000
    });

    socket.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
      setWsError(false);
      setAttempts(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        if (data.type === 'workout_plan_generated') {
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    socket.onclose = () => {
      setWsConnected(false);
      setWsError(true);
      startPolling();
    };

    socket.onerror = () => {
      setWsError(true);
      startPolling();
    };

    socketRef.current = socket;
    return () => socket.close();
  }, [authToken, navigate, startPolling]);

  useEffect(() => {
    if (!authToken) {
      navigate('/login');
      return;
    }

    const cleanup = setupWebSocket();
    return () => {
      cleanup?.();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [authToken, navigate, setupWebSocket]);

  return (
    <Box className="generating-workout-container">
      {error ? (
        <>
          <Typography variant="h6" color="error" align="center">
            {error}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </>
      ) : (
        <>
          <CircularProgress />
          <Typography variant="h6">
            Your workout plan is being generated. Please wait...
          </Typography>
          {!wsConnected && (
            <Typography variant="body2">
              Attempt {attempts + 1} of {MAX_RETRIES}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}

export default GeneratingWorkout;
