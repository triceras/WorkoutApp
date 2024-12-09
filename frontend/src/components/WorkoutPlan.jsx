// src/components/WorkoutPlan.jsx

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext'; 
//import PropTypes from 'prop-types';
import { DateTime } from 'luxon';
import axiosInstance from '../api/axiosInstance';
import VideoModal from './VideoModal';
import {
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Box,
  Container,
  Paper,
  CircularProgress
} from '@mui/material';
import './WorkoutPlan.css';
import { processWorkoutPlan } from '../utils/processWorkoutPlan';

/**
 * Splits a text into sentences for better readability.
 * @param {string} text - The text to split.
 * @returns {string[]} - Array of sentences.
 */
const splitIntoSentences = (text) => {
  return text
    .split('.')
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
};

/**
 * Generates YouTube thumbnail URL based on video ID.
 * @param {string} videoId - The YouTube video ID.
 * @returns {string} - The thumbnail URL.
 */
const getYoutubeThumbnailUrl = (videoId) => {
  return `https://img.youtube.com/vi/${videoId}/0.jpg`;
};

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

  /**
   * Fetches the workout plan from the backend.
   */

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

        // Process the workout plan to include rest days and align with weekdays
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

  /**
   * Determines today's workout or rest day based on the full weekly plan.
   */
  useEffect(() => {
    if (!fullWeeklyPlan || fullWeeklyPlan.length === 0) {
      console.error('Full weekly plan is empty or undefined.');
      setError('Weekly workout plan is unavailable.');
      return;
    }

    const todayWeekday = DateTime.local().weekday; // 1 (Monday) to 7 (Sunday)

    const todayPlan = fullWeeklyPlan.find((day) => day.dayNumber === todayWeekday);

    if (todayPlan) {
      if (todayPlan.type === 'workout') {
        setTodayWorkout(todayPlan);
        setIsRestDay(false);
      } else if (todayPlan.type === 'rest') {
        setTodayWorkout(todayPlan); // Set to todayPlan to access notes
        setIsRestDay(true);
      } else {
        setTodayWorkout(null);
        setIsRestDay(true);
      }
      setError(null);
    } else {
      setTodayWorkout(null);
      setIsRestDay(true);
      setError(null);
    }
  }, [fullWeeklyPlan]);

  /**
   * Opens the video modal with the selected video ID.
   * @param {string} videoId - The ID of the YouTube video to play.
   */
  const openVideoModal = (videoId) => {
    setCurrentVideoId(videoId);
    setModalIsOpen(true);
  };

  /**
   * Closes the video modal.
   */
  const closeVideoModal = () => {
    setModalIsOpen(false);
    setCurrentVideoId(null);
  };

  /**
   * If there's an error, display it.
   */
  if (error) {
    return (
      <Typography variant="body1" color="error" align="center">
        {error}
      </Typography>
    );
  }

  /**
   * If the workout plan is loading, show a loading message.
   */
  if (!fullWeeklyPlan || fullWeeklyPlan.length === 0) {
    return (
      <Typography variant="body1" align="center">
        Loading today's workout information...
      </Typography>
    );
  }

  /**
   * If today is a rest day, display a rest day message with upcoming workouts.
   */
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

        {/* Upcoming Workouts */}
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


        {/* Additional Tips */}
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

  /**
   * Render today's workout.
   */
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

      {/* Display Today's Workout */}
      {todayWorkout ? (
        <Box sx={{ mt: 4 }}>
          <Grid container spacing={3}>
            {todayWorkout.exercises && todayWorkout.exercises.length > 0 ? (
              todayWorkout.exercises.map((exercise) => (
                <Grid item xs={12} sm={6} md={4} key={exercise.name}>
                  <Card sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    }
                  }}>
                    {exercise.videoId && (
                      <CardMedia
                        component="img"
                        height="180"
                        image={getYoutubeThumbnailUrl(exercise.videoId)}
                        alt={`${exercise.name} video`}
                        sx={{
                          objectFit: 'cover',
                          cursor: 'pointer',
                        }}
                        onClick={() => openVideoModal(exercise.videoId)}
                      />
                    )}
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{
                        fontWeight: 600,
                        mb: 2,
                        fontSize: '1.25rem'
                      }}>
                        {exercise.name}
                      </Typography>

                      {exercise.setsReps && (
                        <Box sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          mb: 1.5,
                          gap: 1
                        }}>
                          <span style={{ fontSize: '1.2rem' }}>💪</span>
                          <Typography variant="body1">
                            <strong>Sets & Reps:</strong> {exercise.setsReps}
                          </Typography>
                        </Box>
                      )}

                      {exercise.equipment && (
                        <Box sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          mb: 1.5,
                          gap: 1
                        }}>
                          <span style={{ fontSize: '1.2rem' }}>🏋️</span>
                          <Typography variant="body1">
                            <strong>Equipment:</strong> {exercise.equipment}
                          </Typography>
                        </Box>
                      )}

                      {exercise.instructions && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body1" sx={{ 
                            fontWeight: 600,
                            mb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <span style={{ fontSize: '1.2rem' }}>📋</span>
                            Instructions:
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                            {exercise.instructions}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))
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
      {/* Additional Tips */}
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

WorkoutPlan.propTypes = {
};

export default WorkoutPlan;
