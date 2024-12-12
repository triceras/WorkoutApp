// src/components/LogSessionForm.jsx

import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { useFormik, FieldArray, FormikProvider } from 'formik';
import * as Yup from 'yup';
import axiosInstance from '../api/axiosInstance'; // Adjust the import path as needed
import { AuthContext } from '../context/AuthContext'; // Adjust the import path as needed
import {
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  MenuItem,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  IconButton,
  Paper,
  InputAdornment,
  alpha
} from '@mui/material';
import {
  SentimentVeryDissatisfied,
  SentimentDissatisfied,
  SentimentNeutral,
  SentimentSatisfied,
  SentimentVerySatisfied,
  SentimentSatisfiedAlt,
  AddCircle as AddIcon,
  Delete as DeleteIcon,
  FitnessCenter,
  Today,
  Assignment,
  Create
} from '@mui/icons-material';
import {
  DateTime
} from 'luxon';

// Emoji options for feedback
const EMOJIS = [
  { value: 0, icon: <SentimentVeryDissatisfied fontSize="large" />, label: 'Terrible', helpText: 'The workout was too difficult or caused discomfort' },
  { value: 1, icon: <SentimentDissatisfied fontSize="large" />, label: 'Very Bad', helpText: 'The exercises were not suitable or too challenging' },
  { value: 2, icon: <SentimentNeutral fontSize="large" />, label: 'Bad', helpText: 'The workout needs some adjustments' },
  { value: 3, icon: <SentimentSatisfied fontSize="large" />, label: 'Okay', helpText: 'The workout was manageable' },
  { value: 4, icon: <SentimentVerySatisfied fontSize="large" />, label: 'Good', helpText: 'The workout was enjoyable and effective' },
  { value: 5, icon: <SentimentSatisfiedAlt fontSize="large" />, label: 'Awesome', helpText: 'Perfect workout!' },
];

// All workout type options
const WORKOUT_TYPE_OPTIONS = [
  'Cardio',
  'Light Cardio',
  'Strength',
  'Flexibility',
  'Balance',
  'Endurance',
  'Power',
  'Speed',
  'Agility',
  'Plyometric',
  'Core'
];

// Intensity options for aerobic workouts (matching backend choices)
const INTENSITY_OPTIONS = ['Low', 'Moderate', 'High'];

// Exercise types matching backend choices
const EXERCISE_TYPES = [
  'strength',
  'flexibility',
  'balance',
  'endurance',
  'power',
  'speed',
  'agility',
  'plyometric',
  'core',
  'cardio'
];

// Workout types categorized as aerobic
const AEROBIC_WORKOUT_TYPES = ['Cardio', 'Light Cardio', 'Endurance', 'Speed', 'Agility', 'Plyometric', 'Core'];

// Workout types categorized as non-aerobic
const NON_AEROBIC_WORKOUT_TYPES = ['Strength', 'Flexibility', 'Balance', 'Power'];

// Helper function to determine exercise type based on workout type
const getExerciseType = (workoutType, exerciseName) => {
  // Normalize inputs
  const normalizedName = exerciseName?.toLowerCase() || '';
  const normalizedType = workoutType?.toLowerCase() || '';

  // List of known cardio exercises
  const cardioExercises = [
    'running',
    'jogging',
    'cycling',
    'swimming',
    'jumping rope',
    'burpees',
    'mountain climbers',
    'treadmill',
    'elliptical',
    'rowing'
  ];

  // List of known strength exercises
  const strengthExercises = [
    'squat',
    'lunge',
    'leg press',
    'deadlift',
    'bench press',
    'shoulder press',
    'row',
    'pull up',
    'push up',
    'press',
    'curl',
    'extension',
    'raise',
    'fly'
  ];

  // First check if the exercise name matches known exercises
  const isCardio = cardioExercises.some(ex => normalizedName.includes(ex));
  const isStrength = strengthExercises.some(ex => normalizedName.includes(ex));

  if (isCardio) return 'cardio';
  if (isStrength) return 'strength';

  // If no match found, determine by workout type
  const workoutTypeMap = {
    'legs': 'strength',
    'upper body': 'strength',
    'core': 'strength',
    'full body': 'strength',
    'strength': 'strength',
    'cardio': 'cardio',
    'hiit': 'cardio',
    'endurance': 'cardio'
  };

  return workoutTypeMap[normalizedType] || 'strength'; // Default to strength if unknown
};

// Helper function to check if exercise is cardio/endurance type
const isCardioExercise = (exerciseType) => {
  if (!exerciseType) return false;
  const type = String(exerciseType).toLowerCase();
  return ['cardio', 'endurance'].includes(type);
};

