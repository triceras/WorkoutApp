// src/components/WorkoutPlan.jsx

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext'; 
import { DateTime } from 'luxon';
import axiosInstance from '../api/axiosInstance';
import VideoModal from './VideoModal';
import ExerciseCard from './ExerciseCard';
import {
  Typography,
  Grid,
  Box,
  Container,
  Paper,
  CircularProgress
} from '@mui/material';
import './WorkoutPlan.css';
import { processWorkoutPlan } from '../utils/processWorkoutPlan';

function WorkoutPlan() {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [fullWeeklyPlan, setFullWeeklyPlan] = useState([]);
  const [todayWorkout, setTodayWorkout] = useState(null);
  const [isRestDay, setIsRestDay] = useState(false);
  const [error, setError] = useState(null);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const { user } = useContext(AuthContext);
  const username = user?.first_name || user?.username || '';

  useEffect(() => {
    const fetchWorkoutPlan = async () => {
      try {
        const response = await axiosInstance.get('workout-plans/');
        if (response.data.length === 0) {
          console.error('No workout plans available:', response.data);
          setError('No workout plans found.');
          return;
        }

        let currentPlan = response.data[0]; // Use the most recent plan
        currentPlan = processWorkoutPlan(currentPlan);

        console.log('Processed Workout Plan in WorkoutPlan:', currentPlan); // Debugging

        setWorkoutPlan(currentPlan);
        setFullWeeklyPlan(currentPlan.workoutDays);
        setError(null);
      } catch (err) {
        console.error('Error fetching workout plans:', err);
        setError('Failed to fetch workout plans.');
      }
    };

    fetchWorkoutPlan();
  }, []);

  useEffect(() => {
    if (fullWeeklyPlan.length > 0) {
      // Get current day of week (1-7, where 1 is Monday)
      const today = DateTime.now().weekday;
      
      // Map weekday number to name
      const weekdayNames = {
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
        6: 'Saturday',
        7: 'Sunday'
      };
      
      const todayName = weekdayNames[today];
      
      // Find today's workout
      const todaysWorkout = fullWeeklyPlan.find(day => day.day === todayName);
      
      if (todaysWorkout) {
        setTodayWorkout(todaysWorkout);
        setIsRestDay(todaysWorkout.type === 'rest');
      } else {
        setTodayWorkout(null);
        setIsRestDay(true);
      }
    }
  }, [fullWeeklyPlan]);

  const openVideoModal = (videoId) => {
    console.log('Opening video modal with ID:', videoId);
    setCurrentVideoId(videoId);
    setModalIsOpen(true);
  };

  const closeVideoModal = () => {
    console.log('Closing video modal');
    setModalIsOpen(false);
    setCurrentVideoId(null);
  };

  if (error) {
    return (
      <Typography variant="body1" color="error" align="center">
        {error}
      </Typography>
    );
  }

  if (!fullWeeklyPlan || fullWeeklyPlan.length === 0) {
    return (
      <Typography variant="body1" align="center">
        Loading today's workout information...
      </Typography>
    );
  }

  if (isRestDay) {
    return (
      <Container maxWidth="lg" className="workout-plan-container">
        <Typography variant="h4" align="center" gutterBottom>
          Your Personalized Weekly Workout Plan{username ? ` for ${username}` : ''}
        </Typography>
        <Typography variant="body1" align="center" paragraph>
          Today is a Rest Day! Take this time to recover and rejuvenate.
        </Typography>
        {todayWorkout && todayWorkout.notes && (
          <Typography variant="body2" align="center" color="textSecondary">
            {todayWorkout.notes}
          </Typography>
        )}

        <Box mt={5}>
          <Typography variant="h5" align="center" gutterBottom>
            Upcoming Workouts
          </Typography>
          <Grid container spacing={3}>
            {fullWeeklyPlan.map((dayPlan) => (
              <Grid item xs={12} sm={6} md={4} key={dayPlan.dayNumber}>
                <Paper
                  elevation={2}
                  style={{
                    padding: '15px',
                    backgroundColor: dayPlan.type === 'rest' ? '#ffe6e6' : '#e6ffe6',
                    borderLeft: `5px solid ${dayPlan.type === 'rest' ? '#f44336' : '#28a745'}`,
                  }}
                >
                  <Typography variant="h6">{dayPlan.dayName}</Typography>
                  <Typography variant="body2">
                    {dayPlan.type === 'rest' ? 'Rest Day' : `${dayPlan.duration}`}
                  </Typography>
                  {dayPlan.type === 'rest' && dayPlan.notes && (
                    <Typography variant="body2" color="textSecondary">
                      {dayPlan.notes}
                    </Typography>
                  )}
                  {dayPlan.type === 'workout' && dayPlan.exercises && dayPlan.exercises.length > 0 && (
                    <ul>
                      {dayPlan.exercises.map((exercise, idx) => (
                        <li key={idx}>{exercise.name}</li>
                      ))}
                    </ul>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {workoutPlan && workoutPlan.additionalTips && workoutPlan.additionalTips.length > 0 && (
          <Box mt={5} className="additional-tips">
            <Typography variant="h5" gutterBottom>
              Additional Tips:
            </Typography>
            <ul>
              {workoutPlan.additionalTips.map((tip, index) => (
                <li key={index}>
                  <Typography variant="body1" color="textSecondary">
                    {tip}
                  </Typography>
                </li>
              ))}
            </ul>
          </Box>
        )}

        <VideoModal
          isOpen={modalIsOpen}
          onRequestClose={closeVideoModal}
          contentLabel="Watch Video"
          videoId={currentVideoId}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" className="workout-plan-container">
      <Box sx={{
        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
        borderRadius: '20px',
        padding: '2.5rem',
        marginBottom: '2rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
      }}>
        <Typography variant="h4" sx={{
          fontSize: '2.5rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '2.5rem',
          textAlign: 'center'
        }}>
          Day 1: Upper Body Strength
        </Typography>

        <Grid container spacing={4}>
          {/* Workout Type Card */}
          <Grid item xs={12} md={4}>
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
                  Strength Training
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Duration Card */}
          <Grid item xs={12} md={4}>
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
                  60 Minutes
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Focus Card */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{
              p: 3,
              height: '100%',
              background: 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%)',
              border: '1px solid rgba(76, 175, 80, 0.1)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: 2.5,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 28px rgba(76, 175, 80, 0.15)',
              }
            }}>
              <Box sx={{
                width: 64,
                height: 64,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(76, 175, 80, 0.2)',
              }}>
                <span style={{ fontSize: '32px' }}>🎯</span>
              </Box>
              <Box>
                <Typography variant="overline" sx={{
                  color: '#388e3c',
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  fontSize: '0.75rem',
                }}>
                  FOCUS
                </Typography>
                <Typography variant="h6" sx={{
                  fontWeight: 700,
                  color: '#1b5e20',
                  marginTop: '4px',
                }}>
                  Upper Body
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {todayWorkout ? (
        <Box sx={{ mt: 4 }}>
          <Grid container spacing={3}>
            {todayWorkout.exercises && todayWorkout.exercises.length > 0 ? (
              todayWorkout.exercises.map((exercise, index) => {
                console.log('Raw Exercise Data:', exercise);
                // Update video ID for squats to a better barbell tutorial
                if (exercise.name.toLowerCase().includes('squat')) {
                  exercise.videoId = 'Uv_DKDl7EjA';  // Comprehensive barbell squat tutorial
                }
                // Determine exercise type based on the workout type if not provided
                const exerciseType = exercise.exercise_type || 
                                   (todayWorkout.workout_type?.toLowerCase().includes('cardio') ? 'cardio' : 'strength');
                
                console.log('Exercise type determined:', {
                  name: exercise.name,
                  originalType: exercise.exercise_type,
                  workoutType: todayWorkout.workout_type,
                  determinedType: exerciseType
                });

                return (
                  <Grid item xs={12} sm={6} md={4} key={`${exercise.name}-${index}`}>
                    <ExerciseCard
                      exercise={{
                        ...exercise,
                        workout_type: todayWorkout.workout_type,
                        type: todayWorkout.type,
                        exercise_type: exerciseType
                      }}
                      openVideoModal={openVideoModal}
                    />
                  </Grid>
                );
              })
            ) : (
              <Grid item xs={12}>
                <Paper sx={{
                  p: 3,
                  textAlign: 'center',
                  borderRadius: '12px'
                }}>
                  <Typography variant="body1" color="text.secondary">
                    No exercises listed for today.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      ) : (
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px'
        }}>
          <CircularProgress />
        </Box>
      )}

      {workoutPlan && workoutPlan.additionalTips && workoutPlan.additionalTips.length > 0 && (
        <Box mt={5} className="additional-tips">
          <Typography variant="h5" gutterBottom>
            Additional Tips:
          </Typography>
          <ul>
            {workoutPlan.additionalTips.map((tip, index) => (
              <li key={index}>
                <Typography variant="body1" color="textSecondary">
                  {tip}
                </Typography>
              </li>
            ))}
          </ul>
        </Box>
      )}

      <VideoModal
        isOpen={modalIsOpen}
        onRequestClose={closeVideoModal}
        contentLabel="Watch Video"
        videoId={currentVideoId}
      />
    </Container>
  );
}

export default WorkoutPlan;
