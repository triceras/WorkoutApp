// src/components/WorkoutPlan.jsx

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { DateTime } from 'luxon';
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
} from '@mui/material';
import './WorkoutPlan.css';

/**
 * Define the days of the week, starting with Monday as Day 1.
 */
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Generates YouTube thumbnail URL based on video ID.
 * @param {string} videoId - The YouTube video ID.
 * @returns {string} - The thumbnail URL.
 */
const getYoutubeThumbnailUrl = (videoId) => {
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
  console.log(`Thumbnail URL for videoId ${videoId}:`, thumbnailUrl);
  return thumbnailUrl;
};

/**
 * Generates a full weekly workout plan with rest days.
 * @param {number} workoutDays - Number of workout days per week.
 * @param {Array} initialWorkoutDays - Array of initial workout day data.
 * @returns {Array} - Full weekly plan with workouts and rest days.
 */
const generateWeeklyPlan = (workoutDays, initialWorkoutDays) => {
  const fullPlan = [];
  let workoutDaysAssigned = 0;

  for (let i = 0; i < weekDays.length; i++) {
    const dayName = weekDays[i];
    const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';
    const dayNumber = i + 1; // 1 for Monday, 7 for Sunday

    if (workoutDaysAssigned < workoutDays && (!isWeekend || workoutDays > 5)) {
      // Assign workout day
      const workoutDay = initialWorkoutDays[workoutDaysAssigned % initialWorkoutDays.length];
      fullPlan.push({
        dayName: dayName, // e.g., 'Monday'
        workoutDescription: `Day ${dayNumber}: ${workoutDay.exercises[0].name}`,
        dayNumber: dayNumber, // Correctly assigned
        type: 'workout', // Ensure type is set
        duration: workoutDay.duration,
        exercises: workoutDay.exercises,
      });
      workoutDaysAssigned++;
    } else {
      // Assign rest day
      fullPlan.push({
        dayName: dayName, // Consistent naming
        dayNumber: dayNumber,
        type: 'rest', // Ensure type is set
      });
    }
  }

  console.log('Generated Weekly Plan:', fullPlan); // For debugging
  return fullPlan;
};

