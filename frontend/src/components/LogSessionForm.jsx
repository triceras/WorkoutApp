import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { useFormik, FieldArray, FormikProvider } from 'formik';
import * as Yup from 'yup';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import {
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  IconButton,
  InputAdornment,
  alpha,
  Autocomplete
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
  Assignment
} from '@mui/icons-material';

// Emoji options for feedback
const EMOJIS = [
  { value: 0, icon: <SentimentVeryDissatisfied fontSize="large" />, label: 'Terrible', helpText: 'The workout was too difficult or caused discomfort' },
  { value: 1, icon: <SentimentDissatisfied fontSize="large" />, label: 'Very Bad', helpText: 'The exercises were not suitable or too challenging' },
  { value: 2, icon: <SentimentNeutral fontSize="large" />, label: 'Bad', helpText: 'The workout needs some adjustments' },
  { value: 3, icon: <SentimentSatisfied fontSize="large" />, label: 'Okay', helpText: 'The workout was manageable' },
  { value: 4, icon: <SentimentVerySatisfied fontSize="large" />, label: 'Good', helpText: 'The workout was enjoyable and effective' },
  { value: 5, icon: <SentimentSatisfiedAlt fontSize="large" />, label: 'Awesome', helpText: 'Perfect workout!' },
];

// All workout type options matching backend choices
const WORKOUT_TYPE_CHOICES = [
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
  'Core',
  'Chest & Triceps',
  'Back & Biceps',
  'Shoulders & Abs',
  'Legs',
  'Full Body',
  'Upper Body',
  'Lower Body',
  'Push',
  'Pull',
  'HIIT',
  'Recovery'
];

// Helper function to get valid workout type
const getValidWorkoutType = (type) => {
  if (!type) return 'Strength';
  
  // Try exact match first
  const exactMatch = WORKOUT_TYPE_CHOICES.find(choice => choice === type);
  if (exactMatch) return exactMatch;
  
  // Try case-insensitive match
  const matchingType = WORKOUT_TYPE_CHOICES.find(
    choice => choice.toLowerCase() === type.toLowerCase()
  );
  return matchingType || 'Strength';
};

// Intensity options for aerobic workouts (matching backend choices)
const INTENSITY_OPTIONS = ['Low', 'Moderate', 'High'];

