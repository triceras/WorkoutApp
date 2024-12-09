// src/components/ExerciseCard.jsx

import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Paper,
} from '@mui/material';
import './ExerciseCard.css';

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
    <Paper elevation={0} sx={{
      height: '100%',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      borderRadius: '20px',
      overflow: 'hidden',
      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.1)',
      }
    }}>
      {exercise.videoId && (
        <Box sx={{
          position: 'relative',
          '&:hover': {
            '& .play-overlay': {
              opacity: 1,
            }
          }
        }}>
          <CardMedia
            component="img"
            height="200"
            image={getYoutubeThumbnailUrl(exercise.videoId)}
            alt={`${exercise.name} video`}
            sx={{
              objectFit: 'cover',
              cursor: 'pointer',
            }}
            onClick={() => openVideoModal(exercise.videoId)}
          />
          <Box className="play-overlay" sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.4)',
            opacity: 0,
            transition: 'opacity 0.2s ease-in-out',
          }}>
            <Box sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            }}>
              <span style={{ fontSize: '24px' }}>▶️</span>
            </Box>
          </Box>
        </Box>
      )}
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{
          fontWeight: 700,
          color: '#2D3748',
          mb: 3,
          fontSize: '1.5rem',
        }}>
          🏋️‍♂️ {exercise.name}
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
          {exercise.setsReps && (
            <Paper elevation={0} sx={{
              p: 2,
              flex: 1,
              background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)',
              border: '1px solid rgba(33, 150, 243, 0.1)',
              borderRadius: '12px',
            }}>
              <Typography variant="overline" sx={{
                color: '#1976d2',
                fontWeight: 700,
                letterSpacing: '1.5px',
                fontSize: '0.75rem',
                display: 'block',
                mb: 1,
              }}>
                💪 SETS & REPS
              </Typography>
              <Typography variant="body1" sx={{
                fontWeight: 600,
                color: '#1a237e',
              }}>
                {exercise.setsReps}
              </Typography>
            </Paper>
          )}

          {exercise.equipment && (
            <Paper elevation={0} sx={{
              p: 2,
              flex: 1,
              background: 'linear-gradient(135deg, #fce4ec 0%, #ffffff 100%)',
              border: '1px solid rgba(233, 30, 99, 0.1)',
              borderRadius: '12px',
            }}>
              <Typography variant="overline" sx={{
                color: '#c2185b',
                fontWeight: 700,
                letterSpacing: '1.5px',
                fontSize: '0.75rem',
                display: 'block',
                mb: 1,
              }}>
                🔧 EQUIPMENT
              </Typography>
              <Typography variant="body1" sx={{
                fontWeight: 600,
                color: '#880e4f',
              }}>
                {exercise.equipment}
              </Typography>
            </Paper>
          )}
        </Box>

        {exercise.instructions && (
          <Paper elevation={0} sx={{
            p: 2,
            background: 'linear-gradient(135deg, #f3e5f5 0%, #ffffff 100%)',
            border: '1px solid rgba(156, 39, 176, 0.1)',
            borderRadius: '12px',
          }}>
            <Typography variant="overline" sx={{
              color: '#7b1fa2',
              fontWeight: 700,
              letterSpacing: '1.5px',
              fontSize: '0.75rem',
              display: 'block',
              mb: 1,
            }}>
              📝 INSTRUCTIONS
            </Typography>
            <Typography variant="body2" sx={{
              color: '#4a148c',
              lineHeight: 1.6,
              fontWeight: 500,
            }}>
              {exercise.instructions}
            </Typography>
          </Paper>
        )}
      </Box>
    </Paper>
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