function WorkoutPlan({ initialWorkoutData, username }) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [workoutData, setWorkoutData] = useState(initialWorkoutData);
  const [fullWeeklyPlan, setFullWeeklyPlan] = useState([]);
  const [todayWorkout, setTodayWorkout] = useState(null);
  const [isRestDay, setIsRestDay] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const wsBaseUrl = process.env.REACT_APP_WS_BASE_URL || 'ws://localhost:8000';
    if (!wsBaseUrl) {
      console.error('WebSocket base URL is not defined.');
      setError('WebSocket base URL is not defined.');
      return;
    }
    console.log('WebSocket Base URL:', wsBaseUrl);
    const socket = new WebSocket(`${wsBaseUrl}/ws/workout-plan/?token=${token}`);

    socket.onopen = () => {
      console.log('WebSocket connection established.');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'workout_plan_generated') {
        console.log('Received updated workout plan:', data.plan_data);
        setWorkoutData(data.plan_data);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed.');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('WebSocket encountered an error.');
    };

    return () => {
      socket.close();
    };
  }, [initialWorkoutData]);

  /**
   * Generates the full weekly plan with rest days when workoutData changes.
   */
  useEffect(() => {
    if (!workoutData || !Array.isArray(workoutData.workoutDays)) {
      console.error('Invalid workout data:', workoutData);
      setError('No workout days found in the plan.');
      return;
    }

    const workoutDaysPerWeek = workoutData.workoutDays.length;
    const generatedPlan = generateWeeklyPlan(workoutDaysPerWeek, workoutData.workoutDays);
    setFullWeeklyPlan(generatedPlan);
  }, [workoutData]);

  /**
   * Determines today's workout or rest day based on the full weekly plan.
   */
  useEffect(() => {
    if (!fullWeeklyPlan || fullWeeklyPlan.length === 0) {
      console.error('Full weekly plan is empty or undefined.');
      setError('Weekly workout plan is unavailable.');
      return;
    }

    const todayDate = DateTime.local();
    const todayWeekday = todayDate.weekday; // 1 (Monday) to 7 (Sunday)
    const todayPlan = fullWeeklyPlan.find((day) => day.dayNumber === todayWeekday);

    if (todayPlan) {
      if (todayPlan.type === 'workout') {
        setTodayWorkout(todayPlan);
        setIsRestDay(false);
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
   * Splits a text into sentences for better readability.
   */
  const splitIntoSentences = (text) => {
    return text
      .split('.')
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0);
  };

  /**
   * If there's an error (e.g., no workout plans), display it.
   */
  if (error) {
    return (
      <Typography variant="body1" color="error" align="center">
        {error}
      </Typography>
    );
  }

  /**
   * If today's workout is not determined, show a loading or rest day message.
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
                  <Typography variant="h6">{dayPlan.day}</Typography>
                  <Typography variant="body2">
                    {dayPlan.type === 'rest' ? 'Rest Day' : `${dayPlan.duration} minutes`}
                  </Typography>
                  {dayPlan.type === 'workout' && dayPlan.exercises.length > 0 && (
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
        {workoutData.additionalTips && workoutData.additionalTips.length > 0 && (
          <Box mt={5} className="additional-tips">
            <Typography variant="h5" gutterBottom>
              Additional Tips:
            </Typography>
            <ul>
              {workoutData.additionalTips.map((tip, index) => (
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

  /**
   * Get today's workout details
   */
  const todayPlan = fullWeeklyPlan.find(
    (day) => day.type === 'workout' && day.dayNumber === DateTime.local().weekday
  );

  return (
    <Container maxWidth="lg" className="workout-plan-container">
      <Typography variant="h4" align="center" gutterBottom>
        Your Personalized Weekly Workout Plan{username ? ` for ${username}` : ''}
      </Typography>
      <Typography variant="body1" align="center" paragraph>
        Based on your inputs, we've created a personalized weekly workout plan to help you build muscle. Please find the plan below:
      </Typography>

      {/* Display Today's Workout */}
      {todayWorkout ? (
        <Paper className="workout-day" elevation={3}>
          {/* Day and Duration */}
          <Box className="day-cell">
            <Typography variant="h5" className="day-title">
              {todayWorkout.day || 'Today'}
            </Typography>
            <Typography variant="subtitle1" className="day-duration">
              {todayWorkout.duration || 'No duration provided'}
            </Typography>
          </Box>
          {/* Exercises */}
          {todayWorkout.exercises && todayWorkout.exercises.length > 0 ? (
            <Grid container spacing={3} className="exercises-container">
              {todayWorkout.exercises.map((exercise) => (
                <Grid item xs={12} sm={6} md={4} key={exercise.name}>
                  <Card className="exercise-card exercise-item">
                    {exercise.videoId && (
                      <CardMedia
                        component="img"
                        height="140"
                        image={getYoutubeThumbnailUrl(exercise.videoId)}
                        alt={`${exercise.name} video`}
                        className="youtube-thumbnail"
                        onClick={() => openVideoModal(exercise.videoId)}
                        style={{ cursor: 'pointer' }}
                      />
                    )}
                    <CardContent className="exercise-details">
                      <Typography variant="h6" className="exercise-name" gutterBottom>
                        {exercise.name}
                      </Typography>
                      {exercise.setsReps && (
                        <div className="exercise-detail sets-reps-detail">
                          <span className="label">💪 Sets and Reps:</span>
                          <span className="detail-text">{exercise.setsReps}</span>
                        </div>
                      )}
                      {exercise.equipment && (
                        <div className="exercise-detail equipment-detail">
                          <span className="label">🏋️ Equipment Required:</span>
                          <span className="detail-text">{exercise.equipment}</span>
                        </div>
                      )}
                      {exercise.instructions && (
                        <div className="exercise-detail instructions-detail">
                          <span className="label">📋 Instructions:</span>
                          <ul className="instruction-list">
                            {splitIntoSentences(exercise.instructions).map(
                              (sentence, sentenceIdx) => (
                                <li key={sentenceIdx} className="instruction-item">
                                  {sentence}.
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant="body1" color="textSecondary">
              No exercises listed for today.
            </Typography>
          )}
        </Paper>
      ) : (
        <Typography variant="body1" align="center">
          Loading workout details...
        </Typography>
      )}

      {/* Additional Tips */}
      {workoutData.additionalTips && workoutData.additionalTips.length > 0 && (
        <Box mt={5} className="additional-tips">
          <Typography variant="h5" gutterBottom>
            Additional Tips:
          </Typography>
          <ul>
            {workoutData.additionalTips.map((tip, index) => (
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
  initialWorkoutData: PropTypes.shape({
    workoutDays: PropTypes.arrayOf(
      PropTypes.shape({
        day: PropTypes.string.isRequired,
        dayNumber: PropTypes.number.isRequired, // Ensure dayNumber is included
        duration: PropTypes.string.isRequired,
        exercises: PropTypes.arrayOf(
          PropTypes.shape({
            name: PropTypes.string.isRequired,
            setsReps: PropTypes.string,
            equipment: PropTypes.string,
            instructions: PropTypes.string,
            videoId: PropTypes.string,
            description: PropTypes.string,
            video_url: PropTypes.string,
          })
        ).isRequired,
      })
    ).isRequired,
    additionalTips: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  username: PropTypes.string.isRequired,
};

WorkoutPlan.defaultProps = {
  initialWorkoutData: {
    workoutDays: [],
    additionalTips: [],
  },
  username: '',
};
}

export default WorkoutPlan;
