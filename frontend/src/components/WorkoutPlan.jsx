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
              {todayWorkout.dayName || 'Today'}
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
