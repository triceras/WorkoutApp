import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { Formik, Form, FieldArray } from 'formik';
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

const EMOJIS = [
  { value: 0, icon: <SentimentVeryDissatisfied fontSize="large" />, label: 'Terrible' },
  { value: 1, icon: <SentimentDissatisfied fontSize="large" />, label: 'Very Bad' },
  { value: 2, icon: <SentimentNeutral fontSize="large" />, label: 'Bad' },
  { value: 3, icon: <SentimentSatisfied fontSize="large" />, label: 'Okay' },
  { value: 4, icon: <SentimentVerySatisfied fontSize="large" />, label: 'Good' },
  { value: 5, icon: <SentimentSatisfiedAlt fontSize="large" />, label: 'Awesome' },
];

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
  'Recovery',
  'Stretching'
];

const INTENSITY_OPTIONS = ['Low', 'Moderate', 'High'];

const LogSessionForm = ({
  workoutPlans = [],
  currentWorkout = null,
  source = 'completed', // Ensure 'completed' so session is counted
  onSessionLogged = () => {}
}) => {
  const { user } = useContext(AuthContext);
  const username = user?.first_name || user?.username || 'User';
  const [submissionStatus, setSubmissionStatus] = useState({ success: '', error: '' });
  const [availableExercises, setAvailableExercises] = useState([]);
  const [exercisesLoading, setExercisesLoading] = useState(true);
  const [exercisesError, setExercisesError] = useState(null);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setExercisesLoading(true);
        const response = await axiosInstance.get('exercises/');
        const exercises = response.data.map(exercise => ({
          ...exercise,
          exercise_type: exercise.exercise_type ||
            (exercise.name.toLowerCase().includes('bike') ? 'cardio' : 'strength'),
          tracking_type: (exercise.exercise_type === 'cardio' || exercise.name.toLowerCase().includes('bike'))
            ? 'time_based' : 'weight_based'
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
  }, []);

  const normalizeIntensity = (value) => {
    if (!value) return 'Moderate';
    const normalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    return INTENSITY_OPTIONS.includes(normalized) ? normalized : 'Moderate';
  };

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

    // Get all exercises from current workout
    const workoutExercises = currentWorkout?.exercises || [];
    console.log('Available workout exercises:', workoutExercises);

    if (workoutExercises.length > 0 && availableExercises.length > 0) {
      initialValues.exercises = workoutExercises.map((exercise) => {
        // Debug log
        console.log('Processing exercise:', exercise);
    
        // Enhanced exercise type detection
        const exerciseType = exercise.exercise_type || 
          (exercise.name.toLowerCase().includes("bike") || 
           exercise.name.toLowerCase().includes("jog") || 
           exercise.name.toLowerCase().includes("run")) ? "cardio" :
          (exercise.name.toLowerCase().includes("hold") || 
           exercise.name.toLowerCase().includes("plank")) ? "isometric" : 
          "strength";
    
        const isCardio = exerciseType === "cardio";
        const isIsometric = exerciseType === "isometric";
    
        // Convert instructions
        let instructionsValue = exercise.instructions;
        if (instructionsValue && typeof instructionsValue === "object") {
          instructionsValue = JSON.stringify(instructionsValue);
        }
    
        // Improved exercise matching
        const matchedExercise = availableExercises.find(ex => 
          ex.name.toLowerCase().trim() === exercise.name.toLowerCase().trim()
        );
        console.log(`Exercise ${exercise.name} matching result:`, matchedExercise);
    
        return {
          name: exercise.name,
          exercise_id: matchedExercise?.id || null,
          exercise_type: exerciseType,
          sets: isCardio ? "1" : (exercise.sets || "3"),
          reps: isCardio ? null : isIsometric ? (exercise.duration || "30") : (exercise.reps || "10"),
          weight: isCardio ? null : (exercise.weight || "bodyweight"),
          duration: (isCardio || isIsometric) ? (exercise.duration || "30") : "",
          intensity: isCardio ? normalizeIntensity(exercise.intensity) : "",
          avg_heart_rate: exercise.avg_heart_rate || "",
          max_heart_rate: exercise.max_heart_rate || "",
          tracking_type: isCardio ? "time_based" : isIsometric ? "duration_based" : "weight_based",
          videoId: exercise.videoId || exercise.video_id || matchedExercise?.videoId || "",
          instructions: instructionsValue || "",
          equipment: exercise.equipment || "",
          isPrePopulated: true
        };
      });
    }
    return initialValues;
  };


  const validationSchema = Yup.object({
    session_name: Yup.string().required('Session name is required'),
    workout_type: Yup.string().required('Workout type is required'),
    session_date: Yup.string().required('Session date is required'),
    exercises: Yup.array().of(
      Yup.object({
        name: Yup.string().required('Exercise name is required'),
        exercise_id: Yup.number().nullable(),
        sets: Yup.number().nullable().transform(value => (isNaN(value) ? null : value)),
        reps: Yup.number().nullable().transform(value => (isNaN(value) ? null : value)),
        weight: Yup.number().nullable().transform(value => (isNaN(value) ? null : value)),
        duration: Yup.number().nullable().transform(value => (isNaN(value) ? null : value)),
        intensity: Yup.string().nullable(),
        avg_heart_rate: Yup.number().nullable().transform(value => (isNaN(value) ? null : value)),
        max_heart_rate: Yup.number().nullable().transform(value => (isNaN(value) ? null : value)),
        tracking_type: Yup.string(),
        videoId: Yup.string().nullable(),
        instructions: Yup.string().nullable(),
        equipment: Yup.string().nullable()
      })
    ).min(1, 'At least one exercise is required'),
    feedback_rating: Yup.number().required('Please rate your session'),
    comments: Yup.string(),
    heart_rate_pre: Yup.number().nullable().transform(value => (isNaN(value) ? null : value)),
    heart_rate_post: Yup.number().nullable().transform(value => (isNaN(value) ? null : value)),
    calories_burned: Yup.number().nullable().transform(value => (isNaN(value) ? null : value))
  });

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    try {
      const chosenWorkoutPlanId = (workoutPlans.length > 0 && workoutPlans[0].id) ? workoutPlans[0].id : null;

      if (!chosenWorkoutPlanId) {
        throw new Error('No workout plan ID found. Cannot log the session.');
      }

      const workoutTypeValue = WORKOUT_TYPE_CHOICES.includes(values.workout_type) ? values.workout_type : 'Recovery';

      const exercisesData = values.exercises.map(exercise => {
        const isCardio = exercise.exercise_type === 'cardio';
        const parsedSets = isCardio ? null : (exercise.sets ? parseInt(exercise.sets, 10) : null);
        const parsedReps = isCardio ? null : (exercise.reps ? parseInt(exercise.reps, 10) : null);
        const parsedWeight = (exercise.exercise_type === 'strength' && exercise.weight) ? parseFloat(exercise.weight) : null;
        const parsedDuration = isCardio && exercise.duration ? parseInt(exercise.duration, 10) : null;

        return {
          name: exercise.name,
          exercise_id: exercise.exercise_id,
          exercise_type: exercise.exercise_type,
          sets: parsedSets,
          reps: parsedReps,
          weight: parsedWeight,
          duration: parsedDuration,
          intensity: isCardio ? exercise.intensity : null,
        };
      });

      const sessionData = {
        date: values.session_date,
        workout_plan_id: chosenWorkoutPlanId,
        source: source, // Ensure this is 'completed'
        session_name: values.session_name,
        workout_type: workoutTypeValue,
        heart_rate_pre: values.heart_rate_pre || null,
        heart_rate_post: values.heart_rate_post || null,
        calories_burned: values.calories_burned || null,
        feedback_rating: values.feedback_rating,
        comments: values.comments,
        exercises: exercisesData
      };

      const response = await axiosInstance.post('training_sessions/', sessionData);
      if (response.status === 201) {
        setSubmissionStatus({ success: 'Training session logged successfully!', error: '' });
        onSessionLogged(response.data);
        
        const event = new CustomEvent('session-logged', { detail: { success: true } });
        window.dispatchEvent(event);
      }

    } catch (error) {
      const errorMessage = error.response?.data?.error || 
        (error.response?.status === 400 ? 'This session has already been logged' : 'Failed to log training session');

      setSubmissionStatus({ success: '', error: errorMessage });
      setErrors({ submit: errorMessage });

      // Don't dispatch event on error
      console.error('Error logging session:', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (exercisesLoading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading exercises...
        </Typography>
      </Box>
    );
  }

  return (
    <Formik
      initialValues={getInitialFormValues()}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      validateOnMount={false}
      enableReinitialize={true}
    >
      {formik => {
        let workoutTypeValue = formik.values.workout_type || '';
        if (workoutTypeValue === 'Active Recovery') {
          workoutTypeValue = 'Recovery';
        }

        return (
          <Form noValidate>
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
                            error={
                              formik.touched.session_name &&
                              Boolean(formik.errors.session_name)
                            }
                            helperText={
                              formik.touched.session_name && formik.errors.session_name
                            }
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <FormControl fullWidth>
                            <InputLabel>Workout Type</InputLabel>
                            <Select
                              id="workout_type"
                              name="workout_type"
                              value={workoutTypeValue}
                              onChange={formik.handleChange}
                              error={
                                formik.touched.workout_type &&
                                Boolean(formik.errors.workout_type)
                              }
                            >
                              {WORKOUT_TYPE_CHOICES.map((type) => (
                                <MenuItem key={type} value={type}>
                                  {type}
                                </MenuItem>
                              ))}
                            </Select>
                            {formik.touched.workout_type && formik.errors.workout_type && (
                              <FormHelperText error>
                                {formik.errors.workout_type}
                              </FormHelperText>
                            )}
                          </FormControl>
                        </Grid>
                        {/* Session Date Field */}
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            id="session_date"
                            name="session_date"
                            label="Session Date"
                            type="date"
                            value={formik.values.session_date}
                            onChange={formik.handleChange}
                            error={
                              formik.touched.session_date &&
                              Boolean(formik.errors.session_date)
                            }
                            helperText={
                              formik.touched.session_date && formik.errors.session_date
                            }
                            InputLabelProps={{
                              shrink: true,
                            }}
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
                      <FieldArray name="exercises">
                        {arrayHelpers => (
                          <div>
                            {formik.values.exercises.map((exercise, index) => {
                              const isCardio = exercise.exercise_type === 'cardio' || exercise.tracking_type === 'time_based';
                              const isStrength = exercise.exercise_type?.toLowerCase() === 'strength';
                              return (
                                <Box key={index} sx={{ mb: 2, p: 2, bgcolor: alpha('#000', 0.02), borderRadius: 1 }}>
                                  <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={12} sm={4}>
                                      {exercise.isPrePopulated ? (
                                        <TextField
                                          fullWidth
                                          label="Exercise Name"
                                          value={exercise.name}
                                          InputProps={{
                                            readOnly: true,
                                          }}
                                        />
                                      ) : (
                                        <Autocomplete
                                          options={availableExercises}
                                          getOptionLabel={(option) => option.name || ''}
                                          value={availableExercises.find(ex => ex.id === exercise.exercise_id) || null}
                                          onChange={(event, newValue) => {
                                            formik.setFieldValue(`exercises.${index}.name`, newValue?.name || '');
                                            formik.setFieldValue(`exercises.${index}.exercise_id`, newValue?.id || null);
                                            const exerciseType = newValue?.exercise_type || 'strength';
                                            const isTimeBased = (exerciseType === 'cardio' || exerciseType === 'recovery' || exerciseType === 'flexibility');
                                            formik.setFieldValue(`exercises.${index}.exercise_type`, exerciseType);
                                            formik.setFieldValue(`exercises.${index}.tracking_type`, isTimeBased ? 'time_based' : 'weight_based');

                                            if (isTimeBased) {
                                              formik.setFieldValue(`exercises.${index}.sets`, '');
                                              formik.setFieldValue(`exercises.${index}.reps`, '');
                                              formik.setFieldValue(`exercises.${index}.weight`, '');
                                              formik.setFieldValue(`exercises.${index}.duration`, '30');
                                              formik.setFieldValue(`exercises.${index}.intensity`, 'Moderate');
                                            } else {
                                              formik.setFieldValue(`exercises.${index}.sets`, '3');
                                              formik.setFieldValue(`exercises.${index}.reps`, '10');
                                              formik.setFieldValue(`exercises.${index}.weight`, '');
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
                                      )}
                                    </Grid>

                                    {isCardio ? (
                                      <Grid item xs={12} sm={7} container spacing={2}>
                                        <Grid item xs={6}>
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
                                            error={formik.touched.exercises?.[index]?.duration && Boolean(formik.errors.exercises?.[index]?.duration)}
                                            helperText={formik.touched.exercises?.[index]?.duration && formik.errors.exercises?.[index]?.duration}
                                          />
                                        </Grid>
                                        <Grid item xs={6}>
                                          <FormControl fullWidth>
                                            <InputLabel>Intensity</InputLabel>
                                            <Select
                                              name={`exercises.${index}.intensity`}
                                              value={exercise.intensity || 'Moderate'}  // Provide default
                                              onChange={(e) => {
                                                const value = e.target.value;
                                                formik.setFieldValue(`exercises.${index}.intensity`, value);
                                              }}
                                              error={formik.touched.exercises?.[index]?.intensity && Boolean(formik.errors.exercises?.[index]?.intensity)}
                                            >
                                              {INTENSITY_OPTIONS.map((option) => (
                                                <MenuItem key={option} value={option}>
                                                  {option}
                                                </MenuItem>
                                              ))}
                                            </Select>
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
                                            error={formik.touched.exercises?.[index]?.sets && Boolean(formik.errors.exercises?.[index]?.sets)}
                                            helperText={formik.touched.exercises?.[index]?.sets && formik.errors.exercises?.[index]?.sets}
                                          />
                                        </Grid>
                                        <Grid item xs={4}>
                                          <TextField
                                            fullWidth
                                            label="Reps"
                                            name={`exercises.${index}.reps`}
                                            value={exercise.reps || ''}
                                            onChange={formik.handleChange}
                                            error={formik.touched.exercises?.[index]?.reps && Boolean(formik.errors.exercises?.[index]?.reps)}
                                            helperText={formik.touched.exercises?.[index]?.reps && formik.errors.exercises?.[index]?.reps}
                                          />
                                        </Grid>
                                        <Grid item xs={4}>
                                          {isStrength ? (
                                            <TextField
                                              fullWidth
                                              label="Weight"
                                              name={`exercises.${index}.weight`}
                                              value={formik.values.exercises[index].weight || ''}
                                              onChange={formik.handleChange}
                                              disabled={exercise.exercise_type.toLowerCase() !== 'strength'}
                                              error={formik.touched.exercises?.[index]?.weight && Boolean(formik.errors.exercises?.[index]?.weight)}
                                              helperText={formik.touched.exercises?.[index]?.weight && formik.errors.exercises?.[index]?.weight}
                                              InputProps={{
                                                endAdornment: <InputAdornment position="end">kg</InputAdornment>
                                              }}
                                            />
                                          ) : (
                                            <TextField
                                              fullWidth
                                              label="Weight"
                                              value="Bodyweight"
                                              disabled
                                            />
                                          )}
                                        </Grid>
                                      </Grid>
                                    )}

                                    <Grid item xs={6} sm={1}>
                                      <IconButton
                                        onClick={() => {
                                          arrayHelpers.remove(index);
                                        }}
                                        color="error"
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </Grid>
                                  </Grid>
                                </Box>
                              );
                            })}
                            <Button
                              startIcon={<AddIcon />}
                              onClick={() => {
                                arrayHelpers.push({
                                  name: '',
                                  exercise_id: null,
                                  exercise_type: 'strength',
                                  sets: '3',
                                  reps: '10',
                                  weight: '',
                                  duration: '',
                                  intensity: 'Moderate',
                                  avg_heart_rate: '',
                                  max_heart_rate: '',
                                  tracking_type: 'weight_based',
                                  videoId: '',
                                  instructions: '',
                                  equipment: '',
                                  isPrePopulated: false
                                });
                              }}
                            >
                              Add Exercise
                            </Button>
                          </div>
                        )}
                      </FieldArray>
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
                            {EMOJIS.map(({ value, icon }) => (
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
                            helperText={formik.touched.comments && formik.errors.comments}
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
          </Form>
        );
      }}
    </Formik>
  );
};

LogSessionForm.propTypes = {
  workoutPlans: PropTypes.array,
  currentWorkout: PropTypes.object,
  source: PropTypes.string,
  onSessionLogged: PropTypes.func
};

export default LogSessionForm;
