// src/pages/GeneratingWorkout.jsx

import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';
import { CircularProgress, Typography, Box, Button } from '@mui/material';

function GeneratingWorkout() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0); // Still needed for logic
  const maxAttempts = 30; // e.g., 20 attempts * 3 seconds = 60 seconds

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await axiosInstance.get('check-workout-plan/');
        if (response.data.status === 'completed') {
          clearInterval(interval);
          navigate('/dashboard'); // Redirect to dashboard once the plan is ready
        }
      } catch (error) {
        console.error('Error checking workout plan status:', error);
        setError('An error occurred while generating your workout plan. Please try again.');
        clearInterval(interval);
      }

      setAttempts((prev) => {
        if (prev >= maxAttempts - 1) {
          clearInterval(interval);
          setError('Generating workout plan is taking longer than expected. Please try again later.');
          return prev;
        }
        return prev + 1;
      });
    }, 3000); // Poll every 3 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [navigate]);

  const retry = () => {
    setError(null);
    setAttempts(0);
    // Restart the polling by re-mounting the component or re-initializing the useEffect
    window.location.reload();
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="80vh">
      {error ? (
        <>
          <Typography variant="h6" color="error" align="center">
            {error}
          </Typography>
          <Button variant="contained" color="primary" onClick={retry} style={{ marginTop: '20px' }}>
            Retry
          </Button>
        </>
      ) : (
        <>
          <CircularProgress />
          <Typography variant="h6" style={{ marginTop: '20px' }}>
            Your workout plan is being generated. Please wait...
          </Typography>
          <Typography variant="body2" style={{ marginTop: '10px' }}>
            Attempt {attempts + 1} of {maxAttempts}
          </Typography> {/* Utilizes 'attempts' */}
        </>
      )}
    </Box>
  );
}

export default GeneratingWorkout;
