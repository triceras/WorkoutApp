import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  Grid,
} from '@mui/material';

const ExerciseCard = ({ exercise, openVideoModal }) => {
  const getYoutubeThumbnailUrl = (videoId) => {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  };

  const parseInstructions = (instructions) => {
    if (typeof instructions === 'string') {
      try {
        return JSON.parse(instructions.replace(/'/g, '"'));
      } catch (e) {
        console.warn('Failed to parse instructions:', e);
        return null;
      }
    }
    return instructions;
  };

  const parsedInstructions = parseInstructions(exercise.instructions);

  return (
    <Card sx={{ 
      height: '100%',
      borderRadius: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      overflow: 'visible'
    }}>
      {exercise.videoId && (
        <Box 
          sx={{ 
            position: 'relative',
            cursor: 'pointer',
            borderRadius: '16px 16px 0 0',
            overflow: 'hidden',
          }}
          onClick={() => openVideoModal(exercise.videoId)}
        >
          <CardMedia
            component="img"
            image={getYoutubeThumbnailUrl(exercise.videoId)}
            alt={`${exercise.name} video`}
            sx={{
              height: 200,
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)'
              }
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.3s ease',
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.5)'
              }
            }}
          >
            <Typography variant="h4" sx={{ color: 'white' }}>▶️</Typography>
          </Box>
        </Box>
      )}

      <CardContent sx={{ p: 3 }}>
        {/* Exercise Title */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h5" component="h2" sx={{ 
            fontWeight: 'bold',
            color: '#2C3E50',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            🏋️‍♂️ {exercise.name}
          </Typography>
        </Box>

        {/* Exercise Details Cards */}
        <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Sets & Reps Card */}
          <Box sx={{
            bgcolor: '#f0f7ff',
            borderRadius: 2,
            p: 2,
            width: '100%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)'
            }
          }}>
            <Typography 
              variant="overline" 
              sx={{ 
                color: '#1976d2',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              💪 SETS & REPS
            </Typography>
            <Typography variant="body1" sx={{ 
              color: '#1976d2',
              fontWeight: 500,
              mt: 1
            }}>
              {exercise.sets} sets of {exercise.reps} reps
            </Typography>
          </Box>

          {/* Equipment/Weight Card */}
          <Box sx={{
            bgcolor: '#fff0f3',
            borderRadius: 2,
            p: 2,
            width: '100%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)'
            }
          }}>
            <Typography 
              variant="overline" 
              sx={{ 
                color: '#d81b60',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              🔧 EQUIPMENT
            </Typography>
            <Typography variant="body1" sx={{ 
              color: '#d81b60',
              fontWeight: 500,
              mt: 1
            }}>
              {exercise.weight || 'bodyweight'}
            </Typography>
          </Box>

          {/* Interval Time Card */}
          <Box sx={{
            bgcolor: '#f3faf7',
            borderRadius: 2,
            p: 2,
            width: '100%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)'
            }
          }}>
            <Typography 
              variant="overline" 
              sx={{ 
                color: '#2e7d32',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              ⏱️ REST INTERVAL
            </Typography>
            <Typography variant="body1" sx={{ 
              color: '#2e7d32',
              fontWeight: 500,
              mt: 1
            }}>
              {exercise.name.toLowerCase() === 'squats' ? '90 seconds' : (exercise.rest_time ? `${exercise.rest_time} seconds` : '60-90 seconds')} between sets
            </Typography>
          </Box>
        </Box>

        {/* Instructions Section */}
        {parsedInstructions && (
          <Box 
            sx={{ 
              bgcolor: '#fdf7ff',
              borderRadius: 2,
              p: 2,
              mt: 2
            }}
          >
            <Typography 
              variant="overline" 
              sx={{ 
                color: '#7b1fa2',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              📝 INSTRUCTIONS
            </Typography>

            <Box sx={{ color: '#4a148c', mt: 1 }}>
              {parsedInstructions.setup && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Setup:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, pl: 2 }}>
                    {parsedInstructions.setup}
                  </Typography>
                </>
              )}

              {parsedInstructions.execution && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Execution:
                  </Typography>
                  {Array.isArray(parsedInstructions.execution) ? (
                    parsedInstructions.execution.map((step, index) => (
                      <Typography key={index} variant="body2" sx={{ mb: 1, pl: 2 }}>
                        {step}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ mb: 2, pl: 2 }}>
                      {parsedInstructions.execution}
                    </Typography>
                  )}
                </>
              )}

              {parsedInstructions.form_tips && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Form Tips:
                  </Typography>
                  {Array.isArray(parsedInstructions.form_tips) ? (
                    parsedInstructions.form_tips.map((tip, index) => (
                      <Typography key={index} variant="body2" sx={{ mb: 1, pl: 2 }}>
                        • {tip}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ mb: 1, pl: 2 }}>
                      • {parsedInstructions.form_tips}
                    </Typography>
                  )}
                </>
              )}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

ExerciseCard.propTypes = {
  exercise: PropTypes.shape({
    name: PropTypes.string.isRequired,
    sets: PropTypes.string,
    reps: PropTypes.string,
    weight: PropTypes.string,
    videoId: PropTypes.string,
    instructions: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object
    ]),
    rest_time: PropTypes.string
  }).isRequired,
  openVideoModal: PropTypes.func.isRequired
};

export default ExerciseCard;
