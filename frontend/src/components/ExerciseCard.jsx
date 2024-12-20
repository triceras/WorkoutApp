// src/components/ExerciseCard.jsx
import React, { useState, useEffect } from 'react';
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
  console.log('Exercise data:', exercise);
  
  // Get videoId and thumbnailUrl from the exercise data
  const [videoId, setVideoId] = useState(exercise.videoId || exercise.video_id);
  const [thumbnailUrl, setThumbnailUrl] = useState(exercise.thumbnail_url);
  const [isLoading, setIsLoading] = useState(false); // Define isLoading
  const [error, setError] = useState(null); // Define error
  
  console.log('Using videoId:', videoId);
  console.log('Using thumbnailUrl:', thumbnailUrl);

  // src/components/ExerciseCard.jsx
  useEffect(() => {
    const fetchVideoDetails = async () => {
      console.log("Fetching video details for:", exercise.name);
      if (!videoId && exercise.name) {
        setIsLoading(true);
        setError(null);
        try {
          // Fetch exercise details from the database using the exercise name
          const exerciseResponse = await axiosInstance.get(`exercises/`, {
            params: { name: exercise.name },
          });
   
          if (exerciseResponse.data.length > 0) {
            const fetchedExercise = exerciseResponse.data[0];
            
            // Check for both videoId and video_id
            const videoIdToUse = fetchedExercise.videoId || fetchedExercise.video_id;
            const thumbnailUrlToUse = fetchedExercise.thumbnail_url;
            
            if (videoIdToUse) {
              setVideoId(videoIdToUse);
              setThumbnailUrl(thumbnailUrlToUse);
              console.log(
                "Video details found in the database:",
                videoIdToUse
              );
              return;
            }
            
            // If no video details found, try to fetch them
            const videoResponse = await axiosInstance.patch(
              `exercises/${fetchedExercise.id}/fetch-video/`
            );
            
            if (videoResponse.data) {
              const updatedExercise = videoResponse.data;
              setVideoId(updatedExercise.videoId || updatedExercise.video_id);
              setThumbnailUrl(updatedExercise.thumbnail_url);
              console.log("Video details fetched and updated:", updatedExercise);
            }
          }
   
          // If not found or no videoId, log an error as this should not happen 
          // if the backend is assigning video details correctly
          console.error(
            "Exercise found but video details are missing for:",
            exercise.name
          );
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
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" color="text.primary" gutterBottom>
          Instructions
        </Typography>
        {parsedInstructions.setup && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Setup:
            </Typography>
            <Typography variant="body2">{parsedInstructions.setup}</Typography>
          </Box>
        )}

        {parsedInstructions.execution && parsedInstructions.execution.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Execution:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {parsedInstructions.execution.map((step, index) => (
                <li key={index}>
                  <Typography variant="body2">{step}</Typography>
                </li>
              ))}
            </ul>
          </Box>
        )}

        {parsedInstructions.form_tips && parsedInstructions.form_tips.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Form Tips:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
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

  // Use the exercise type from the data or default to 'strength'
  const exerciseType = exercise.exercise_type || 'strength';
    
  // Determine if exercise is cardio or not based on the exercise type
  const isCardio = exerciseType === 'cardio' || exercise.type === 'cardio' || exercise.type === 'active_recovery' || exercise.type === 'recovery' || exercise.name?.toLowerCase().includes('yoga') || exercise.name?.toLowerCase().includes('stretching');

    // Format weight display
    const formatWeight = (weight) => {
      if (!weight || weight === 'bodyweight') return 'Bodyweight';
        return weight.includes('kg') ? weight : `${weight} kg`;
    };

  return (
    <Card sx={{ 
      height: '100%',
      borderRadius: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      overflow: 'visible',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {thumbnailUrl && (
        <Box 
          sx={{ 
            position: 'relative',
            cursor: videoId ? 'pointer' : 'default',
            borderRadius: '16px 16px 0 0',
            overflow: 'hidden',
            paddingTop: '56.25%', // 16:9 aspect ratio
          }}
          onClick={() => videoId && openVideoModal && openVideoModal(videoId)}
        >
           {isLoading && ( // Use isLoading state
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0, 0, 0, 0.1)',
              }}
            >
              <CircularProgress /> {/* Use CircularProgress */}
            </Box>
          )}

          {!isLoading && thumbnailUrl && (
            <CardMedia
              component="img"
              image={thumbnailUrl}
              alt={`${exercise.name} demonstration`}
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "transform 0.3s ease",
                "&:hover": {
                  transform: videoId ? "scale(1.05)" : "none",
                },
              }}
            />
          )}

          {!isLoading && !thumbnailUrl && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "rgba(0, 0, 0, 0.1)",
              }}
            >
               <Typography variant="body1" color="text.secondary">
                No thumbnail available
              </Typography>
            </Box>
          )}

          {!isLoading && error && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "rgba(255, 0, 0, 0.1)",
              }}
            >
             <Typography color="error">Error loading video</Typography>
            </Box>
          )}
          {videoId && (
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
              <Typography 
                variant="h4" 
                sx={{ 
                  color: 'white',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                }}
              >
                ▶
              </Typography>
            </Box>
          )}
        </Box>
      )}
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h5" component="h2" gutterBottom>
          {exercise.name}
        </Typography>

        {/* Exercise metrics */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          {!isCardio && (
            <>
              <Box sx={{ 
                bgcolor: '#E3F2FD', 
                p: 1, 
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Typography variant="body2" color="text.secondary">
                  🏋️ SETS & REPS
                </Typography>
                <Typography variant="body2">
                  {exercise.sets} sets of {exercise.reps} reps
                </Typography>
              </Box>

              <Box sx={{ 
                bgcolor: '#FCE4EC', 
                p: 1, 
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Typography variant="body2" color="text.secondary">
                  💪 WEIGHT
                </Typography>
                <Typography variant="body2">
                  {formatWeight(exercise.weight)}
                </Typography>
              </Box>

              <Box sx={{ 
                bgcolor: '#E8F5E9', 
                p: 1, 
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Typography variant="body2" color="text.secondary">
                  ⏲️ REST INTERVAL
                </Typography>
                <Typography variant="body2">
                  {exercise.rest_time} seconds
                </Typography>
              </Box>
            </>
          )}

          {isCardio && (
            <>
              <Box sx={{ 
                bgcolor: '#FFF3E0', 
                p: 1, 
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Typography variant="body2" color="text.secondary">
                  ⏱️ DURATION
                </Typography>
                <Typography variant="body2">
                  {exercise.duration}
                </Typography>
              </Box>

              <Box sx={{ 
                bgcolor: '#F3E5F5', 
                p: 1, 
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Typography variant="body2" color="text.secondary">
                  🔥 INTENSITY
                </Typography>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {exercise.intensity}
                </Typography>
              </Box>
            </>
          )}
        </Box>

        {/* Instructions Section */}
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
    rest_time: PropTypes.string,
    exercise_type: PropTypes.string,
    type: PropTypes.string,
    duration: PropTypes.string,
    intensity: PropTypes.string
  }).isRequired,
  openVideoModal: PropTypes.func.isRequired
};

export default ExerciseCard;