// Helper function to extract day number from day string
const extractDayNumber = (dayString) => {
  const match = dayString.match(/Day (\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

// Helper function to parse reps range
const parseReps = (reps) => {
  if (!reps) return '';
  // If it's a range like "8-12", take the higher number
  if (reps.includes('-')) {
    return reps.split('-')[1];
  }
  return reps;
};

// Helper function to parse weight
const parseWeight = (weightStr) => {
  if (!weightStr) return '';
  // Remove 'kg' and trim, then extract number
  const match = weightStr.replace('kg', '').trim().match(/(\d+)/);
  return match ? match[1] : '';
};

// Helper function to parse the reps range
const parseRepsRange = (repsStr) => {
  if (!repsStr) return '';
  const match = repsStr.match(/(\d+)[-–]?(\d+)?/);
  if (match) {
    // If there's a range, take the higher number
    return match[2] || match[1];
  }
  return repsStr;
};

// Helper function to parse setsReps string
const parseSetsReps = (setsReps) => {
  if (!setsReps) return { sets: '3', reps: '12' }; // Default values
  
  try {
    // Try to parse the string if it's in JSON format
    const parsed = JSON.parse(setsReps);
    return {
      sets: parsed.sets?.toString() || '3',
      reps: parsed.reps?.toString() || '12'
    };
  } catch (e) {
    // If it's a string like "3x12", try to parse that format
    const match = setsReps.match(/(\d+)\s*[xX]\s*(\d+)/);
    if (match) {
      return {
        sets: match[1],
        reps: match[2]
      };
    }
    return { sets: '3', reps: '12' }; // Default values if parsing fails
  }
};

// Helper function to parse instructions JSON string
const parseInstructions = (instructionsStr) => {
  try {
    // Remove single quotes and replace with double quotes for valid JSON
    const jsonStr = instructionsStr.replace(/'/g, '"');
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error parsing instructions:', error);
    return null;
  }
};

// Map workout types to valid backend choices
const mapWorkoutType = (type) => {
  const cardioWorkouts = ['Running', 'Jogging', 'HIIT', 'Cardio'];
  type = type?.trim()?.toLowerCase() || '';
  
  if (cardioWorkouts.some(workout => type.includes(workout.toLowerCase()))) {
    return 'Cardio';
  }
  return 'Strength'; // Default to strength for all non-cardio workouts
};

const LogSessionForm = ({ workoutPlans = [], source, onSessionLogged }) => {
  const { user } = useContext(AuthContext);
  const username = user?.first_name || user?.username || 'User';
  const [selectedWorkoutPlan, setSelectedWorkoutPlan] = useState(workoutPlans[0] || null);
  const [currentSession, setCurrentSession] = useState(null);
  const [error, setError] = useState(null);
  const [existingSessions, setExistingSessions] = useState([]);
  const [submissionStatus, setSubmissionStatus] = useState({ success: '', error: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [exercisesLoading, setExercisesLoading] = useState(true);
  const [exercisesError, setExercisesError] = useState(null);
  const [hoverRating, setHoverRating] = useState(null);

  // Helper function to map exercise names to IDs
  const mapExerciseNamesToIds = async (exercises, workoutType) => {
    const updatedAvailableExercises = [...availableExercises];
    const mappedExercises = [];

    for (let ex of exercises) {
      let matchedExercise = updatedAvailableExercises.find(
        (aEx) => aEx.name.trim().toLowerCase() === ex.name.trim().toLowerCase()
      );

      if (!matchedExercise) {
        try {
          const response = await axiosInstance.post('/exercises/', {
            name: ex.name,
            description: ex.description || '',
            video_url: ex.video_url || '',
            videoId: ex.videoId || '',
            exercise_type: ex.exercise_type || (workoutType === 'Cardio' ? 'cardio' : 'strength'),
          });
          matchedExercise = response.data;
          updatedAvailableExercises.push(matchedExercise);
        } catch (error) {
          console.error(`Error creating exercise "${ex.name}":`, error);
          matchedExercise = { id: null, name: ex.name };
        }
      }

      // Preserve all the original exercise data when mapping
      mappedExercises.push({
        ...ex,
        exercise_id: matchedExercise.id,
        name: ex.name,
        exercise_type: ex.exercise_type || (workoutType === 'Cardio' ? 'cardio' : 'strength'),
        tracking_type: ex.tracking_type || 'weight_based',
        sets: ex.sets || '',
        reps: ex.reps || '',
        weight: ex.weight || '',
        duration: ex.duration || '',
        intensity: ex.intensity || '',
        rest_time: ex.rest_time || '',
        avg_heart_rate: '',
        max_heart_rate: '',
      });
    }

    setAvailableExercises(updatedAvailableExercises);
    return mappedExercises;
  };

  // Helper function to get initial form values
  const getInitialFormValues = () => {
    const today = DateTime.local();
    const initialValues = {
      date: today.toFormat('yyyy-MM-dd'),
      workout_type: '',
      workout_plan_id: selectedWorkoutPlan?.id || '',
      exercises: [],
      feedback_rating: 3,
      feedback_notes: '',
    };

    if (selectedWorkoutPlan?.workoutDays) {
      const todayWorkout = selectedWorkoutPlan.workoutDays.find(day => 
        day.type === 'workout'
      );

      if (todayWorkout) {
        initialValues.workout_type = todayWorkout.workout_type;
        initialValues.session_name = todayWorkout.name;
        
        initialValues.exercises = todayWorkout.exercises.map(exercise => {
          // Parse the suggested values
          const suggestedSets = exercise.sets || '3';
          const suggestedReps = parseRepsRange(exercise.reps) || '10-12';
          const suggestedWeight = parseWeight(exercise.weight) || '';

          // Determine the correct exercise type
          const exerciseType = getExerciseType(todayWorkout.workout_type, exercise.name);
          console.log(`Exercise ${exercise.name} type determined as: ${exerciseType}`);

          // Create the exercise object
          const exerciseObj = {
            name: exercise.name,
            exercise_id: exercise.id,
            exercise_type: exerciseType,
            sets: '',
            reps: '',
            weight: '',
            duration: '',
            intensity: '',
            avg_heart_rate: '',
            max_heart_rate: '',
            suggested: {
              sets: suggestedSets,
              reps: suggestedReps,
              weight: suggestedWeight
            }
          };

          // Set appropriate values based on exercise type
          if (exerciseType === 'strength') {
            exerciseObj.sets = suggestedSets;
            exerciseObj.reps = suggestedReps;
            exerciseObj.weight = suggestedWeight;
          } else if (exerciseType === 'cardio') {
            exerciseObj.duration = '30 minutes';
            exerciseObj.intensity = 'Moderate';
          }

          console.log('Created exercise object:', exerciseObj);
          return exerciseObj;
        });
      }
    }

    console.log('Initial form values:', initialValues);
    return initialValues;
  };

  // Helper function to get exercise from workout plan
  const getExerciseFromWorkoutPlan = (exerciseName) => {
    if (!selectedWorkoutPlan?.workoutDays) return null;

    const todayWorkout = selectedWorkoutPlan.workoutDays.find(day => 
      day.type === 'workout'
    );

    if (!todayWorkout) return null;

    const exercise = todayWorkout.exercises.find(e => e.name === exerciseName);
    if (!exercise) return null;

    return {
      sets: exercise.sets || '4',
      reps: exercise.reps || '8-12',
      weight: exercise.weight || '',
      exercise_type: exercise.exercise_type || 'strength'
    };
  };

  // Helper function to render exercise form fields
  const renderExerciseFields = (exercise, index) => {
    const suggestedValues = formik.values.exercises[index].suggested;
    const exerciseType = formik.values.exercises[index].exercise_type;
    const isStrengthExercise = exerciseType === 'strength';
    
    return (
      <Box
        key={index}
        sx={{
          mb: 3,
          bgcolor: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)'
          }
        }}
      >
        {/* Exercise Header */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: { xs: 2, md: 3 },
          bgcolor: '#f8fafc',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
        }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              bgcolor: '#0066cc',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
              boxShadow: '0 4px 12px rgba(0, 102, 204, 0.2)'
            }}
          >
            💪
          </Box>
          <TextField
            fullWidth
            name={`exercises.${index}.name`}
            placeholder="Exercise Name"
            value={exercise.name}
            onChange={formik.handleChange}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: '1.2rem',
                fontWeight: 600,
                color: '#1e293b',
                '&::placeholder': {
                  color: 'rgba(0, 0, 0, 0.3)',
                  fontWeight: 500
                }
              }
            }}
          />
          <IconButton
            onClick={() => formik.arrayHelpers.remove(index)}
            sx={{
              color: '#dc2626',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(220, 38, 38, 0.1)',
                transform: 'scale(1.1)'
              }
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Box>

        {/* Exercise Details */}
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Grid container spacing={3}>
            {/* Sets & Reps */}
            <Grid item xs={12} sm={6}>
              <Typography variant="overline" sx={{ 
                color: '#0066cc',
                fontWeight: 600,
                display: 'block',
                mb: 2,
                fontSize: '0.85rem',
                letterSpacing: '0.1em'
              }}>
                SETS & REPS
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    name={`exercises.${index}.sets`}
                    label="Sets"
                    value={exercise.sets}
                    onChange={formik.handleChange}
                    variant="outlined"
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          '& fieldset': {
                            borderColor: '#0066cc',
                            borderWidth: '2px'
                          }
                        },
                        '&.Mui-focused': {
                          '& fieldset': {
                            borderColor: '#0066cc',
                            borderWidth: '2px'
                          }
                        }
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    name={`exercises.${index}.reps`}
                    label="Reps"
                    value={exercise.reps}
                    onChange={formik.handleChange}
                    variant="outlined"
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          '& fieldset': {
                            borderColor: '#0066cc',
                            borderWidth: '2px'
                          }
                        },
                        '&.Mui-focused': {
                          '& fieldset': {
                            borderColor: '#0066cc',
                            borderWidth: '2px'
                          }
                        }
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Weight */}
            <Grid item xs={12} sm={6}>
              <Typography variant="overline" sx={{ 
                color: '#dc2626',
                fontWeight: 600,
                display: 'block',
                mb: 2,
                fontSize: '0.85rem',
                letterSpacing: '0.1em'
              }}>
                WEIGHT
              </Typography>
              <TextField
                fullWidth
                name={`exercises.${index}.weight`}
                label="Weight (kg)"
                value={exercise.weight}
                onChange={formik.handleChange}
                variant="outlined"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      '& fieldset': {
                        borderColor: '#dc2626',
                        borderWidth: '2px'
                      }
                    },
                    '&.Mui-focused': {
                      '& fieldset': {
                        borderColor: '#dc2626',
                        borderWidth: '2px'
                      }
                    }
                  }
                }}
              />
            </Grid>
          </Grid>
        </Box>
      </Box>
    );
  };

  // Helper function to render feedback section
  const renderFeedbackSection = () => {
    const selectedEmoji = EMOJIS.find(emoji => emoji.value === formik.values.feedback_rating);
    const isNegativeFeedback = formik.values.feedback_rating <= 2;

    const getFeedbackColor = (value) => {
      const colors = {
        0: '#ff1744', // Terrible - Red
        1: '#ff4081', // Very Bad - Pink
        2: '#ff9100', // Bad - Orange
        3: '#00b0ff', // Okay - Light Blue
        4: '#00e676', // Good - Light Green
        5: '#00c853'  // Awesome - Green
      };
      return colors[value] || '#grey';
    };

    const getFeedbackEmoji = (value) => {
      const emojis = {
        0: '😫', // Terrible
        1: '😟', // Very Bad
        2: '😕', // Bad
        3: '😊', // Okay
        4: '😃', // Good
        5: '🤩'  // Awesome
      };
      return emojis[value] || '😐';
    };

    const getFeedbackText = (value) => {
      const texts = {
        0: 'Terrible - Need to adjust the workout',
        1: 'Very Bad - Too challenging',
        2: 'Bad - Could be better',
        3: 'Okay - Decent workout',
        4: 'Good - Feeling strong!',
        5: 'Awesome - Crushed it! 💪'
      };
      return texts[value] || 'How was your workout?';
    };

    return (
      <Box sx={{ mb: 4, mt: 6 }}>
        <Typography variant="h5" sx={{ 
          mb: 3, 
          fontWeight: 600,
          color: '#1976d2',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <span role="img" aria-label="feedback">📝</span> How was your workout?
        </Typography>
        
        <Card sx={{ 
          bgcolor: '#fff',
          borderRadius: 3,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'visible'
        }}>
          <CardContent>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
              mb: 4
            }}>
              {EMOJIS.map((emoji, index) => (
                <Box
                  key={index}
                  onClick={() => formik.setFieldValue('feedback_rating', index)}
                  onMouseEnter={() => setHoverRating(index)}
                  onMouseLeave={() => setHoverRating(null)}
                  sx={{
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    transform: formik.values.feedback_rating === index ? 'scale(1.1)' : 'scale(1)',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    }
                  }}
                >
                  <Box sx={{
                    width: { xs: 60, sm: 80 },
                    height: { xs: 60, sm: 80 },
                    bgcolor: formik.values.feedback_rating === index ? getFeedbackColor(index) : '#f5f5f5',
                    borderRadius: '50%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease-in-out',
                    border: formik.values.feedback_rating === index ? '3px solid' : '2px solid',
                    borderColor: getFeedbackColor(index),
                    '&:hover': {
                      bgcolor: getFeedbackColor(index),
                      '& .feedback-emoji': {
                        color: '#fff',
                      },
                      '& .feedback-text': {
                        opacity: 1,
                        visibility: 'visible',
                      }
                    }
                  }}>
                    <Typography
                      className="feedback-emoji"
                      sx={{
                        fontSize: { xs: '1.5rem', sm: '2rem' },
                        color: formik.values.feedback_rating === index ? '#fff' : getFeedbackColor(index),
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      {getFeedbackEmoji(index)}
                    </Typography>
                  </Box>
                  <Typography
                    className="feedback-text"
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap',
                      fontSize: '0.75rem',
                      color: getFeedbackColor(index),
                      mt: 1,
                      fontWeight: 500,
                      opacity: formik.values.feedback_rating === index ? 1 : 0,
                      visibility: formik.values.feedback_rating === index ? 'visible' : 'hidden',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    {emoji.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Selected Feedback Message */}
            {formik.values.feedback_rating !== null && (
              <Box sx={{
                textAlign: 'center',
                p: 2,
                bgcolor: alpha(getFeedbackColor(formik.values.feedback_rating), 0.1),
                borderRadius: 2,
                mb: 3
              }}>
                <Typography variant="h6" sx={{ color: getFeedbackColor(formik.values.feedback_rating), fontWeight: 600 }}>
                  {getFeedbackText(formik.values.feedback_rating)}
                </Typography>
              </Box>
            )}

            {/* Additional Notes TextField with improved styling */}
            <TextField
              fullWidth
              multiline
              rows={4}
              name="feedback_notes"
              label="Additional Notes (optional)"
              value={formik.values.feedback_notes}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.feedback_notes && Boolean(formik.errors.feedback_notes)}
              helperText={formik.touched.feedback_notes && formik.errors.feedback_notes}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: '#f8f9fa',
                  '&:hover': {
                    bgcolor: '#f3f4f6',
                  },
                  '&.Mui-focused': {
                    bgcolor: '#fff',
                  }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Create sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              placeholder="Share your thoughts about today's workout..."
            />
          </CardContent>
        </Card>
      </Box>
    );
  };

  // Initialize Formik
  const formik = useFormik({
    initialValues: getInitialFormValues(),
    enableReinitialize: true,
    validationSchema: Yup.object().shape({
      date: Yup.date().required('Date is required'),
      workout_type: Yup.string()
        .required('Workout type is required'),
      workout_plan_id: Yup.string()
        .required('Workout plan is required'),
      exercises: Yup.array()
        .min(1, 'At least one exercise is required')
        .of(
          Yup.object().shape({
            name: Yup.string().required('Exercise name is required'),
            exercise_type: Yup.string().required('Exercise type is required'),
            sets: Yup.string().when('exercise_type', {
              is: 'strength',
              then: schema => schema.required('Sets are required for strength exercises')
            }),
            reps: Yup.string().when('exercise_type', {
              is: 'strength',
              then: schema => schema.required('Reps are required for strength exercises')
            }),
            weight: Yup.string().when('exercise_type', {
              is: 'strength',
              then: schema => schema.required('Weight is required for strength exercises')
            }),
            duration: Yup.string().when('exercise_type', {
              is: 'cardio',
              then: schema => schema.required('Duration is required for cardio exercises')
            }),
            intensity: Yup.string().when('exercise_type', {
              is: 'cardio',
              then: schema => schema.required('Intensity is required for cardio exercises')
            })
          })
        ),
      feedback_rating: Yup.number().required('Please rate your workout'),
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsSubmitting(true);
      setSubmissionStatus({ success: '', error: '' });

      try {
        // Transform exercises data based on type
        const transformedExercises = values.exercises.map(exercise => {
          // Consider it cardio only if duration is present
          const isCardio = Boolean(exercise.duration);
          
          return {
            exercise_id: exercise.exercise_id,
            name: exercise.name,
            exercise_type: isCardio ? 'cardio' : 'strength',
            tracking_type: isCardio ? 'time_based' : 'reps_based',
            duration: isCardio ? parseInt(exercise.duration) : null,
            intensity: isCardio ? exercise.intensity || 'Moderate' : null,
            sets: !isCardio ? parseInt(exercise.sets) : null,
            reps: !isCardio ? parseInt(exercise.reps) : null,
            weight: !isCardio && exercise.weight ? parseFloat(exercise.weight) : null
          };
        });

        const mappedWorkoutType = mapWorkoutType(values.workout_type);
        const sessionData = {
          workout_plan_id: values.workout_plan_id || selectedWorkoutPlan?.id,
          workout_type: mappedWorkoutType,
          exercises: transformedExercises,
          user: user.id,
          date: values.date,
          feedback_rating: values.feedback_rating,
          feedback_notes: values.feedback_notes,
          source: source || 'completed',
          time: null
        };

        // Only set time for cardio workouts
        if (mappedWorkoutType === 'Cardio') {
          const cardioExercise = transformedExercises.find(ex => ex.exercise_type === 'cardio');
          if (cardioExercise?.duration) {
            sessionData.time = parseInt(cardioExercise.duration);
          }
        }

        console.log('Creating training session with data:', sessionData);
        const response = await axiosInstance.post('/training_sessions/', sessionData);
        
        setSubmissionStatus({
          success: 'Session logged successfully!',
          error: ''
        });

        if (onSessionLogged) {
          onSessionLogged(response.data);
        }

        resetForm();
      } catch (error) {
        console.error('Error submitting session:', error.response?.data || error);
        setSubmissionStatus({
          success: '',
          error: error.response?.data?.detail || 'Failed to log session. Please try again.'
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Effect to update workout type if it's not in valid options
  useEffect(() => {
    if (currentSession?.workout_type && !WORKOUT_TYPE_OPTIONS.includes(currentSession.workout_type)) {
      if (formik) {
        formik.setFieldValue('workout_type', 'Cardio');
      }
    }
  }, [currentSession]);

  // Effect for form validation debugging
  useEffect(() => {
    console.log('Form validation state:', {
      isValid: formik.isValid,
      errors: formik.errors,
      values: formik.values,
      touched: formik.touched
    });

    // Add detailed logging for each exercise
    if (formik.values.exercises) {
      formik.values.exercises.forEach((exercise, index) => {
        console.log(`Exercise ${index + 1} validation:`, {
          exercise,
          errors: formik.errors.exercises?.[index],
          touched: formik.touched.exercises?.[index]
        });
      });
    }
  }, [formik.values, formik.errors, formik.touched]);

  // Effect to fetch exercises
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const response = await axiosInstance.get('/exercises/');
        setAvailableExercises(response.data);
        setExercisesLoading(false);
      } catch (error) {
        console.error('Error fetching exercises:', error);
        setExercisesError('Failed to load exercises. Please try again later.');
        setExercisesLoading(false);
      }
    };

    fetchExercises();
  }, []);

  // Effect to set selected workout plan
  useEffect(() => {
    if (workoutPlans.length > 0 && !selectedWorkoutPlan) {
      setSelectedWorkoutPlan(workoutPlans[0]);
    }
  }, [workoutPlans, selectedWorkoutPlan]);

  // Effect to handle workout plan selection
  useEffect(() => {
    if (workoutPlans.length > 0 && selectedWorkoutPlan) {
      const plan = workoutPlans.find(p => p.id === selectedWorkoutPlan.id);
      if (plan) {
        setSelectedWorkoutPlan(plan);
      }
    }
  }, [workoutPlans, selectedWorkoutPlan]);

  // Effect to determine current workout session based on workoutPlans
  useEffect(() => {
    if (workoutPlans.length > 0) {
      const plan = workoutPlans[0]; // Assuming the first plan is current
      console.log('Initial plan:', plan);

      if (plan.workoutDays && plan.workoutDays.length > 0) {
        const updatedWorkoutDays = plan.workoutDays.map((day) => {
          console.log('Processing day:', day);
          return {
            ...day,
            dayNumber: extractDayNumber(day.day) || 0,
            exercises: (day.exercises || []).map((exercise) => {
              console.log('Processing exercise:', exercise);
              return {
                ...exercise,
                sets: exercise.sets !== undefined ? exercise.sets : '',
                reps: exercise.reps !== undefined ? exercise.reps : '',
                weight: exercise.weight !== undefined ? exercise.weight : '',
                duration: exercise.duration || '30 minutes',
                intensity: exercise.intensity || 'Low'
              };
            }),
          };
        });

        console.log('Updated workout days:', updatedWorkoutDays);
        
        const todayWeekday = DateTime.local().weekday;
        console.log('Today weekday:', todayWeekday);
        console.log('Updated workout days:', updatedWorkoutDays);
        
        const currentWorkoutDay = updatedWorkoutDays.find(
          (day) => {
            const dayNum = extractDayNumber(day.day);
            console.log(`Day ${day.day} -> number ${dayNum}`);
            return dayNum === todayWeekday;
          }
        );

        console.log('Found current workout day:', currentWorkoutDay);

        if (currentWorkoutDay) {
          if (currentWorkoutDay.type === 'rest') {
            setCurrentSession(null);
            setError('Today is a rest day. No session to log.');
          } else {
            // Process exercises based on workout type
            const processedExercises = currentWorkoutDay.exercises.map(exercise => {
              console.log('Processing exercise for session:', exercise);
              
              // Determine exercise type using our helper function
              const exerciseType = getExerciseType(currentWorkoutDay.workout_type, exercise.name);
              console.log(`Determined exercise type for ${exercise.name}:`, exerciseType);

              // Get suggested values
              const suggestedSets = exercise.sets || '3';
              const suggestedReps = exercise.reps || '10-12';
              const suggestedWeight = exercise.weight || '';

              const processedExercise = {
                ...exercise,
                exercise_type: exerciseType,
                tracking_type: exerciseType === 'cardio' ? 'time_based' : 'weight_based',
                // Set appropriate fields based on exercise type
                sets: exerciseType === 'strength' ? suggestedSets : null,
                reps: exerciseType === 'strength' ? suggestedReps : null,
                weight: exerciseType === 'strength' ? suggestedWeight : null,
                duration: exerciseType === 'cardio' ? (exercise.duration || '30 minutes') : null,
                intensity: exerciseType === 'cardio' ? (exercise.intensity || 'Moderate') : null,
                suggested: {
                  sets: suggestedSets,
                  reps: suggestedReps,
                  weight: suggestedWeight
                }
              };
              
              console.log('Processed exercise:', processedExercise);
              return processedExercise;
            });

            const session = {
              ...currentWorkoutDay,
              exercises: processedExercises
            };
            console.log('Setting current session:', session);
            setCurrentSession(session);
            setError(null);
          }
        } else {
          setCurrentSession(null);
          setError('No workout scheduled for today.');
        }
      }
    }
  }, [workoutPlans]);

  // Effect to fetch existing sessions for today to prevent duplicate logging
  useEffect(() => {
    const fetchExistingSessions = async () => {
      if (!currentSession || workoutPlans.length === 0) return;

      try {
        const today = DateTime.local().toISODate();

        const response = await axiosInstance.get('/training_sessions/', {
          params: {
            date: today,
            workout_plan_id: workoutPlans[0].id,
          },
        });

        const sessions = response.data;

        // Check if any of the sessions match the current session's workout_type and date
        const sessionLoggedToday = sessions.some(
          (session) => session.workout_type === currentSession.workout_type && session.date === today
        );

        setExistingSessions(sessionLoggedToday ? [currentSession.workout_type] : []);
      } catch (error) {
        console.error('Error fetching existing sessions:', error);
      }
    };

    fetchExistingSessions();
  }, [currentSession, workoutPlans]);

  // Effect to initialize form when current session changes
  useEffect(() => {
    const initializeExercises = async () => {
      if (currentSession) {
        formik.setFieldValue('workout_type', currentSession.workout_type);
        formik.setFieldValue('session_name', currentSession.day);

        // Always set exercises based on currentSession
        const mappedExercises = await mapExerciseNamesToIds(currentSession.exercises, currentSession.workout_type);
        formik.setFieldValue(
          'exercises',
          mappedExercises.map((ex) => ({
            exercise_id: ex.exercise_id || '',
            exercise_type: ex.exercise_type || '',
            name: ex.name || '',
            sets: ex.sets || '',
            reps: ex.reps || '',
            weight: ex.weight || '',
            duration: ex.duration || '',
            avg_heart_rate: '',
            max_heart_rate: '',
            intensity: '',
          }))
        );
      }
    };

    initializeExercises();
  }, [currentSession]);

  // Effect to check if the current session has already been logged today
  useEffect(() => {
    if (existingSessions.length > 0) {
      setError('You have already logged this session for today.');
    } else {
      // Clear the error if no existing sessions
      if (error === 'You have already logged this session for today.') {
        setError(null);
      }
    }
  }, [existingSessions, error]);

  // Render different states
  if (submissionStatus.success) {
    return (
      <Box sx={{ textAlign: 'center', my: 4 }}>
        <Typography variant="h6" color="success.main">
          {submissionStatus.success}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Your feedback has been received and will be used to improve your workout plan.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          sx={{ mt: 3 }}
          onClick={() => {
            setSubmissionStatus({ success: '', error: '' });
            setCurrentSession(null);
          }}
        >
          Log Another Session
        </Button>
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body1" color="error" align="center">
        {error}
      </Typography>
    );
  }

  if (!currentSession) {
    return (
      <Typography variant="body1" align="center">
        Loading session information...
      </Typography>
    );
  }

  if (existingSessions.length > 0) {
    return (
      <Typography variant="body1" color="error" align="center">
        You have already logged this session for today.
      </Typography>
    );
  }

  if (exercisesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
        <Typography variant="h6" style={{ marginLeft: '10px' }}>
          Loading exercises...
        </Typography>
      </Box>
    );
  }

  if (exercisesError) {
    return (
      <Typography variant="body1" color="error" align="center">
        {exercisesError}
      </Typography>
    );
  }

  // Main form render
  return (
    <FormikProvider value={formik}>
      <form onSubmit={formik.handleSubmit}>
        <Box sx={{ p: 3 }}>
          {/* Header Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              Log Training Session
            </Typography>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              {/* Day Card */}
              <Grid item xs={12} sm={4}>
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
                      📅
                    </Box>
                    <Box>
                      <Typography variant="overline" sx={{ color: '#1976d2', fontWeight: 600 }}>
                        DAY
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        Day {formik.values.day || '5'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Date Card */}
              <Grid item xs={12} sm={4}>
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
                      📆
                    </Box>
                    <Box>
                      <Typography variant="overline" sx={{ color: '#d81b60', fontWeight: 600 }}>
                        DATE
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        {DateTime.fromISO(formik.values.date || '2024-12-13').toFormat('dd/MM/yyyy')}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Workout Type Card */}
              <Grid item xs={12} sm={4}>
                <Card sx={{ 
                  bgcolor: '#f3e5f5',
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
                      bgcolor: '#7b1fa2',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem'
                    }}>
                      🏋️
                    </Box>
                    <Box>
                      <Typography variant="overline" sx={{ color: '#7b1fa2', fontWeight: 600 }}>
                        WORKOUT TYPE
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        {formik.values.workout_type || 'Shoulders & Abs'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>

          {/* Exercise List */}
          <Box sx={{ mt: 2 }}>
            <FieldArray
              name="exercises"
              render={(arrayHelpers) => (
                <div>
                  {formik.values.exercises.map((exercise, index) => (
                    <div key={index}>
                      {renderExerciseFields(exercise, index)}
                    </div>
                  ))}
                  <Button
                    variant="contained"
                    onClick={() => arrayHelpers.push({ name: '', sets: '', reps: '', weight: '' })}
                    startIcon={<AddIcon />}
                    sx={{
                      mt: 3,
                      bgcolor: '#0066cc',
                      borderRadius: '12px',
                      py: 1.5,
                      px: 4,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '1rem',
                      boxShadow: '0 4px 12px rgba(0, 102, 204, 0.2)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: '#0052a3',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 16px rgba(0, 102, 204, 0.3)'
                      }
                    }}
                  >
                    Add Exercise
                  </Button>
                </div>
              )}
            />
          </Box>

          {/* Feedback Section */}
          {renderFeedbackSection()}

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={formik.isSubmitting}
              sx={{
                minWidth: 200,
                py: 2,
                px: 6,
                borderRadius: '16px',
                fontWeight: 700,
                fontSize: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.25)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 32px rgba(59, 130, 246, 0.35)',
                  background: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)'
                },
                '&:active': {
                  transform: 'translateY(0)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                },
                '&:disabled': {
                  background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                  boxShadow: 'none'
                }
              }}
            >
              {formik.isSubmitting ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={20} color="inherit" />
                  <span>Logging...</span>
                </Box>
              ) : (
                'LOG SESSION'
              )}
            </Button>
          </Box>
        </Box>
      </form>
    </FormikProvider>
  );
};

