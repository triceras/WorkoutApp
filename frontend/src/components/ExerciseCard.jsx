// src/components/ExerciseCard.jsx

import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
} from '@mui/material';
import './ExerciseCard.css';

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

function ExerciseCard({ exercise, openVideoModal }) {
  return (
    <Card className="exercise-card">
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
          <Typography variant="body2" color="textSecondary">
            <strong>💪 Sets & Reps:</strong> {exercise.setsReps}
          </Typography>
        )}
        {exercise.equipment && (
          <Typography variant="body2" color="textSecondary">
            <strong>🏋️ Equipment:</strong> {exercise.equipment}
          </Typography>
        )}
        {exercise.instructions && (
          <Box mt={1}>
            <Typography variant="body2" color="textSecondary">
              <strong>📋 Instructions:</strong>
            </Typography>
            <ul className="instruction-list">
              {splitIntoSentences(exercise.instructions).map((sentence, idx) => (
                <li key={idx} className="instruction-item">
                  {sentence}.
                </li>
              ))}
            </ul>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

ExerciseCard.propTypes = {
  exercise: PropTypes.shape({
    name: PropTypes.string.isRequired,
    setsReps: PropTypes.string,
    equipment: PropTypes.string,
    instructions: PropTypes.string,
    videoId: PropTypes.string,
  }).isRequired,
  openVideoModal: PropTypes.func.isRequired,
};

export default ExerciseCard;
