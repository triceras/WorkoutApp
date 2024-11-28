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
  InputLabel,
  Select,
} from '@mui/material';
import {
  SentimentVeryDissatisfied,
  SentimentDissatisfied,
  SentimentNeutral,
  SentimentSatisfied,
  SentimentVerySatisfied,
  SentimentSatisfiedAlt,
  AddCircle,
  RemoveCircle,
} from '@mui/icons-material';
import { DateTime } from 'luxon';

// Emoji options for feedback
const EMOJIS = [
  { value: 0, icon: <SentimentVeryDissatisfied fontSize="large" />, label: 'Terrible' },
  { value: 1, icon: <SentimentDissatisfied fontSize="large" />, label: 'Very Bad' },
  { value: 2, icon: <SentimentNeutral fontSize="large" />, label: 'Bad' },
  { value: 3, icon: <SentimentSatisfied fontSize="large" />, label: 'Okay' },
  { value: 4, icon: <SentimentVerySatisfied fontSize="large" />, label: 'Good' },
  { value: 5, icon: <SentimentSatisfiedAlt fontSize="large" />, label: 'Awesome' },
];

const LogSessionForm = ({ workoutPlans = [], source, onSessionLogged }) => {
  const { user } = useContext(AuthContext);
  const username = user?.first_name || user?.username || 'User';

  const [currentSession, setCurrentSession] = useState(null);
  const [error, setError] = useState(null);
  const [existingSessions, setExistingSessions] = useState([]);
  const [submissionStatus, setSubmissionStatus] = useState({ success: '', error: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State to hold available exercises
  const [availableExercises, setAvailableExercises] = useState([]);
  const [exercisesLoading, setExercisesLoading] = useState(true);
  const [exercisesError, setExercisesError] = useState(null);

  /**
   * Fetches the list of available exercises from the backend.
   */
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const response = await axiosInstance.get('/exercises/');
        setAvailableExercises(response.data); // Assume data is an array of { id, name }
        setExercisesLoading(false);
      } catch (err) {
        console.error('Error fetching exercises:', err);
        setExercisesError('Failed to load exercises. Please try again later.');
        setExercisesLoading(false);
      }
    };
  
    fetchExercises();
  }, []);

  /**
   * Determines the current workout session based on workoutPlans.
   */
  useEffect(() => {
    if (workoutPlans.length > 0) {
      const plan = workoutPlans[0]; // Assuming the first plan is current

      if (plan.workoutDays && plan.workoutDays.length > 0) {
        const updatedWorkoutDays = plan.workoutDays.map((day) => ({
          ...day,
          exercises: (day.exercises || []).map((exercise) => ({
            sets: exercise.sets !== undefined ? exercise.sets : 0,
            reps: exercise.reps !== undefined ? exercise.reps : 0,
            weight: exercise.weight !== undefined ? exercise.weight : 0,
            ...exercise,
          })),
        }));

        const todayWeekday = DateTime.local().weekday; // 1 (Monday) to 7 (Sunday)
        const currentWorkoutDay = updatedWorkoutDays.find(
          (day) => day.dayNumber === todayWeekday
        );

        if (currentWorkoutDay) {
          if (currentWorkoutDay.type === 'rest') {
            setCurrentSession(null);
            setError('Today is a rest day. No session to log.');
          } else {
            setCurrentSession(currentWorkoutDay);
            setError(null); // Clear any previous errors
          }
        } else {
          setCurrentSession(null);
          setError('No workout scheduled for today.');
        }
      } else {
        setError('Workout plan data is incomplete.');
      }
    } else {
      setError('No workout plans available.');
    }
  }, [workoutPlans]);


  /**
   * Fetches existing sessions for today to prevent duplicate logging.
   */
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

        // Check if any of the sessions match the current session's dayNumber
        const sessionLoggedToday = sessions.some(
          (session) => session.day_number === currentSession.dayNumber
        );

        setExistingSessions(sessionLoggedToday ? [currentSession.dayNumber] : []);
      } catch (error) {
        console.error('Error fetching existing sessions:', error);
      }
    };

    fetchExistingSessions();
  }, [currentSession, workoutPlans]);

  /**
   * Maps exercise names to their corresponding IDs.
   * If an exercise is not found, it creates it in the backend.
   * @param {Array} exercises - Array of exercises from the workout plan.
   * @returns {Array} - Array of exercises with mapped exercise_id.
   */
  const mapExerciseNamesToIds = async (exercises) => {
    const updatedAvailableExercises = [...availableExercises]; // Clone the array
    const mappedExercises = [];

    for (let ex of exercises) {
      let matchedExercise = updatedAvailableExercises.find(
        (aEx) => aEx.name.trim().toLowerCase() === ex.name.trim().toLowerCase()
      );

      if (!matchedExercise) {
        // Exercise not found, create it in the backend
        try {
          const response = await axiosInstance.post('/exercises/', {
            name: ex.name,
            description: ex.description || {},
            video_url: ex.video_url || '',
            videoId: ex.videoId || '',
          });
          matchedExercise = response.data;
          // Add the new exercise to the updatedAvailableExercises
          updatedAvailableExercises.push(matchedExercise);
        } catch (error) {
          console.error(`Error creating exercise "${ex.name}":`, error);
          // Handle the error by skipping this exercise or setting a placeholder ID
          matchedExercise = { id: null, name: ex.name };
        }
      }

      mappedExercises.push({
        ...ex,
        exercise_id: matchedExercise.id,
        name: matchedExercise.name,
      });
    }

    // Update the availableExercises state with the new exercises
    setAvailableExercises(updatedAvailableExercises);

    return mappedExercises;
  };

  /**
   * Initializes Formik for form handling.
   */
  const formik = useFormik({
    initialValues: {
      date: DateTime.local().toISODate(),
      workout_plan_id: workoutPlans.length > 0 ? workoutPlans[0].id : '',
      session_name: currentSession ? currentSession.day : '',
      emoji_feedback: 3,
      comments: '',
      duration: '',
      calories_burned: '',
      heart_rate_pre: '',
      heart_rate_post: '',
      intensity_level: '',
      exercises: [], // Initialize with an empty array
      source: source || '',
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      date: Yup.date().required('Date is required'),
      workout_plan_id: Yup.string().required('Workout plan ID is required'),
      session_name: Yup.string().required('Session name is required'),
      emoji_feedback: Yup.number()
        .min(0, 'Minimum rating is 0')
        .max(5, 'Maximum rating is 5')
        .required('Rating is required'),
      comments: Yup.string(),
      duration: Yup.number()
        .positive('Duration must be positive')
        .integer('Duration must be an integer')
        .required('Session duration is required'),
      calories_burned: Yup.number()
        .transform((value, originalValue) => (originalValue === '' ? null : value))
        .positive('Calories burned must be positive')
        .integer('Calories burned must be an integer')
        .nullable(),
      heart_rate_pre: Yup.number()
        .transform((value, originalValue) => (originalValue === '' ? null : value))
        .positive('Heart rate must be positive')
        .integer('Heart rate must be an integer')
        .nullable(),
      heart_rate_post: Yup.number()
        .transform((value, originalValue) => (originalValue === '' ? null : value))
        .positive('Heart rate must be positive')
        .integer('Heart rate must be an integer')
        .nullable(),
      intensity_level: Yup.number()
        .min(1, 'Intensity level must be at least 1')
        .max(10, 'Intensity level cannot exceed 10')
        .required('Intensity level is required'),
      exercises: Yup.array().of(
        Yup.object().shape({
          exercise_id: Yup.number()
            .typeError('Exercise ID is required')
            .required('Exercise ID is required'),
          name: Yup.string().required('Exercise name is required'),
          sets: Yup.number()
            .positive('Sets must be positive')
            .integer('Sets must be an integer')
            .required('Number of sets is required'),
          reps: Yup.number()
            .positive('Reps must be positive')
            .integer('Reps must be an integer')
            .required('Number of reps is required'),
          weight: Yup.number()
            .transform((value, originalValue) => (originalValue === '' ? null : value))
            .min(0, 'Weight cannot be negative')
            .nullable(),
        })
      ),
    }),
    onSubmit: async (values, { resetForm, setErrors }) => {
      setError(null);
      setSubmissionStatus({ success: '', error: '' });
      setIsSubmitting(true);

      try {
        const payload = {
          date: values.date,
          workout_plan_id: values.workout_plan_id,
          session_name: values.session_name,
          emoji_feedback: values.emoji_feedback,
          comments: values.comments,
          duration: values.duration,
          calories_burned: values.calories_burned !== '' ? values.calories_burned : null,
          heart_rate_pre: values.heart_rate_pre !== '' ? values.heart_rate_pre : null,
          heart_rate_post: values.heart_rate_post !== '' ? values.heart_rate_post : null,
          intensity_level: values.intensity_level,
          exercises: values.exercises.map((ex) => ({
            exercise_id: ex.exercise_id,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight !== '' ? ex.weight : null,
          })),
          source: source, // ensure this is correctly set
        };

        console.log('Payload to send:', payload); // Additional debug

        const response = await axiosInstance.post('/training_sessions/', payload);
        onSessionLogged(response.data);
        resetForm();
        setSubmissionStatus({ success: 'Session(s) logged successfully!', error: '' });
        const exercises = response.data.training_session?.exercises || [];
        setExistingSessions((prev) => [...prev, ...exercises]);
      } catch (error) {
        console.error('Error logging session:', error);
        if (error.response && error.response.data) {
          const errorData = error.response.data;
          let errorMessage = '';

          Object.keys(errorData).forEach((key) => {
            if (typeof errorData[key] === 'string') {
              errorMessage += `${key}: ${errorData[key]} `;
            } else if (Array.isArray(errorData[key])) {
              errorData[key].forEach((msg) => {
                errorMessage += `${key}: ${msg} `;
              });
            } else if (typeof errorData[key] === 'object') {
              // Handle nested errors (e.g., exercises[0].exercise_id)
              Object.keys(errorData[key]).forEach((subKey) => {
                if (Array.isArray(errorData[key][subKey])) {
                  errorData[key][subKey].forEach((msg) => {
                    errorMessage += `${key}.${subKey}: ${msg} `;
                  });
                }
              });
            }
          });

          setSubmissionStatus({ success: '', error: errorMessage.trim() });
        } else {
          setSubmissionStatus({ success: '', error: 'Failed to log session. Please try again.' });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  /**
   * Sets the session_name and exercises in Formik once currentSession is determined.
   */
  useEffect(() => {
    const initializeExercises = async () => {
      if (currentSession) {
        const mappedExercises = await mapExerciseNamesToIds(currentSession.exercises);
        formik.setFieldValue(
          'exercises',
          mappedExercises.map((ex) => ({
            exercise_id: ex.exercise_id || '', // Pre-populated from mapped exercises
            name: ex.name || '', // Pre-populated exercise name
            sets: ex.sets || 0,
            reps: ex.reps || 0,
            weight: ex.weight || '',
          }))
        );
      }
    };

    initializeExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession]);

  /**
   * Checks if the current session has already been logged today.
   */
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

  /**
   * Handles emoji selection.
   */
  const handleEmojiSelect = (value) => {
    formik.setFieldValue('emoji_feedback', value);
  };

  const getWorkoutDayForDayNumber = (dayNumber) => {
    if (workoutPlans.length === 0) return null;
    const plan = workoutPlans[0]; // Assuming the first plan is current
    return plan.workoutDays.find((w) => w.dayNumber === dayNumber) || null;
  };  

  /**
   * Handles date change to update session_name and exercises accordingly.
   */
  const handleDateChange = async (e) => {
    formik.handleChange(e);
    const selectedDate = e.target.value;
    const dayNumber = getDayNumber(selectedDate);
    const workoutDay = getWorkoutDayForDayNumber(dayNumber);

    if (workoutDay) {
      formik.setFieldValue('session_name', workoutDay.day);
      if (workoutDay.type === 'rest') {
        formik.setFieldValue('exercises', []); // Clear exercises
        setError('Selected day is a rest day. No session to log.');
      } else {
        const mappedExercises = await mapExerciseNamesToIds(workoutDay.exercises);
        formik.setFieldValue(
          'exercises',
          mappedExercises.map((ex) => ({
            exercise_id: ex.exercise_id || '', // Pre-populated from mapped exercises
            name: ex.name || '', // Pre-populated exercise name
            sets: ex.sets || 0,
            reps: ex.reps || 0,
            weight: ex.weight || '',
          }))
        );
        setError(null);
      }
    } else {
      formik.setFieldValue('session_name', 'No Workout Scheduled');
      formik.setFieldValue('exercises', []);
      setError('No workout scheduled for the selected date.');
    }
  };


  /**
   * Helper function to get day number from date string.
   * @param {string} dateString - Date in YYYY-MM-DD format.
   * @returns {number} - Day number (1=Monday, 7=Sunday).
   */
  const getDayNumber = (dateString) => {
    const date = DateTime.fromISO(dateString);
    const dayNumber = date.weekday; // 1 (Monday) to 7 (Sunday)
    return dayNumber;
  };

  /**
   * Map day number to workout name.
   * @param {number} dayNumber - Day number (1=Monday, ...,7=Sunday).
   * @returns {string} - Workout name or 'Rest Day'.
   */
  const getWorkoutNameForDay = (dayNumber) => {
    if (workoutPlans.length === 0) return 'Rest Day';
    const plan = workoutPlans[0]; // Assuming the first plan is current
    const workoutDay = plan.workoutDays.find((w) => w.dayNumber === dayNumber);
    return workoutDay ? workoutDay.day : 'Rest Day'; // Using 'day' field directly
  };

  /**
   * If there's an error (e.g., no workout plans), display it.
   */
  if (error) {
    return (
      <Typography variant="body1" color="error" align="center">
        {error}
      </Typography>
    );
  }

  /**
   * If the current session is not yet determined, show a loading message.
   */
  if (!currentSession) {
    return (
      <Typography variant="body1" align="center">
        Loading session information...
      </Typography>
    );
  }

  /**
   * If the user has already logged the session today, prevent form submission.
   */
  if (existingSessions.length > 0) {
    return (
      <Typography variant="body1" color="error" align="center">
        You have already logged this session for today.
      </Typography>
    );
  }

  /**
  * If it's a rest day, prevent form submission.
  */
 if (currentSession.type === 'rest') {
   return (
     <Typography variant="body1" color="textSecondary" align="center">
       Today is a rest day. No session to log.
     </Typography>
   );
 }

  /**
   * If exercises are still loading, show a loading indicator.
   */
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

  /**
   * If there's an error loading exercises, display it.
   */
  if (exercisesError) {
    return (
      <Typography variant="body1" color="error" align="center">
        {exercisesError}
      </Typography>
    );
  }

  return (
    <FormikProvider value={formik}>
      <Card className="log-session-form">
        <CardContent>
          <Typography variant="h4" component="h3" align="center" gutterBottom>
            Log Your Training Session
          </Typography>
          {submissionStatus.error && (
            <Typography variant="body1" color="error" align="center">
              {submissionStatus.error}
            </Typography>
          )}
          {submissionStatus.success && (
            <Typography variant="body1" color="primary" align="center">
              {submissionStatus.success}
            </Typography>
          )}
          <form onSubmit={formik.handleSubmit}>
            {/* Emoji Feedback */}
            <Box mt={4}>
              <Typography variant="h6" gutterBottom>
                How are you feeling?
              </Typography>
              <Box display="flex" flexWrap="wrap">
                {EMOJIS.map((item) => (
                  <Button
                    key={item.value}
                    variant={formik.values.emoji_feedback === item.value ? 'contained' : 'outlined'}
                    color="primary"
                    onClick={() => handleEmojiSelect(item.value)}
                    startIcon={item.icon}
                    aria-label={item.label}
                    style={{ marginRight: '8px', marginBottom: '8px' }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>
              {formik.touched.emoji_feedback && formik.errors.emoji_feedback && (
                <Typography color="error" variant="body2" align="center">
                  {formik.errors.emoji_feedback}
                </Typography>
              )}
            </Box>

            {/* Exercises FieldArray */}
            <FieldArray name="exercises">
              {({ push, remove }) => (
                <div>
                  {formik.values.exercises.map((exercise, index) => (
                    <Card key={index} style={{ marginBottom: '1rem' }}>
                      <CardContent>
                        <Grid container spacing={3} alignItems="center">
                          <Grid item xs={12}>
                            <Typography variant="h6">Exercise {index + 1}</Typography>
                          </Grid>

                          {/* Exercise Name (Read-Only) */}
                          <Grid item xs={12} sm={4}>
                            <TextField
                              label="Exercise Name"
                              name={`exercises[${index}].name`}
                              value={exercise.name}
                              fullWidth
                              variant="outlined"
                              InputProps={{
                                readOnly: true,
                              }}
                              error={
                                formik.touched.exercises &&
                                formik.touched.exercises[index] &&
                                formik.touched.exercises[index].name &&
                                Boolean(formik.errors.exercises?.[index]?.name)
                              }
                              helperText={
                                formik.touched.exercises &&
                                formik.touched.exercises[index] &&
                                formik.touched.exercises[index].name &&
                                formik.errors.exercises?.[index]?.name
                              }
                            />
                          </Grid>

                          {/* Hidden Exercise ID */}
                          <Grid item xs={12} sm={4} style={{ display: 'none' }}>
                            <TextField
                              label="Exercise ID"
                              name={`exercises[${index}].exercise_id`}
                              value={exercise.exercise_id}
                              fullWidth
                              variant="outlined"
                              InputProps={{
                                readOnly: true,
                              }}
                              error={
                                formik.touched.exercises &&
                                formik.touched.exercises[index] &&
                                formik.touched.exercises[index].exercise_id &&
                                Boolean(formik.errors.exercises?.[index]?.exercise_id)
                              }
                              helperText={
                                formik.touched.exercises &&
                                formik.touched.exercises[index] &&
                                formik.touched.exercises[index].exercise_id &&
                                formik.errors.exercises?.[index]?.exercise_id
                              }
                            />
                          </Grid>

                          {/* Sets */}
                          <Grid item xs={12} sm={2}>
                            <TextField
                              label="Sets"
                              name={`exercises[${index}].sets`}
                              type="number"
                              value={exercise.sets}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              fullWidth
                              required
                              variant="outlined"
                              inputProps={{ min: 1 }}
                              error={
                                formik.touched.exercises &&
                                formik.touched.exercises[index] &&
                                formik.touched.exercises[index].sets &&
                                Boolean(formik.errors.exercises?.[index]?.sets)
                              }
                              helperText={
                                formik.touched.exercises &&
                                formik.touched.exercises[index] &&
                                formik.touched.exercises[index].sets &&
                                formik.errors.exercises?.[index]?.sets
                              }
                            />
                          </Grid>

                          {/* Reps */}
                          <Grid item xs={12} sm={2}>
                            <TextField
                              label="Reps"
                              name={`exercises[${index}].reps`}
                              type="number"
                              value={exercise.reps}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              fullWidth
                              required
                              variant="outlined"
                              inputProps={{ min: 1 }}
                              error={
                                formik.touched.exercises &&
                                formik.touched.exercises[index] &&
                                formik.touched.exercises[index].reps &&
                                Boolean(formik.errors.exercises?.[index]?.reps)
                              }
                              helperText={
                                formik.touched.exercises &&
                                formik.touched.exercises[index] &&
                                formik.touched.exercises[index].reps &&
                                formik.errors.exercises?.[index]?.reps
                              }
                            />
                          </Grid>

                          {/* Weight */}
                          <Grid item xs={12} sm={2}>
                            <TextField
                              label="Weight (kg)"
                              name={`exercises[${index}].weight`}
                              type="number"
                              value={exercise.weight}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              fullWidth
                              variant="outlined"
                              inputProps={{ min: 0 }}
                              error={
                                formik.touched.exercises &&
                                formik.touched.exercises[index] &&
                                formik.touched.exercises[index].weight &&
                                Boolean(formik.errors.exercises?.[index]?.weight)
                              }
                              helperText={
                                formik.touched.exercises &&
                                formik.touched.exercises[index] &&
                                formik.touched.exercises[index].weight &&
                                formik.errors.exercises?.[index]?.weight
                              }
                            />
                          </Grid>

                          {/* Remove Exercise Button */}
                          <Grid item xs={12} sm={2}>
                            <Button
                              type="button"
                              variant="contained"
                              color="secondary"
                              startIcon={<RemoveCircle />}
                              onClick={() => remove(index)}
                              disabled={formik.values.exercises.length === 1}
                            >
                              Remove
                            </Button>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Add Exercise Button */}
                  <Button
                    type="button"
                    variant="contained"
                    color="primary"
                    startIcon={<AddCircle />}
                    onClick={() =>
                      push({
                        exercise_id: '', // Initialize as empty
                        name: '', // Initialize as empty
                        sets: 0,
                        reps: 0,
                        weight: '',
                      })
                    }
                    style={{ marginBottom: '1rem' }}
                  >
                    Add Exercise
                  </Button>
                </div>
              )}
            </FieldArray>

            {/* Date Field */}
            <Box mt={4}>
              <TextField
                label="Date"
                name="date"
                type="date"
                value={formik.values.date || ''}
                onChange={handleDateChange}
                onBlur={formik.handleBlur}
                fullWidth
                required
                InputLabelProps={{
                  shrink: true,
                }}
                variant="outlined"
                error={formik.touched.date && Boolean(formik.errors.date)}
                helperText={formik.touched.date && formik.errors.date}
              />
            </Box>

            {/* Workout Plan Dropdown */}
            <Box mt={2}>
              <FormControl
                fullWidth
                required
                variant="outlined"
                error={formik.touched.workout_plan_id && Boolean(formik.errors.workout_plan_id)}
              >
                <InputLabel id="workout-plan-label">Workout Plan</InputLabel>
                <Select
                  labelId="workout-plan-label"
                  id="workout-plan"
                  name="workout_plan_id"
                  value={formik.values.workout_plan_id || ''}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  label="Workout Plan"
                >
                  <MenuItem value="">
                    <em>Select Workout Plan</em>
                  </MenuItem>
                  {workoutPlans.map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      {username ? `Plan for ${username}` : `Workout Plan ${plan.id}`}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.workout_plan_id && formik.errors.workout_plan_id && (
                  <Typography color="error" variant="body2">
                    {formik.errors.workout_plan_id}
                  </Typography>
                )}
              </FormControl>
            </Box>

            {/* Session Name (Read-Only) */}
            <Box mt={2}>
              <TextField
                label="Session Name"
                name="session_name"
                value={formik.values.session_name || ''}
                fullWidth
                required
                variant="outlined"
                InputProps={{
                  readOnly: true,
                }}
                error={formik.touched.session_name && Boolean(formik.errors.session_name)}
                helperText={formik.touched.session_name && formik.errors.session_name}
              />
            </Box>

            {/* Session Details Fields */}
            <Box mt={4}>
              <Typography variant="h6" gutterBottom>
                Session Details
              </Typography>
              <Grid container spacing={2}>
                {/* Duration */}
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    label="Duration (mins)"
                    name="duration"
                    type="number"
                    value={formik.values.duration || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    variant="outlined"
                    inputProps={{ min: 1 }}
                    InputLabelProps={{ shrink: true }}
                    error={formik.touched.duration && Boolean(formik.errors.duration)}
                    helperText={formik.touched.duration && formik.errors.duration}
                  />
                </Grid>

                {/* Calories Burned */}
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    label="Calories Burned"
                    name="calories_burned"
                    type="number"
                    value={formik.values.calories_burned || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    variant="outlined"
                    inputProps={{ min: 0 }}
                    InputLabelProps={{ shrink: true }}
                    error={formik.touched.calories_burned && Boolean(formik.errors.calories_burned)}
                    helperText={formik.touched.calories_burned && formik.errors.calories_burned}
                  />
                </Grid>

                {/* Heart Rate Before */}
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    label="Heart Rate Before"
                    name="heart_rate_pre"
                    type="number"
                    value={formik.values.heart_rate_pre || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    variant="outlined"
                    inputProps={{ min: 0 }}
                    InputLabelProps={{ shrink: true }}
                    error={formik.touched.heart_rate_pre && Boolean(formik.errors.heart_rate_pre)}
                    helperText={formik.touched.heart_rate_pre && formik.errors.heart_rate_pre}
                  />
                </Grid>

                {/* Heart Rate After */}
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    label="Heart Rate After"
                    name="heart_rate_post"
                    type="number"
                    value={formik.values.heart_rate_post || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    variant="outlined"
                    inputProps={{ min: 0 }}
                    InputLabelProps={{ shrink: true }}
                    error={formik.touched.heart_rate_post && Boolean(formik.errors.heart_rate_post)}
                    helperText={formik.touched.heart_rate_post && formik.errors.heart_rate_post}
                  />
                </Grid>

                {/* Intensity Level */}
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Intensity Level (1-10)"
                    name="intensity_level"
                    type="number"
                    value={formik.values.intensity_level || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    variant="outlined"
                    inputProps={{ min: 1, max: 10 }}
                    InputLabelProps={{ shrink: true }}
                    error={formik.touched.intensity_level && Boolean(formik.errors.intensity_level)}
                    helperText={formik.touched.intensity_level && formik.errors.intensity_level}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Comments */}
            <Box mt={4}>
              <TextField
                label="Comments"
                name="comments"
                multiline
                rows={4}
                value={formik.values.comments || ''}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="Add any additional comments about your training session..."
                fullWidth
                variant="outlined"
                error={formik.touched.comments && Boolean(formik.errors.comments)}
                helperText={formik.touched.comments && formik.errors.comments}
              />
            </Box>

            {/* Submit Button */}
            <Box mt={4} display="flex" justifyContent="center">
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={
                  formik.isSubmitting ||
                  existingSessions.length > 0 ||
                  isSubmitting ||
                  (formik.values.exercises.length > 0 &&
                    formik.values.exercises.some((ex) => ex.exercise_id === ''))
                }
                fullWidth
                size="large"
                startIcon={
                  (formik.isSubmitting || isSubmitting) && <CircularProgress size={24} color="inherit" />
                }
              >
                {formik.isSubmitting || isSubmitting ? 'Logging...' : 'Log Session'}
              </Button>
            </Box>
          </form>
        </CardContent>
        <Divider />
        {/* Optional: Display existing sessions or additional information here */}
      </Card>
      </FormikProvider>
  );
};

LogSessionForm.propTypes = {
  workoutPlans: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      user: PropTypes.shape({
        username: PropTypes.string.isRequired,
      }).isRequired,
      workoutDays: PropTypes.arrayOf(
        PropTypes.shape({
          day: PropTypes.string.isRequired, // Updated to use 'day' field
          dayName: PropTypes.string.isRequired,
          dayNumber: PropTypes.number.isRequired,
          type: PropTypes.oneOf(['workout', 'rest']).isRequired,
          duration: PropTypes.string,
          exercises: PropTypes.arrayOf(
            PropTypes.shape({
              name: PropTypes.string.isRequired,
              setsReps: PropTypes.string.isRequired,
              equipment: PropTypes.string.isRequired,
              instructions: PropTypes.string.isRequired,
              videoId: PropTypes.string.isRequired,
              // Add other fields as necessary
            })
          ).isRequired,
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
