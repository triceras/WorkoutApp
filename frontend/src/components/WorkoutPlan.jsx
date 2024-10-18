// src/components/WorkoutPlan.jsx

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import VideoModal from './VideoModal';
import {
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Box,
  Container,
} from '@mui/material';
import './WorkoutPlan.css';

const getYoutubeThumbnailUrl = (videoId) => {
  return `https://img.youtube.com/vi/${videoId}/0.jpg`;
};

function WorkoutPlan({ initialWorkoutData, username }) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [workoutData, setWorkoutData] = useState(initialWorkoutData);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const socket = new WebSocket(`ws://localhost:8001/ws/workout-plan/?token=${token}`);

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
    };

    return () => {
      socket.close();
    };
  }, []);

  const openVideoModal = (videoId) => {
    setCurrentVideoId(videoId);
    setModalIsOpen(true);
  };

  const closeVideoModal = () => {
    setModalIsOpen(false);
    setCurrentVideoId(null);
  };

  if (!workoutData || Object.keys(workoutData).length === 0) {
    console.error('Invalid plan data:', workoutData);
    return <div className="error-message">No workout days found in the plan.</div>;
  }

  const { workoutDays, additionalTips } = workoutData;

  const splitIntoSentences = (text) => {
    return text
      .split('.')
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0);
  };

  return (
    <Container maxWidth="lg" className="workout-plan-container">
      <Typography variant="h4" align="center" gutterBottom>
        Your Personalized Weekly Workout Plan
        {username ? ` for ${username}` : ''}
      </Typography>
      <Typography variant="body1" align="center" paragraph>
        Based on your inputs, we've created a personalized weekly workout plan to help you build
        muscle. Please find the plan below:
      </Typography>

      {workoutDays && workoutDays.length > 0 ? (
        workoutDays.map((day) => (
          <Box key={day.day} className="workout-day">
            {/* Day and Duration */}
            <Box className="day-cell">
              <Typography variant="h4" className="day-title">
                {day.day}
              </Typography>
              <Typography variant="subtitle2" style={{ marginTop: '2px', color: '#555' }}>
                {day.duration}
              </Typography>
            </Box>
            {/* Exercises */}
            {day.exercises && day.exercises.length > 0 ? (
              <Grid container spacing={3} className="exercises-container">
                {day.exercises.map((exercise) => (
                  <Grid item xs={12} sm={6} md={4} key={exercise.name}>
                    <Card
                      className="exercise-card exercise-item"
                      onClick={() => openVideoModal(exercise.videoId)}
                    >
                      {exercise.videoId && (
                        <CardMedia
                          component="img"
                          height="140"
                          image={getYoutubeThumbnailUrl(exercise.videoId)}
                          alt={`${exercise.name} video`}
                          className="youtube-thumbnail"
                        />
                      )}
                      <CardContent className="exercise-details">
                        <Typography variant="h6" className="exercise-name" gutterBottom>
                          {exercise.name}
                        </Typography>
                        {exercise.setsReps && (
                          <div className="exercise-detail sets-reps-detail">
                            <span className="label-sets-reps">💪 Sets and Reps:</span>
                            <span className="detail-text">{exercise.setsReps}</span>
                          </div>
                        )}
                        {exercise.equipment && (
                          <div className="exercise-detail equipment-detail">
                            <span className="label-equipment">🏋️ Equipment Required:</span>
                            <span className="detail-text">{exercise.equipment}</span>
                          </div>
                        )}
                        {exercise.instructions && (
                          <div className="exercise-detail instructions-detail">
                            <span className="label-instructions">📋 Instructions:</span>
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
                No exercises listed for this day.
              </Typography>
            )}
          </Box>
        ))
      ) : (
        <div className="error-message">No workout days found in the plan.</div>
      )}

      {/* Additional Tips */}
      {additionalTips && additionalTips.length > 0 && (
        <Box mt={5} className="additional-tips">
          <Typography variant="h5" gutterBottom>
            Additional Tips:
          </Typography>
          <ul>
            {additionalTips.map((tip, index) => (
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
        duration: PropTypes.string.isRequired,
        exercises: PropTypes.arrayOf(
          PropTypes.shape({
            name: PropTypes.string.isRequired,
            setsReps: PropTypes.string,
            equipment: PropTypes.string,
            instructions: PropTypes.string,
            videoId: PropTypes.string,
          })
        ),
      })
    ),
    additionalTips: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  username: PropTypes.string,
};

export default WorkoutPlan;
