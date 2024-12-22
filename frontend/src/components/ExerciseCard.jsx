// src/components/ExerciseCard.jsx
import React, { useState, useEffect } from 'react';
import './ExerciseCard.css';
import PropTypes from 'prop-types';
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import axiosInstance from '../api/axiosInstance';

const ExerciseCard = ({ exercise, openVideoModal }) => {
  const [videoId, setVideoId] = useState(exercise.videoId || exercise.video_id);
  const [thumbnailUrl, setThumbnailUrl] = useState(exercise.thumbnail_url);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVideoDetails = async () => {
      if (!videoId && exercise.name) {
        setIsLoading(true);
        setError(null);
        try {
          const exerciseResponse = await axiosInstance.get(`exercises/`, {
            params: { name: exercise.name },
          });
   
          if (exerciseResponse.data.length > 0) {
            const fetchedExercise = exerciseResponse.data[0];
            const videoIdToUse = fetchedExercise.videoId || fetchedExercise.video_id;
            const thumbnailUrlToUse = fetchedExercise.thumbnail_url;
            
            if (videoIdToUse) {
              setVideoId(videoIdToUse);
              setThumbnailUrl(thumbnailUrlToUse);
              return;
            }
            
            const videoResponse = await axiosInstance.patch(
              `exercises/${fetchedExercise.id}/fetch-video/`
            );
            
            if (videoResponse.data) {
              const updatedExercise = videoResponse.data;
              setVideoId(updatedExercise.videoId || updatedExercise.video_id);
              setThumbnailUrl(updatedExercise.thumbnail_url);
            }
          }
        } catch (error) {
          console.error("Error fetching video details:", error);
          setError("Error fetching video details.");
        } finally {
          setIsLoading(false);
        }
      }
    };
   
    fetchVideoDetails();
  }, [exercise.id, exercise.name, videoId]);

  const formatRestTime = (restTime) => {
    if (typeof restTime === 'number') {
      return restTime.toString();
    }
    return restTime;
  };

  const parseInstructions = (instructions) => {
    if (typeof instructions === 'string') {
      try {
        return JSON.parse(instructions.replace(/'/g, '"'));
      } catch (e) {
        console.warn('Failed to parse instructions:', e);
        return { steps: [instructions] };
      }
    }
    return instructions;
  };

  const parsedInstructions = parseInstructions(exercise.instructions);

  const renderInstructions = () => {
    if (!parsedInstructions) return null;

    return (
      <Box className="instructions-container">
        <Typography variant="h6" gutterBottom>
          Instructions
        </Typography>
        {parsedInstructions.setup && (
          <Box className="instruction-section">
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Setup:
            </Typography>
            <Typography variant="body2">{parsedInstructions.setup}</Typography>
          </Box>
        )}

        {parsedInstructions.execution && parsedInstructions.execution.length > 0 && (
          <Box className="instruction-section">
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Execution:
            </Typography>
            <ul className="instruction-list">
              {parsedInstructions.execution.map((step, index) => (
                <li key={index}>
                  <Typography variant="body2">{step}</Typography>
                </li>
              ))}
            </ul>
          </Box>
        )}

        {parsedInstructions.form_tips && parsedInstructions.form_tips.length > 0 && (
          <Box className="instruction-section">
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Form Tips:
            </Typography>
            <ul className="instruction-list">
              {parsedInstructions.form_tips.map((tip, index) => (
                <li key={index}>
                  <Typography variant="body2">{tip}</Typography>
                </li>
              ))}
            </ul>
          </Box>
        )}
      </Box>
    );
  };

  const exerciseType = exercise.exercise_type || 'strength';
  const isCardio = exerciseType === 'cardio' || exercise.type === 'cardio' || exercise.type === 'active_recovery' || exercise.type === 'recovery' || exercise.name?.toLowerCase().includes('yoga') || exercise.name?.toLowerCase().includes('stretching') || exercise.tracking_type === 'time_based';

  const formatWeight = (weight) => {
    if (!weight || weight === 'bodyweight') return 'Bodyweight';
    return weight;
  };

  const formatDuration = (duration) => {
    if (!duration) return 'Not specified';
    
    if (/^\d+$/.test(duration)) {
      return `${duration} seconds`;
    }
    
    if (duration.includes('minute')) {
      return duration;
    }
    
    if (duration.includes('seconds')) {
      return duration.replace(/\s*seconds\s*seconds/g, ' seconds');
    }
    
    return `${duration} seconds`;
  };

  return (
    <Card className="exercise-card">
      {thumbnailUrl && (
        <Box 
          className="thumbnail-container"
          onClick={() => videoId && openVideoModal && openVideoModal(videoId)}
        >
          {isLoading && (
            <Box className="loading-overlay">
              <CircularProgress />
            </Box>
          )}

          {!isLoading && thumbnailUrl && (
            <CardMedia
              component="img"
              image={thumbnailUrl}
              alt={`${exercise.name} demonstration`}
              className="thumbnail-image"
            />
          )}

          {!isLoading && !thumbnailUrl && (
            <Box className="no-thumbnail-overlay">
              <Typography variant="body1" color="text.secondary">
                No thumbnail available
              </Typography>
            </Box>
          )}

          {!isLoading && error && (
            <Box className="error-overlay">
              <Typography color="error">Error loading video</Typography>
            </Box>
          )}

          {videoId && (
            <Box className="play-overlay">
              <Typography variant="h4" className="play-icon">
                ▶
              </Typography>
            </Box>
          )}
        </Box>
      )}

      <CardContent className="exercise-content">
        <Typography variant="h5" component="h2" gutterBottom>
          {exercise.name}
        </Typography>

        <Box className="exercise-metrics">
          {!isCardio && (
            <>
              <Box className="metric-box sets-reps">
                <Typography variant="body2" className="metric-label">
                  🏋️ SETS & REPS
                </Typography>
                <Typography variant="body2" className="metric-value">
                  {exercise.sets?.toString().replace(/\s*sets?\s*/gi, '')} sets of {exercise.reps?.toString().replace(/\s*reps?\s*/gi, '')} reps
                </Typography>
              </Box>

              <Box className="metric-box weight">
                <Typography variant="body2" className="metric-label">
                  💪 WEIGHT
                </Typography>
                <Typography variant="body2" className="metric-value">
                  {formatWeight(exercise.weight)}
                </Typography>
              </Box>

              <Box className="metric-box rest">
                <Typography variant="body2" className="metric-label">
                  ⏲️ REST INTERVAL
                </Typography>
                <Typography variant="body2" className="metric-value">
                  {formatRestTime(exercise.rest_time)} seconds
                </Typography>
              </Box>
            </>
          )}

          {isCardio && (
            <>
              <Box className="metric-box duration">
                <Typography variant="body2" className="metric-label">
                  ⏱️ DURATION
                </Typography>
                <Typography variant="body2" className="metric-value">
                  {formatDuration(exercise.duration)}
                </Typography>
              </Box>

              <Box className="metric-box intensity">
                <Typography variant="body2" className="metric-label">
                  🔥 INTENSITY
                </Typography>
                <Typography variant="body2" className="metric-value capitalize">
                  {exercise.intensity}
                </Typography>
              </Box>
            </>
          )}
        </Box>

        {renderInstructions()}
      </CardContent>
    </Card>
  );
};

ExerciseCard.propTypes = {
  exercise: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string.isRequired,
    sets: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    reps: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    weight: PropTypes.string,
    videoId: PropTypes.string,
    video_id: PropTypes.string,
    thumbnail_url: PropTypes.string,
    instructions: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object
    ]),
    rest_time: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]),
    exercise_type: PropTypes.string,
    type: PropTypes.string,
    duration: PropTypes.string,
    intensity: PropTypes.string
  }).isRequired,
  openVideoModal: PropTypes.func.isRequired
};

export default ExerciseCard;
