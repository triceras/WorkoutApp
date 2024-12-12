import React from 'react';
import PropTypes from 'prop-types';
import {
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

// Helper function to parse instructions if they're in string format
const parseInstructions = (instructions) => {
  if (typeof instructions === 'string') {
    try {
      // Clean up the string before parsing
      const cleanedString = instructions
        .replace(/'/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
      
      const parsed = JSON.parse(cleanedString);

      // Split form tips if they contain 'Avoid'
      const formTips = Array.isArray(parsed.form_tips) ? parsed.form_tips : [parsed.form_tips];
      const processedFormTips = formTips.flatMap(tip => {
        if (typeof tip === 'string' && tip.includes('Avoid')) {
          return tip.split('Avoid').map((part, index) => {
            part = part.trim();
            return index === 0 ? part : `Avoid ${part}`;
          }).filter(part => part.length > 0);
        }
        return [tip];
      });
      
      return {
        setup: Array.isArray(parsed.setup) ? parsed.setup : [parsed.setup],
        execution: Array.isArray(parsed.execution) ? parsed.execution : [parsed.execution],
        form_tips: processedFormTips
      };
    } catch (e) {
      console.warn('Failed to parse instructions:', e);
      return {
        setup: [],
        execution: [],
        form_tips: []
      };
    }
  }
  return instructions || { setup: [], execution: [], form_tips: [] };
};

function ExerciseCard({ exercise, openVideoModal }) {
  console.log('ExerciseCard received exercise:', exercise);

  const parsedInstructions = parseInstructions(exercise.instructions);

  // Determine if exercise is cardio/time-based or strength/weight-based
  const isCardio = exercise.name?.toLowerCase().includes('jogging') || 
                  exercise.name?.toLowerCase().includes('running') ||
                  exercise.exercise_type === 'cardio' || 
                  exercise.tracking_type === 'time_based' || 
                  exercise.type === 'active_recovery';

  console.log('ExerciseCard isCardio check:', {
    name: exercise.name,
    exerciseType: exercise.exercise_type,
    trackingType: exercise.tracking_type,
    isCardio
  });

  // Conditions for displaying info
  const showCardioInfo = isCardio;
  const showStrengthInfo = !isCardio && Boolean(exercise.sets) && Boolean(exercise.reps);

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
    }} className="exercise-card">
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
        <Typography variant="h6" sx={{ mb: 2, color: '#7b1fa2', display: 'flex', alignItems: 'center', gap: 1 }}>
          🏋️‍♂️ {exercise.name}
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
          {showCardioInfo && (
            <>
              <Paper elevation={0} sx={{
                backgroundColor: '#fff3e0',
                p: 2,
                borderRadius: 2,
                mb: 2
              }}>
                <Typography sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: '#f57c00',
                  fontWeight: 600,
                  mb: 1
                }}>
                  ⏳ DURATION
                </Typography>
                <Typography variant="body1" sx={{ color: '#f57c00' }}>
                  {exercise.duration || '30 minutes'}
                </Typography>
              </Paper>

              <Paper elevation={0} sx={{
                backgroundColor: '#e3f2fd',
                p: 2,
                borderRadius: 2,
                mb: 2
              }}>
                <Typography sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: '#0288d1',
                  fontWeight: 600,
                  mb: 1
                }}>
                  🔥 INTENSITY
                </Typography>
                <Typography variant="body1" sx={{ color: '#0288d1', textTransform: 'capitalize' }}>
                  {exercise.intensity || 'low'}
                </Typography>
              </Paper>
            </>
          )}

          {showStrengthInfo && (
            <>
              {/* Sets & Reps for Strength */}
              {Boolean(exercise.sets) && Boolean(exercise.reps) && (
                <Paper elevation={0} sx={{
                  backgroundColor: '#e8f5e9',
                  p: 2,
                  borderRadius: 2,
                  flex: '1 1 auto',
                  minWidth: '200px'
                }}>
                  <Typography sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: '#2e7d32',
                    fontWeight: 600,
                    mb: 1
                  }}>
                    🎯 SETS & REPS
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#2e7d32' }}>
                    {`${exercise.sets} sets × ${exercise.reps} reps`}
                  </Typography>
                </Paper>
              )}

              {/* Rest Interval if provided */}
              {exercise.rest_time && (
                <Paper elevation={0} sx={{
                  backgroundColor: '#e8f5e9',
                  p: 2,
                  borderRadius: 2,
                  flex: '1 1 auto',
                  minWidth: '200px'
                }}>
                  <Typography sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: '#2e7d32',
                    fontWeight: 600,
                    mb: 1,
                    textTransform: 'uppercase'
                  }}>
                    ⏱️ REST INTERVAL
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#2e7d32' }}>
                    {Number(exercise.rest_time) > 0 ? `${exercise.rest_time} seconds` : 'Not specified'}
                  </Typography>
                </Paper>
              )}
            </>
          )}
        </Box>

        {parsedInstructions && (
          <Paper elevation={0} sx={{
            backgroundColor: '#fce4ec',
            p: 2,
            borderRadius: 2,
          }}>
            <Typography sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: '#d81b60',
              fontWeight: 600,
              mb: 2
            }}>
              📝 INSTRUCTIONS
            </Typography>

            {parsedInstructions.setup?.length > 0 && (
              <div className="instruction-subsection">
                <Typography variant="subtitle1" sx={{ color: '#d81b60', fontWeight: 600, mb: 1 }}>
                  Setup:
                </Typography>
                <Typography variant="body1" sx={{ color: '#d81b60', ml: 2 }}>
                  {parsedInstructions.setup}
                </Typography>
              </div>
            )}

            {parsedInstructions.execution?.length > 0 && (
              <div className="instruction-subsection">
                <Typography variant="subtitle1" sx={{ color: '#d81b60', fontWeight: 600, mb: 1 }}>
                  Execution:
                </Typography>
                <Typography variant="body1" sx={{ color: '#d81b60', ml: 2 }}>
                  {parsedInstructions.execution}
                </Typography>
              </div>
            )}

            {parsedInstructions.form_tips?.length > 0 && (
              <div className="instruction-subsection">
                <Typography variant="subtitle1" sx={{ color: '#d81b60', fontWeight: 600, mb: 1 }}>
                  Form Tips:
                </Typography>
                <ul style={{ listStyle: 'none', paddingLeft: '16px', margin: 0 }}>
                  {parsedInstructions.form_tips.map((tip, index) => (
                    <li key={index} style={{ marginBottom: index < parsedInstructions.form_tips.length - 1 ? '8px' : 0 }}>
                      <Typography variant="body1" sx={{ color: '#d81b60' }}>
                        {tip}
                      </Typography>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Paper>
        )}
      </Box>
    </Paper>
  );
}

ExerciseCard.propTypes = {
  exercise: PropTypes.shape({
    name: PropTypes.string.isRequired,
    sets: PropTypes.string,
    reps: PropTypes.string,
    rest_time: PropTypes.string,
    duration: PropTypes.string,
    intensity: PropTypes.string,
    exercise_type: PropTypes.string,
    workout_type: PropTypes.string,
    tracking_type: PropTypes.string,
    instructions: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        setup: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
        execution: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
        form_tips: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)])
      })
    ]),
    videoId: PropTypes.string,
  }).isRequired,
  openVideoModal: PropTypes.func.isRequired
};

export default ExerciseCard;
