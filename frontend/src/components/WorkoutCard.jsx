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

const WorkoutCard = ({ workouts = [] }) => {
  console.log('WorkoutCard received workouts:', workouts);

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);

  const getWorkoutTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'strength':
        return '🏋️';
      case 'cardio':
        return '🏃';
      case 'hiit':
        return '⚡';
      case 'flexibility':
        return '🧘';
      default:
        return '💪';
    }
  };

  const openVideoModal = (videoId) => {
    if (!videoId) return;
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
          const isCardio = exercise.exercise_type === 'cardio' || exercise.type === 'cardio';
          const exerciseData = {
            ...exercise,
            // For cardio exercises
            ...(isCardio ? {
              duration: exercise.duration || '30',
              intensity: exercise.intensity || 'Moderate',
              exercise_type: 'cardio'
            } : {
              // For strength exercises
              sets: exercise.sets || '3',
              reps: exercise.reps || '12',
              weight: exercise.weight || 'bodyweight',
              exercise_type: 'strength'
            })
          };

          return (
            <Grid item xs={12} sm={6} md={4} key={exercise.id || index}>
              <ExerciseCard
                exercise={exerciseData}
                openVideoModal={openVideoModal}
              />
            </Grid>
          );
        })}
      </Grid>

      <VideoModal
        isOpen={modalIsOpen}
        videoId={currentVideoId}
        onRequestClose={closeVideoModal}
      />
    </div>
  );
};

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
      video_id: PropTypes.string,
      suggested_activities: PropTypes.arrayOf(PropTypes.string)
    })
  ),
  userName: PropTypes.string.isRequired,
  openVideoModal: PropTypes.func.isRequired
};

export default WorkoutCard;