// Helper function to parse instructions JSON string
const parseInstructions = (instructionsStr) => {
  try {
    const jsonStr = instructionsStr.replace(/'/g, '"');
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error parsing instructions:', error);
    return null;
  }
};

const LogSessionForm = ({
  workoutPlans = [],
  currentWorkout = null,
  source = 'manual',
  onSessionLogged = () => {}
}) => {
  const { user } = useContext(AuthContext);
  const username = user?.first_name || user?.username || 'User';
  const [submissionStatus, setSubmissionStatus] = useState({ success: '', error: '' });
  const [availableExercises, setAvailableExercises] = useState([]);
  const [exercisesLoading, setExercisesLoading] = useState(true);
  const [exercisesError, setExercisesError] = useState(null);
  const [focusedFields, setFocusedFields] = React.useState({});

  const handleFieldFocus = (index, field) => {
    setFocusedFields(prev => ({
      ...prev,
      [`${index}-${field}`]: true
    }));
  };

  const handleFieldBlur = (index, field) => {
    setFocusedFields(prev => ({
      ...prev,
      [`${index}-${field}`]: false
    }));
  };

  // Fetch available exercises
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setExercisesLoading(true);
        const response = await axiosInstance.get('exercises/');
        const exercises = response.data.map(exercise => ({
          ...exercise,
          exercise_type: exercise.exercise_type || (exercise.name.toLowerCase().includes('bike') ? 'cardio' : 'strength'),
          tracking_type: exercise.exercise_type === 'cardio' || exercise.name.toLowerCase().includes('bike') ? 'time_based' : 'weight_based'
        }));
        setAvailableExercises(exercises);
        setExercisesLoading(false);
      } catch (error) {
        console.error('Error fetching exercises:', error);
        setExercisesError('Failed to load exercises');
        setExercisesLoading(false);
      }
    };

    fetchExercises();
  }, [axiosInstance, setAvailableExercises]);

  // Get initial form values
  const getInitialFormValues = () => {
    const today = new Date().toISOString().split('T')[0];
    const dayNumber = new Date().getDay();
    
    let initialValues = {
      session_name: currentWorkout?.name || `Day ${dayNumber}: Workout`,
      workout_type: currentWorkout?.workout_type || 'Strength',
      session_date: today,
      heart_rate_pre: '',
      heart_rate_post: '',
      calories_burned: '',
      feedback_rating: 3,
      comments: '',
      exercises: []
    };

    console.log('Current workout data:', currentWorkout);

    if (currentWorkout?.exercises?.length > 0) {
      initialValues.exercises = currentWorkout.exercises.map(exercise => {
        // First check exercise_type from the exercise data, fallback to name-based detection
        const exerciseType = exercise.exercise_type || (exercise.name.toLowerCase().includes('bike') ? 'cardio' : 'strength');
        const isCardio = exerciseType === 'cardio';
        
        console.log(`Processing exercise: ${exercise.name}, Type: ${exerciseType}, IsCardio: ${isCardio}`);
        
        return {
          name: exercise.name || '',
          exercise_id: exercise.id || null,
          exercise_type: exerciseType,
          sets: isCardio ? '' : '3',
          reps: isCardio ? '' : '12',
          weight: isCardio ? '' : '',
          duration: isCardio ? '30' : '',
          intensity: isCardio ? 'Moderate' : '',
          avg_heart_rate: exercise.avg_heart_rate || '',
          max_heart_rate: exercise.max_heart_rate || '',
          tracking_type: isCardio ? 'time_based' : 'weight_based',
          videoId: exercise.videoId || '',
          instructions: exercise.instructions || '',
          equipment: exercise.equipment || ''
        };
      });
    }

    console.log('Initial form values:', initialValues);
    return initialValues;
  };

  // Handle form submission
  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    try {
      console.log('Starting form submission...');
      console.log('Form values:', values);

      // First, get the exercise IDs from the API
      const exerciseResponse = await axiosInstance.get('exercises/');
      console.log('Fetched exercises from API:', exerciseResponse.data);

      

      // Prepare the session data
      const sessionData = {
        ...values,
        comments: values.comments || '',
        exercises: values.exercises.map(exercise => {
          console.log(`Processing exercise for submission: ${exercise.name}`);
          const isCardio = exercise.exercise_type === 'cardio';

          // Enhanced exercise ID mapping with case-insensitive comparison
          let exerciseIdToUse = null;
          if (exercise.exercise_id) {
            exerciseIdToUse = exercise.exercise_id; // Use existing ID if available (from autocomplete)
          } else {
            const matchingExercise = exerciseResponse.data.find(apiExercise =>
              apiExercise.name.trim().toLowerCase() === exercise.name.trim().toLowerCase()
            );
            exerciseIdToUse = matchingExercise ? matchingExercise.id : null;
          }

          if (!exerciseIdToUse) {
            console.warn(`No matching exercise found for ${exercise.name}. Submission may fail.`);
          }
          
          return {
            ...exercise,
            exercise_id: exerciseIdToUse,
            sets: isCardio ? null : exercise.sets,
            reps: isCardio ? null : exercise.reps,
            weight: isCardio ? null : exercise.weight,
            duration: isCardio ? exercise.duration : null,
            intensity: isCardio ? exercise.intensity : null,
          };
        })
      };

       // Check for missing exercise IDs before submitting
      const missingExerciseIds = sessionData.exercises.filter(ex => !ex.exercise_id);
      if (missingExerciseIds.length > 0) {
        setErrors({ submit: 'One or more exercises are invalid. Please select valid exercises.' });
        setSubmitting(false);
        return;
      }

      console.log('Prepared session data:', sessionData);

      // Submit the session
      const response = await axiosInstance.post('training-sessions/', sessionData);
      console.log('Session submission successful:', response.data);

      setSubmissionStatus({ success: 'Training session logged successfully!', error: '' });
      onSessionLogged(response.data);
    } catch (error) {
      console.error('Error submitting session:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to log training session';
      setSubmissionStatus({ success: '', error: errorMessage });
      setErrors({ submit: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  // Initialize formik
  const formik = useFormik({
    initialValues: getInitialFormValues(),
    validationSchema: Yup.object({
      session_name: Yup.string().required('Session name is required'),
      workout_type: Yup.string().required('Workout type is required'),
      session_date: Yup.string().required('Session date is required'),
      exercises: Yup.array().of(
        Yup.object({
          name: Yup.string().required('Exercise name is required'),
          exercise_id: Yup.number().nullable(),
          exercise_type: Yup.string(),
          sets: Yup.number().nullable().transform((value) => (isNaN(value) ? null : value)),
          reps: Yup.number().nullable().transform((value) => (isNaN(value) ? null : value)),
          weight: Yup.number().nullable().transform((value) => (isNaN(value) ? null : value)),
          duration: Yup.number().nullable().transform((value) => (isNaN(value) ? null : value)),
          intensity: Yup.string(),
          avg_heart_rate: Yup.number().nullable().transform((value) => (isNaN(value) ? null : value)),
          max_heart_rate: Yup.number().nullable().transform((value) => (isNaN(value) ? null : value)),
          tracking_type: Yup.string(),
          videoId: Yup.string().nullable(),
          instructions: Yup.string().nullable(),
          equipment: Yup.string().nullable()
        })
      ).min(1, 'At least one exercise is required'),
      feedback_rating: Yup.number().required('Please rate your session'),
      comments: Yup.string(),
      heart_rate_pre: Yup.number().nullable().transform((value) => (isNaN(value) ? null : value)),
      heart_rate_post: Yup.number().nullable().transform((value) => (isNaN(value) ? null : value)),
      calories_burned: Yup.number().nullable().transform((value) => (isNaN(value) ? null : value))
    }),
    onSubmit: handleSubmit
  });

  return (
    <FormikProvider value={formik}>
      <form onSubmit={formik.handleSubmit} noValidate>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Session Details */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <Assignment /> Session Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        id="session_name"
                        name="session_name"
                        label="Session Name"
                        value={formik.values.session_name}
                        onChange={formik.handleChange}
                        error={formik.touched.session_name && Boolean(formik.errors.session_name)}
                        helperText={formik.touched.session_name && formik.errors.session_name}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>Workout Type</InputLabel>
                        <Select
                          id="workout_type"
                          name="workout_type"
                          value={formik.values.workout_type}
                          onChange={formik.handleChange}
                          error={formik.touched.workout_type && Boolean(formik.errors.workout_type)}
                        >
                          {WORKOUT_TYPE_CHOICES.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                        {formik.touched.workout_type && formik.errors.workout_type && (
                          <FormHelperText error>{formik.errors.workout_type}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        id="session_date"
                        name="session_date"
                        label="Session Date"
                        type="date"
                        value={formik.values.session_date}
                        InputProps={{
                          readOnly: true,
                        }}
                        sx={{ opacity: 0.7 }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Exercises */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <FitnessCenter /> Exercises
                  </Typography>
                  <FieldArray
                    name="exercises"
                    render={arrayHelpers => (
                      <div>
                        {formik.values.exercises.map((exercise, index) => (
                          <Box key={index} sx={{ mb: 2, p: 2, bgcolor: alpha('#000', 0.02), borderRadius: 1 }}>
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} sm={4}>
                                <Autocomplete
                                  options={availableExercises}
                                  getOptionLabel={(option) => option.name || ''}
                                  value={availableExercises.find(ex => ex.id === exercise.exercise_id) || null} // Find the exercise object or null
                                  onChange={(event, newValue) => {
                                    formik.setFieldValue(`exercises.${index}.name`, newValue?.name || '');
                                    formik.setFieldValue(`exercises.${index}.exercise_id`, newValue?.id || null); // Store the ID directly
                                    // Set exercise type and determine if it's time-based
                                    const exerciseType = newValue?.exercise_type || 'strength';
                                    const isTimeBased = ['cardio', 'endurance'].includes(exerciseType);

                                    formik.setFieldValue(`exercises.${index}.exercise_type`, exerciseType);
                                    formik.setFieldValue(`exercises.${index}.tracking_type`, isTimeBased ? 'time_based' : 'weight_based');

                                    // Reset fields based on tracking type
                                    if (isTimeBased) {
                                      formik.setFieldValue(`exercises.${index}.sets`, '');
                                      formik.setFieldValue(`exercises.${index}.reps`, '');
                                      formik.setFieldValue(`exercises.${index}.weight`, '');
                                      formik.setFieldValue(`exercises.${index}.duration`, '30');
                                      formik.setFieldValue(`exercises.${index}.intensity`, 'Moderate');
                                    } else {
                                      formik.setFieldValue(`exercises.${index}.duration`, '');
                                      formik.setFieldValue(`exercises.${index}.intensity`, '');
                                    }
                                  }}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="Exercise Name"
                                      error={formik.touched.exercises?.[index]?.name && Boolean(formik.errors.exercises?.[index]?.name)}
                                      helperText={formik.touched.exercises?.[index]?.name && formik.errors.exercises?.[index]?.name}
                                    />
                                  )}
                                />
                                {/* Hidden field to store exercise_id */}
                                <input
                                  type="hidden"
                                  name={`exercises.${index}.exercise_id`}
                                  value={exercise.exercise_id || ''}
                                />
                              </Grid>
    
                              {/* Conditional rendering based on tracking type */}
                              {exercise.tracking_type === 'time_based' || exercise.exercise_type === 'cardio' ? (
                                  <Grid item xs={12} sm={7} container spacing={2}>
                                     <Grid item xs={6} >
                                        <TextField
                                          fullWidth
                                          label="Duration (minutes)"
                                          name={`exercises.${index}.duration`}
                                          value={formik.values.exercises[index].duration || ''}
                                          onChange={formik.handleChange}
                                          onBlur={(e) => {
                                            if (!e.target.value) {
                                              formik.setFieldValue(`exercises.${index}.duration`, '');
                                            }
                                          }}
                                            error={
                                                formik.touched.exercises?.[index]?.duration &&
                                                Boolean(formik.errors.exercises?.[index]?.duration)
                                            }
                                            helperText={
                                                formik.touched.exercises?.[index]?.duration &&
                                                formik.errors.exercises?.[index]?.duration
                                            }
                                        />
                                    </Grid>
                                      <Grid item xs={6}>
                                         <FormControl fullWidth >
                                            <InputLabel>Intensity</InputLabel>
                                            <Select
                                            name={`exercises.${index}.intensity`}
                                            value={exercise.intensity}
                                              onChange={formik.handleChange}
                                                error={
                                                    formik.touched.exercises?.[index]?.intensity &&
                                                    Boolean(formik.errors.exercises?.[index]?.intensity)
                                                }
                                          >
                                            {INTENSITY_OPTIONS.map((option) => (
                                              <MenuItem key={option} value={option}>
                                                {option}
                                              </MenuItem>
                                            ))}
                                        </Select>
                                        {formik.touched.exercises?.[index]?.intensity &&
                                          formik.errors.exercises?.[index]?.intensity && (
                                              <FormHelperText error>
                                                {formik.errors.exercises[index].intensity}
                                            </FormHelperText>
                                         )}
                                      </FormControl>
                                   </Grid>
                                  </Grid>
                              ) : (
                                <Grid item xs={12} sm={7} container spacing={2}>
                                    <Grid item xs={4}>
                                        <TextField
                                          fullWidth
                                          label="Sets"
                                          name={`exercises.${index}.sets`}
                                          value={exercise.sets || ''}
                                          onChange={formik.handleChange}
                                          error={
                                            formik.touched.exercises?.[index]?.sets &&
                                            Boolean(formik.errors.exercises?.[index]?.sets)
                                          }
                                          helperText={
                                            formik.touched.exercises?.[index]?.sets &&
                                            formik.errors.exercises?.[index]?.sets
                                          }
                                        />
                                      </Grid>
                                      <Grid item xs={4}>
                                        <TextField
                                          fullWidth
                                          label="Reps"
                                          name={`exercises.${index}.reps`}
                                          value={exercise.reps || ''}
                                          onChange={formik.handleChange}
                                          error={
                                            formik.touched.exercises?.[index]?.reps &&
                                            Boolean(formik.errors.exercises?.[index]?.reps)
                                          }
                                          helperText={
                                            formik.touched.exercises?.[index]?.reps &&
                                            formik.errors.exercises?.[index]?.reps
                                          }
                                        />
                                      </Grid>
                                      <Grid item xs={4}>
                                        <TextField
                                          fullWidth
                                          label="Weight"
                                          name={`exercises.${index}.weight`}
                                          value={formik.values.exercises[index].weight || ''}
                                          onChange={formik.handleChange}
                                          disabled={exercise.exercise_type !== 'strength'}
                                          onBlur={(e) => {
                                            formik.handleBlur(e);
                                          }}
                                          error={
                                            formik.touched.exercises?.[index]?.weight &&
                                            Boolean(formik.errors.exercises?.[index]?.weight)
                                          }
                                          helperText={
                                            formik.touched.exercises?.[index]?.weight &&
                                            formik.errors.exercises?.[index]?.weight
                                          }
                                          InputProps={{
                                            endAdornment: <InputAdornment position="end">kg</InputAdornment>
                                          }}
                                        />
                                     </Grid>
                                </Grid>
                              )}
                            
                            <Grid item xs={6} sm={1}>
                                <IconButton
                                    onClick={() => arrayHelpers.remove(index)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Grid>
                            </Grid>
                          </Box>
                        ))}
                         <Button
                            startIcon={<AddIcon />}
                            onClick={() => arrayHelpers.push({
                                name: '',
                                exercise_id: null,
                                exercise_type: 'strength',
                                sets: '',
                                reps: '',
                                weight: '',
                                duration: '',
                                intensity: 'Moderate',
                                avg_heart_rate: '',
                                max_heart_rate: '',
                                tracking_type: 'weight_based',
                                videoId: '',
                                instructions: '',
                                equipment: ''
                            })}
                            >
                                Add Exercise
                            </Button>
                      </div>
                    )}
                  />
                </CardContent>
              </Card>
            </Grid>
            {/* Feedback */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Feedback
                  </Typography>
                  <Grid container spacing={2} direction="column" alignItems="center">
                    <Grid item xs={12}>
                      <Grid container spacing={2} justifyContent="center">
                        {EMOJIS.map(({ value, icon, label }) => (
                          <Grid item key={value}>
                            <IconButton
                              onClick={() => formik.setFieldValue('feedback_rating', value)}
                              color={formik.values.feedback_rating === value ? 'primary' : 'default'}
                              size="large"
                            >
                              {icon}
                            </IconButton>
                          </Grid>
                        ))}
                      </Grid>
                    </Grid>
                    <Grid item xs={12} sx={{ width: '100%', mt: 2 }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        id="comments"
                        name="comments"
                        label="Session Notes"
                        placeholder="How was your workout? Any challenges or achievements?"
                        value={formik.values.comments}
                        onChange={formik.handleChange}
                        error={formik.touched.comments && Boolean(formik.errors.comments)}
                        helperText={formik.touched.comments && formik.errors.feedback_notes}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
    
            {/* Submit Button */}
             <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                    color="primary"
                    type="submit"
                    disabled={formik.isSubmitting}
                    startIcon={formik.isSubmitting ? <CircularProgress size={20} /> : null}
                >
                  {formik.isSubmitting ? 'Logging Session...' : 'Log Session'}
                </Button>
                {submissionStatus.error && (
                    <Typography color="error" sx={{ mt: 2 }}>
                        {submissionStatus.error}
                  </Typography>
                )}
                {submissionStatus.success && (
                   <Typography color="success.main" sx={{ mt: 2 }}>
                       {submissionStatus.success}
                   </Typography>
                 )}
            </Grid>
          </Grid>
        </Box>
      </form>
    </FormikProvider>
  );
};

LogSessionForm.propTypes = {
  workoutPlans: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    name: PropTypes.string,
    workout_type: PropTypes.string,
    workouts: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      date: PropTypes.string,
      exercises: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        exercise_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.oneOf([null])]),
        name: PropTypes.string,
        exercise_type: PropTypes.string,
        sets: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        reps: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        weight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        duration: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        intensity: PropTypes.string,
        tracking_type: PropTypes.string,
        instructions: PropTypes.string,
        equipment: PropTypes.string
      }))
    }))
  })),
  currentWorkout: PropTypes.object,
  source: PropTypes.string,
  onSessionLogged: PropTypes.func
};

export default LogSessionForm;
