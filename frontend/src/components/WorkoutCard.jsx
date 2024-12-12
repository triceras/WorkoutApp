// src/components/WorkoutCard.jsx

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Typography,
  Grid,
  Paper,
  Box,
  Chip,
  Card,
  CardContent,
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

  const getWorkoutTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'legs':
        return '💪';
      case 'arms':
        return '🦾';
      case 'chest':
        return '🏋️‍♂️';
      case 'back':
        return '🏋️‍♀️';
      case 'cardio':
        return '🏃‍♂️';
      default:
        return '🏋️';
    }
  };

  return (
    <div>
      <Box sx={{ mb: 4 }}>
        {/* Workout Type and Duration Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Workout Type Card */}
          <Grid item xs={12} sm={6}>
            <Card sx={{ 
              bgcolor: '#f0f7ff',
              height: '100%',
              borderRadius: 3,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <CardContent sx={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                <Box sx={{
                  width: 60,
                  height: 60,
                  bgcolor: '#1976d2',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem'
                }}>
                  {getWorkoutTypeIcon(workouts[0]?.workout_type)}
                </Box>
                <Box>
                  <Typography variant="overline" sx={{ color: '#1976d2', fontWeight: 600 }}>
                    WORKOUT TYPE
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {workouts[0]?.workout_type || 'General Workout'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Duration Card */}
          {workouts[0]?.duration && (
            <Grid item xs={12} sm={6}>
              <Card sx={{ 
                bgcolor: '#fff0f3',
                height: '100%',
                borderRadius: 3,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <CardContent sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}>
                  <Box sx={{
                    width: 60,
                    height: 60,
                    bgcolor: '#d81b60',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem'
                  }}>
                    ⏱️
                  </Box>
                  <Box>
                    <Typography variant="overline" sx={{ color: '#d81b60', fontWeight: 600 }}>
                      DURATION
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                      {workouts[0].duration}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
          Today's Workout
        </Typography>
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
