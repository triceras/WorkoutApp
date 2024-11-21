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
  Paper,
} from '@mui/material';
import './WorkoutPlan.css';

const getYoutubeThumbnailUrl = (videoId) => {
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
  console.log(`Thumbnail URL for videoId ${videoId}:`, thumbnailUrl);
  return thumbnailUrl;
};

function WorkoutPlan({ initialWorkoutData, username }) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [workoutData, setWorkoutData] = useState(initialWorkoutData);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const wsBaseUrl = process.env.REACT_APP_WS_BASE_URL;
    if (!wsBaseUrl) {
      console.error('WebSocket base URL is not defined.');
      return;
    }
    console.log('WebSocket Base URL:', wsBaseUrl);
    const socket = new WebSocket(
      `${wsBaseUrl}/ws/workout-plan/?token=${token}`
    );

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
  }, [initialWorkoutData]);

  const openVideoModal = (videoId) => {
    setCurrentVideoId(videoId);
    setModalIsOpen(true);
  };

  const closeVideoModal = () => {
    setModalIsOpen(false);
    setCurrentVideoId(null);
  };

  // Defensive check
  if (!workoutData || !Array.isArray(workoutData.workoutDays)) {
    console.error('Invalid plan data:', workoutData);
    return <div className="error-message">No workout days found in the plan.</div>;
  }

  const { workoutDays = [], additionalTips = [] } = workoutData;

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

      {workoutDays.length > 0 ? (
        workoutDays.map((workoutDay, index) => (
          <Paper key={index} className="workout-day" elevation={3}>
            {/* Day and Duration */}
            <Box className="day-cell">
              <Typography variant="h5" className="day-title">
                {workoutDay.day || `Day ${index + 1}`}
              </Typography>
              <Typography variant="subtitle1" className="day-duration">
                {workoutDay.duration || 'No duration provided'}
              </Typography>
            </Box>
            {/* Exercises */}
            {workoutDay.exercises && workoutDay.exercises.length > 0 ? (
              <Grid container spacing={3} className="exercises-container">
                {workoutDay.exercises.map((exercise) => (
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
                No exercises listed for this day.
              </Typography>
            )}
          </Paper>
        ))
      ) : (
        <div className="error-message">No workout days found in the plan.</div>
      )}

      {/* Additional Tips */}
      {additionalTips.length > 0 && (
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

export default WorkoutPlan;