LogSessionForm.propTypes = {
  workoutPlans: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      user: PropTypes.shape({
        id: PropTypes.number.isRequired,
        username: PropTypes.string, // Make username optional
      }).isRequired,
      workoutDays: PropTypes.arrayOf(
        PropTypes.shape({
          day: PropTypes.string.isRequired, // Existing field
          dayNumber: PropTypes.number, // Made optional temporarily
          type: PropTypes.oneOf(['workout', 'rest', 'active_recovery']).isRequired, // **Updated to include 'active_recovery'**
          duration: PropTypes.string,
          workout_type: PropTypes.string.isRequired, // Ensure workout_type is included
          exercises: PropTypes.arrayOf(
            PropTypes.shape({
              name: PropTypes.string.isRequired,
              setsReps: PropTypes.string.isRequired,
              equipment: PropTypes.string.isRequired,
              videoId: PropTypes.string,
              exercise_type: PropTypes.string,
              tracking_type: PropTypes.string,
              weight: PropTypes.string,
              sets: PropTypes.string,
              reps: PropTypes.string,
              rest_time: PropTypes.string,
              duration: PropTypes.string,
              intensity: PropTypes.string
            })
          ),
        })
      ).isRequired,
      additionalTips: PropTypes.arrayOf(PropTypes.string).isRequired,
      created_at: PropTypes.string.isRequired,
    })
  ).isRequired,
  source: PropTypes.oneOf(['dashboard', 'profile']).isRequired,
  onSessionLogged: PropTypes.func.isRequired,
};

// No defaultProps used; default values are set via default parameters in the function signature

export default LogSessionForm;
