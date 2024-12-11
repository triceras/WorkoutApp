// src/components/WorkoutCard.jsx

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Typography,
  Grid,
} from '@mui/material';
import VideoModal from './VideoModal'; // Import VideoModal component
import ExerciseCard from './ExerciseCard'; // Import ExerciseCard component

function WorkoutCard({ workouts, userName }) {
  // State hooks for modal control
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);

  // Functions to open and close the modal
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

  return (
    <div>
      {/* Exercises List */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {workouts.map((exercise, index) => (
          <Grid item xs={12} sm={6} md={4} key={exercise.id || index}>
            <ExerciseCard exercise={exercise} openVideoModal={openVideoModal} />
          </Grid>
        ))}
      </Grid>

      {/* Render the VideoModal */}
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
      id: PropTypes.string, // Preferably use a unique ID if available
      name: PropTypes.string.isRequired,
      setsReps: PropTypes.string.isRequired,
      equipment: PropTypes.string.isRequired,
      instructions: PropTypes.shape({
        setup: PropTypes.string,
        execution: PropTypes.arrayOf(PropTypes.string),
        form_tips: PropTypes.arrayOf(PropTypes.string)
      }),
      videoId: PropTypes.string, // To fetch YouTube thumbnails
    })
  ),
  userName: PropTypes.string.isRequired,
};

export default WorkoutCard;
