// src/components/WorkoutCard.jsx

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Typography,
  Grid,
  Paper,
  Box,
  Chip
} from '@mui/material';
import VideoModal from './VideoModal';
import ExerciseCard from './ExerciseCard';

function WorkoutCard({ workouts, userName }) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);

  const openVideoModal = (videoId) => {
    setCurrentVideoId(videoId);
    setModalIsOpen(true);
  };

  const closeVideoModal = () => {
    setModalIsOpen(false);
    setCurrentVideoId(null);
  };

  if (!Array.isArray(workouts) || workouts.length === 0) {
    return (
      <Typography variant="body1">
        You have no workout scheduled for today.
      </Typography>
    );
  }

  const getWorkoutTypeColor = (type) => {
    switch (type) {
      case 'strength':
        return '#2196f3';
      case 'cardio':
        return '#f44336';
      case 'mobility':
        return '#4caf50';
      case 'core':
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <div>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {workouts[0]?.workout_type || 'Today\'s Workout'}
        </Typography>
        {workouts[0]?.duration && (
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Duration: {workouts[0].duration}
          </Typography>
        )}
      </Box>

      <Grid container spacing={3}>
        {workouts.map((exercise, index) => {
          if (exercise.type === 'rest') {
            return (
              <Grid item xs={12} key={index}>
                <Paper 
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: '#e8f5e9',
                    border: '1px solid #81c784',
                    borderRadius: 2,
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="h6" color="#2e7d32" gutterBottom>
                    Rest Day
                  </Typography>
                  {exercise.suggested_activities && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="#1b5e20" gutterBottom>
                        Suggested Activities:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {exercise.suggested_activities.map((activity, idx) => (
                          <Chip 
                            key={idx}
                            label={activity}
                            size="small"
                            sx={{ 
                              bgcolor: '#c8e6c9',
                              color: '#1b5e20',
                              '&:hover': { bgcolor: '#a5d6a7' }
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Grid>
            );
          }

          return (
            <Grid item xs={12} sm={6} md={4} key={exercise.id || index}>
              <ExerciseCard 
                exercise={{
                  ...exercise,
                  type: exercise.exercise_type || exercise.type,
                  tracking_type: exercise.tracking_type || 'weight_based',
                  setsReps: exercise.tracking_type === 'time_based'
                    ? `Duration: ${exercise.duration}`
                    : exercise.sets && exercise.reps
                    ? `${exercise.sets} sets of ${exercise.reps} reps`
                    : exercise.setsReps || 'Not specified',
                  instructions: typeof exercise.instructions === 'string' 
                    ? exercise.instructions  
                    : exercise.instructions 
                    ? {
                        setup: exercise.instructions.setup || '',
                        execution: Array.isArray(exercise.instructions.execution) 
                          ? exercise.instructions.execution 
                          : typeof exercise.instructions.execution === 'string'
                          ? [exercise.instructions.execution]
                          : [],
                        form_tips: Array.isArray(exercise.instructions.form_tips)
                          ? exercise.instructions.form_tips
                          : typeof exercise.instructions.form_tips === 'string'
                          ? [exercise.instructions.form_tips]
                          : []
                      }
                    : null
                }} 
                openVideoModal={openVideoModal}
              />
            </Grid>
          );
        })}
      </Grid>

      <VideoModal
        isOpen={modalIsOpen}
        onRequestClose={closeVideoModal}
        contentLabel="Watch Video"
        videoId={currentVideoId}
      />
    </div>
  );
}

WorkoutCard.propTypes = {
  workouts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string.isRequired,
      type: PropTypes.string,
      exercise_type: PropTypes.string,
      tracking_type: PropTypes.string,
      weight: PropTypes.string,
      sets: PropTypes.string,
      reps: PropTypes.string,
      duration: PropTypes.string,
      intensity: PropTypes.string,
      instructions: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          setup: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.arrayOf(PropTypes.string)
          ]),
          execution: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.arrayOf(PropTypes.string)
          ]),
          form_tips: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.arrayOf(PropTypes.string)
          ])
        })
      ]),
      videoId: PropTypes.string,
      suggested_activities: PropTypes.arrayOf(PropTypes.string)
    })
  ),
  userName: PropTypes.string.isRequired
};

export default WorkoutCard;
