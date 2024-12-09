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
  IconButton,
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

// Workout types categorized as aerobic
const AEROBIC_WORKOUT_TYPES = ['Cardio', 'Endurance', 'Speed', 'Agility', 'Plyometric', 'Core'];

// Intensity options for aerobic workouts
const INTENSITY_OPTIONS = ['low', 'moderate', 'high'];

// Workout types categorized as non-aerobic
const NON_AEROBIC_WORKOUT_TYPES = ['Strength', 'Flexibility', 'Balance'];

// All possible workout types
const WORKOUT_TYPE_OPTIONS = [...AEROBIC_WORKOUT_TYPES, ...NON_AEROBIC_WORKOUT_TYPES];

// Exercise types matching backend choices
const EXERCISE_TYPES = {
  STRENGTH: 'strength',
  FLEXIBILITY: 'flexibility',
  BALANCE: 'balance',
  ENDURANCE: 'endurance',
  POWER: 'power',
  SPEED: 'speed',
  AGILITY: 'agility',
  PLYOMETRIC: 'plyometric',
  CORE: 'core',
  CARDIO: 'cardio',
};

// Helper function to determine exercise type based on workout type
const getExerciseType = (workoutType) => {
  const typeMap = {
    'Cardio': EXERCISE_TYPES.CARDIO,
    'Strength': EXERCISE_TYPES.STRENGTH,
    'Flexibility': EXERCISE_TYPES.FLEXIBILITY,
    'Balance': EXERCISE_TYPES.BALANCE,
    'Endurance': EXERCISE_TYPES.ENDURANCE,
    'Power': EXERCISE_TYPES.POWER,
    'Speed': EXERCISE_TYPES.SPEED,
    'Agility': EXERCISE_TYPES.AGILITY,
    'Plyometric': EXERCISE_TYPES.PLYOMETRIC,
    'Core': EXERCISE_TYPES.CORE,
  };
  
  return typeMap[workoutType] || EXERCISE_TYPES.STRENGTH; // Default to strength if type not found
};

// Helper function to check if exercise is cardio/endurance type
const isCardioExercise = (exerciseType) => {
  return ['cardio', 'endurance', 'aerobic'].includes(exerciseType.toLowerCase());
};

/**
 * Helper function to extract day number from day string
 * @param {string} dayString - String like "Day 4: Cardio and Core"
 * @returns {number|null} - Day number (1-7) or null if not found
 */
const extractDayNumber = (dayString) => {
  const match = dayString.match(/Day (\d+)/i); // Case-insensitive match
  return match ? parseInt(match[1], 10) : null;
};

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
          dayNumber: extractDayNumber(day.day) || 0, // dayNumber is now derived here
          exercises: (day.exercises || []).map((exercise) => ({
            sets: exercise.sets !== undefined ? exercise.sets : '',
            reps: exercise.reps !== undefined ? exercise.reps : '',
            weight: exercise.weight !== undefined ? exercise.weight : '',
            duration: exercise.duration || '', // Add duration if applicable
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

  /**
   * Maps exercise names to their corresponding IDs.
   * If an exercise is not found, it creates it in the backend.
   * @param {Array} exercises - Array of exercises from the workout plan.
   * @returns {Array} - Array of exercises with mapped exercise_id.
   */
  const mapExerciseNamesToIds = async (exercises, workoutType) => {
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
            description: ex.description || '',
            video_url: ex.video_url || '',
            videoId: ex.videoId || '',
            exercise_type: getExerciseType(workoutType),
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

      // Parse duration from setsReps if it's an aerobic exercise
      let duration = '';
      if (AEROBIC_WORKOUT_TYPES.includes(workoutType) && ex.setsReps) {
        const durationMatch = ex.setsReps.match(/(\d+)\s*minutes?/i);
        duration = durationMatch ? durationMatch[1] : '';
      }

      // Parse sets and reps from setsReps if it's a non-aerobic exercise
      let sets = '', reps = '';
      if (!AEROBIC_WORKOUT_TYPES.includes(workoutType) && ex.setsReps) {
        const setsRepsMatch = ex.setsReps.match(/(\d+)\s*sets?\s*of\s*(\d+)/i);
        if (setsRepsMatch) {
          sets = setsRepsMatch[1];
          reps = setsRepsMatch[2];
        }
      }

      mappedExercises.push({
        ...ex,
        exercise_id: matchedExercise.id,
        name: matchedExercise.name,
        exercise_type: getExerciseType(workoutType),
        sets: sets || ex.sets || '',
        reps: reps || ex.reps || '',
        weight: ex.weight || '',
        duration: duration || ex.duration || '',
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
      workout_type: currentSession?.workout_type || '', // Set initial workout_type
      session_name: currentSession ? currentSession.day : '',
      emoji_feedback: 3,
      comments: '',
      duration: '',
      calories_burned: '',
      heart_rate_pre: '',
      heart_rate_post: '',
      intensity: '', // For aerobic workouts
      time: '', // For aerobic workouts
      average_heart_rate: '', // For aerobic workouts
      max_heart_rate: '', // For aerobic workouts
      exercises: [], // Initialize with an empty array
      source: source || '',
    },
    enableReinitialize: true,
    validationSchema: Yup.object().shape({
      date: Yup.date().required('Date is required'),
      workout_plan_id: Yup.string().required('Workout plan ID is required'),
      workout_type: Yup.string()
        .oneOf(WORKOUT_TYPE_OPTIONS, 'Invalid workout type')
        .required('Workout type is required'),
      session_name: Yup.string().required('Session name is required'),
      emoji_feedback: Yup.number()
        .min(0, 'Minimum rating is 0')
        .max(5, 'Maximum rating is 5')
        .required('Rating is required'),
      comments: Yup.string(),
      duration: Yup.number()
        .transform((value) => (isNaN(value) ? undefined : value))
        .nullable(),
      calories_burned: Yup.number()
        .transform((value) => (isNaN(value) ? undefined : value))
        .nullable(),
      heart_rate_pre: Yup.number()
        .transform((value) => (isNaN(value) ? undefined : value))
        .nullable(),
      heart_rate_post: Yup.number()
        .transform((value) => (isNaN(value) ? undefined : value))
        .nullable(),
      intensity: Yup.string().test({
        name: 'intensity',
        test: function(value) {
          const workoutType = this.parent.workout_type;
          if (AEROBIC_WORKOUT_TYPES.includes(workoutType)) {
            return value ? true : false;
          }
          return true;
        },
        message: 'Intensity is required for aerobic workouts',
      }),
      time: Yup.number().test({
        name: 'time',
        test: function(value) {
          const workoutType = this.parent.workout_type;
          if (AEROBIC_WORKOUT_TYPES.includes(workoutType)) {
            return value > 0 ? true : false;
          }
          return true;
        },
        message: 'Time is required for aerobic workouts',
      }),
      average_heart_rate: Yup.number().test({
        name: 'average_heart_rate',
        test: function(value) {
          const workoutType = this.parent.workout_type;
          if (AEROBIC_WORKOUT_TYPES.includes(workoutType)) {
            return value >= 40 && value <= 220;
          }
          return true;
        },
        message: 'Average heart rate must be between 40 and 220 bpm',
      }),
      max_heart_rate: Yup.number().test({
        name: 'max_heart_rate',
        test: function(value) {
          const workoutType = this.parent.workout_type;
          if (AEROBIC_WORKOUT_TYPES.includes(workoutType)) {
            return value >= 40 && value <= 220;
          }
          return true;
        },
        message: 'Max heart rate must be between 40 and 220 bpm',
      }),
      exercises: Yup.array().of(
        Yup.object().shape({
          exercise_id: Yup.number()
            .transform((value) => (isNaN(value) ? undefined : value))
            .nullable(),
          name: Yup.string().required('Exercise name is required'),
          exercise_type: Yup.string().required('Exercise type is required'),
          sets: Yup.number()
            .transform((value) => (isNaN(value) ? undefined : value))
            .nullable(),
          reps: Yup.number()
            .transform((value) => (isNaN(value) ? undefined : value))
            .nullable(),
          weight: Yup.number()
            .transform((value) => (isNaN(value) ? undefined : value))
            .nullable(),
          duration: Yup.number()
            .transform((value) => (isNaN(value) ? undefined : value))
            .nullable(),
          intensity: Yup.string().nullable()
        })
      )
    }),
    onSubmit: async (values, { resetForm }) => {
      console.log('Starting form submission...'); // Debug log
      setError(null);
      setSubmissionStatus({ success: '', error: '' });
      setIsSubmitting(true);

      try {
        // Basic validation
        if (!values.workout_type) {
          throw new Error('Workout type is required');
        }

        if (!values.workout_plan_id) {
          throw new Error('Workout plan is required');
        }

        // Ensure exercises array is valid
        if (!values.exercises || values.exercises.length === 0) {
          throw new Error('At least one exercise is required');
        }

        // Prepare the form submission payload
        const preparePayload = (values) => {
          const payload = {
            date: values.date,
            workout_plan_id: values.workout_plan_id,
            workout_type: values.workout_type,
            session_name: values.session_name,
            emoji_feedback: Number(values.emoji_feedback),
            comments: values.comments || '',
            duration: Number(values.duration || 0),
            time: AEROBIC_WORKOUT_TYPES.includes(values.workout_type) ? Number(values.time || 0) : null,
            intensity: AEROBIC_WORKOUT_TYPES.includes(values.workout_type) ? capitalizeIntensity(values.intensity || 'moderate') : null,
            average_heart_rate: AEROBIC_WORKOUT_TYPES.includes(values.workout_type) ? Number(values.average_heart_rate || 0) : null,
            max_heart_rate: AEROBIC_WORKOUT_TYPES.includes(values.workout_type) ? Number(values.max_heart_rate || 0) : null,
            source: source || 'dashboard',
            exercises: values.exercises.map(ex => {
              const exercisePayload = {
                exercise_id: ex.exercise_id,
                exercise_type: ex.exercise_type,
                name: ex.name,
              };

              if (isCardioExercise(ex.exercise_type)) {
                exercisePayload.duration = ex.duration ? Number(ex.duration) : null;
                exercisePayload.intensity = capitalizeIntensity(ex.intensity || 'moderate');
                exercisePayload.average_heart_rate = ex.average_heart_rate ? Number(ex.average_heart_rate) : null;
                exercisePayload.max_heart_rate = ex.max_heart_rate ? Number(ex.max_heart_rate) : null;
                // Remove strength-specific fields
                delete exercisePayload.sets;
                delete exercisePayload.reps;
                delete exercisePayload.weight;
              } else {
                // For strength exercises
                exercisePayload.sets = Number(ex.sets || 1);
                exercisePayload.reps = Number(ex.reps || 1);
                exercisePayload.weight = ex.weight ? Number(ex.weight) : null;
                // Remove cardio-specific fields
                delete exercisePayload.duration;
                delete exercisePayload.intensity;
                delete exercisePayload.average_heart_rate;
                delete exercisePayload.max_heart_rate;
              }

              return exercisePayload;
            })
          };

          return payload;
        };

        const payload = preparePayload(values);

        console.log('Submitting payload:', payload); // Debug log

        const response = await axiosInstance.post('/training_sessions/', payload);
        console.log('Server response:', response.data); // Debug log

        if (response.data) {
          // Call the onSessionLogged callback with the response data
          if (onSessionLogged) {
            onSessionLogged(response.data);
          }
          
          // Reset form and show success message
          resetForm();
          setSubmissionStatus({ 
            success: 'Session logged successfully! Your feedback has been received.', 
            error: '' 
          });
          setExistingSessions((prev) => [...prev, values.workout_type]);
          
          // Clear the form after successful submission
          setCurrentSession(null);
        }
      } catch (error) {
        console.error('Form submission error:', error);
        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.detail || 
                           error.message || 
                           'Failed to log session. Please try again.';
        setSubmissionStatus({
          success: '',
          error: errorMessage
        });
        setError(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Helper function to capitalize intensity
  const capitalizeIntensity = (intensity) => {
    return intensity.charAt(0).toUpperCase() + intensity.slice(1).toLowerCase();
  };

  // Add debug logging for form state
  useEffect(() => {
    console.log('Form validation state:', {
      isValid: formik.isValid,
      errors: formik.errors,
      values: formik.values,
      touched: formik.touched
    });
  }, [formik.isValid, formik.errors, formik.values, formik.touched]);

  /**
   * Initializes the form when the current session changes.
   */
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
    formik.setFieldError('emoji_feedback', undefined); // Clear previous errors
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
        // Clear workout_type and exercises
        formik.setFieldValue('workout_type', '');
        formik.setFieldValue('exercises', []);
        formik.setFieldValue('time', '');
        formik.setFieldValue('average_heart_rate', '');
        formik.setFieldValue('max_heart_rate', '');
        formik.setFieldValue('intensity', '');
        formik.setFieldValue('duration', '');
        setError('Selected day is a rest day. No session to log.');
      } else {
        formik.setFieldValue('workout_type', workoutDay.workout_type); // Set to valid workout type

        // Set exercises based on workout type
        const mappedExercises = await mapExerciseNamesToIds(workoutDay.exercises, workoutDay.workout_type);
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

        // If it's an aerobic workout, set additional fields if necessary
        if (AEROBIC_WORKOUT_TYPES.includes(workoutDay.workout_type)) {
          // Optionally, set default values or clear existing ones
          formik.setFieldValue('intensity', '');
          formik.setFieldValue('time', '');
          formik.setFieldValue('average_heart_rate', '');
          formik.setFieldValue('max_heart_rate', '');
          formik.setFieldValue('duration', '');
        }

        setError(null);
      }
    } else {
      formik.setFieldValue('session_name', 'No Workout Scheduled');
      formik.setFieldValue('workout_type', '');
      formik.setFieldValue('exercises', []);
      formik.setFieldValue('time', '');
      formik.setFieldValue('average_heart_rate', '');
      formik.setFieldValue('max_heart_rate', '');
      formik.setFieldValue('intensity', '');
      formik.setFieldValue('duration', '');
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

  const renderFeedbackSection = () => {
    const selectedEmoji = EMOJIS.find(emoji => emoji.value === formik.values.emoji_feedback);
    const isNegativeFeedback = formik.values.emoji_feedback <= 2;

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          How was your workout?
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          {EMOJIS.map((emoji) => (
            <Box
              key={emoji.value}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                opacity: formik.values.emoji_feedback === emoji.value ? 1 : 0.5,
                transition: 'all 0.2s ease',
                '&:hover': {
                  opacity: 1,
                  transform: 'scale(1.1)',
                },
              }}
              onClick={() => handleEmojiSelect(emoji.value)}
            >
              {emoji.icon}
              <Typography variant="caption">{emoji.label}</Typography>
            </Box>
          ))}
        </Box>
        
        {selectedEmoji && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, fontStyle: 'italic' }}
          >
            {selectedEmoji.helpText}
          </Typography>
        )}

        <TextField
          fullWidth
          multiline
          rows={4}
          name="comments"
          label={isNegativeFeedback ? "Please tell us what we can improve" : "Additional comments (optional)"}
          value={formik.values.comments}
          onChange={formik.handleChange}
          error={formik.touched.comments && Boolean(formik.errors.comments)}
          helperText={
            isNegativeFeedback
              ? "Your feedback helps us adjust your workout plan. What exercises were too difficult? What would you like to change?"
              : formik.touched.comments && formik.errors.comments
          }
          required={isNegativeFeedback}
          sx={{ mt: 2 }}
        />
      </Box>
    );
  };

  // Render success message if session was logged
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

  // Show error if no workout plans
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
      <Card>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom align="center">
            Log Training Session
          </Typography>
          
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              console.log('Form submitted with values:', formik.values);
              formik.handleSubmit(e);
            }} 
            noValidate
          >
            {submissionStatus.success && (
              <Box mb={2}>
                <Typography color="success.main" align="center">
                  {submissionStatus.success}
                </Typography>
              </Box>
            )}
            {submissionStatus.error && (
              <Box mb={2}>
                <Typography color="error" align="center">
                  {submissionStatus.error}
                </Typography>
              </Box>
            )}
            {/* Workout Type Selection */}
            <Box mt={4}>
              <FormControl
                fullWidth
                required
                variant="outlined"
                error={formik.touched.workout_type && Boolean(formik.errors.workout_type)}
              >
                <InputLabel id="workout-type-label">Workout Type</InputLabel>
                <Select
                  labelId="workout-type-label"
                  id="workout-type"
                  name="workout_type"
                  value={formik.values.workout_type || ''}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  label="Workout Type"
                >
                  <MenuItem value="">
                    <em>Select Workout Type</em>
                  </MenuItem>
                  {WORKOUT_TYPE_OPTIONS.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.workout_type && formik.errors.workout_type && (
                  <Typography color="error" variant="body2">
                    {formik.errors.workout_type}
                  </Typography>
                )}
              </FormControl>
            </Box>

            {renderFeedbackSection()}

            {/* Exercises Field Array */}
            <FieldArray name="exercises">
              {({ push, remove }) => (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Exercises
                  </Typography>
                  
                  {formik.values.exercises.map((exercise, index) => (
                    <Card key={index} sx={{ mb: 2, p: 2 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={11}>
                          <Typography variant="subtitle1" sx={{ mb: 2 }}>
                            Exercise {index + 1}
                          </Typography>
                        </Grid>
                        <Grid item xs={1}>
                          <IconButton 
                            onClick={() => remove(index)}
                            disabled={formik.values.exercises.length === 1}
                            color="error"
                            size="small"
                          >
                            <RemoveCircle />
                          </IconButton>
                        </Grid>

                        {/* Exercise Name and Type */}
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Exercise Name"
                            name={`exercises.${index}.name`}
                            value={exercise.name}
                            onChange={formik.handleChange}
                            variant="outlined"
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Exercise Type"
                            name={`exercises.${index}.exercise_type`}
                            value={exercise.exercise_type}
                            onChange={formik.handleChange}
                            variant="outlined"
                            size="small"
                          />
                        </Grid>

                        {isCardioExercise(exercise.exercise_type) ? (
                          // Cardio Exercise Fields
                          <>
                            <Grid item xs={12} md={3}>
                              <TextField
                                fullWidth
                                label="Duration (min)"
                                name={`exercises.${index}.duration`}
                                type="number"
                                value={exercise.duration}
                                onChange={formik.handleChange}
                                variant="outlined"
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                fullWidth
                                label="Avg Heart Rate"
                                name={`exercises.${index}.avg_heart_rate`}
                                type="number"
                                value={exercise.avg_heart_rate}
                                onChange={formik.handleChange}
                                variant="outlined"
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                fullWidth
                                label="Max Heart Rate"
                                name={`exercises.${index}.max_heart_rate`}
                                type="number"
                                value={exercise.max_heart_rate}
                                onChange={formik.handleChange}
                                variant="outlined"
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Intensity</InputLabel>
                                <Select
                                  name={`exercises.${index}.intensity`}
                                  value={exercise.intensity || ''}
                                  onChange={formik.handleChange}
                                  label="Intensity"
                                >
                                  <MenuItem value="low">Low</MenuItem>
                                  <MenuItem value="moderate">Medium</MenuItem>
                                  <MenuItem value="high">High</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                          </>
                        ) : (
                          // Strength Exercise Fields
                          <>
                            <Grid item xs={12} md={3}>
                              <TextField
                                fullWidth
                                label="Sets"
                                name={`exercises.${index}.sets`}
                                type="number"
                                value={exercise.sets}
                                onChange={formik.handleChange}
                                variant="outlined"
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                fullWidth
                                label="Reps"
                                name={`exercises.${index}.reps`}
                                type="number"
                                value={exercise.reps}
                                onChange={formik.handleChange}
                                variant="outlined"
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <TextField
                                fullWidth
                                label="Weight (kg)"
                                name={`exercises.${index}.weight`}
                                type="number"
                                value={exercise.weight}
                                onChange={formik.handleChange}
                                variant="outlined"
                                size="small"
                              />
                            </Grid>
                          </>
                        )}
                      </Grid>
                    </Card>
                  ))}

                  <Button
                    type="button"
                    variant="contained"
                    color="primary"
                    startIcon={<AddCircle />}
                    onClick={() => push({
                      exercise_id: '',
                      name: '',
                      exercise_type: '',
                      sets: '',
                      reps: '',
                      weight: '',
                      duration: '',
                      avg_heart_rate: '',
                      max_heart_rate: '',
                      intensity: ''
                    })}
                    sx={{ mt: 2 }}
                  >
                    Add Exercise
                  </Button>
                </Box>
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

            {/* Aerobic Session Details */}
            <Box mt={4}>
              <Typography variant="h6" gutterBottom>
                Aerobic Session Details
              </Typography>
              <Grid container spacing={2}>
                {/* Time */}
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Duration (minutes)"
                    name="time"
                    type="number"
                    value={formik.values.time || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    variant="outlined"
                    inputProps={{ min: 1 }}
                    InputLabelProps={{ shrink: true }}
                    error={formik.touched.time && Boolean(formik.errors.time)}
                    helperText={formik.touched.time && formik.errors.time}
                  />
                </Grid>

                {/* Average Heart Rate */}
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Average Heart Rate"
                    name="average_heart_rate"
                    type="number"
                    value={formik.values.average_heart_rate || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    variant="outlined"
                    inputProps={{ min: 0 }}
                    InputLabelProps={{ shrink: true }}
                    error={
                      formik.touched.average_heart_rate &&
                      Boolean(formik.errors.average_heart_rate)
                    }
                    helperText={
                      formik.touched.average_heart_rate && formik.errors.average_heart_rate
                    }
                  />
                </Grid>

                {/* Max Heart Rate */}
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Max Heart Rate"
                    name="max_heart_rate"
                    type="number"
                    value={formik.values.max_heart_rate || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    required
                    variant="outlined"
                    inputProps={{ min: 0 }}
                    InputLabelProps={{ shrink: true }}
                    error={
                      formik.touched.max_heart_rate && Boolean(formik.errors.max_heart_rate)
                    }
                    helperText={formik.touched.max_heart_rate && formik.errors.max_heart_rate}
                  />
                </Grid>

                {/* Intensity */}
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Intensity</InputLabel>
                    <Select
                      labelId="intensity-label"
                      id="intensity"
                      name="intensity"
                      value={formik.values.intensity || ''}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label="Intensity"
                    >
                      <MenuItem value="">
                        <em>Select Intensity</em>
                      </MenuItem>
                      {INTENSITY_OPTIONS.map((option) => (
                        <MenuItem key={option} value={option.toLowerCase()}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            {/* Submit Button */}
            <Box mt={4} display="flex" justifyContent="center">
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting || existingSessions.length > 0}
                fullWidth
                sx={{ py: 2 }}
                onClick={() => {
                  console.log('Submit button clicked');
                  console.log('Form state:', {
                    isValid: formik.isValid,
                    errors: formik.errors,
                    values: formik.values,
                    dirty: formik.dirty,
                    touched: formik.touched
                  });
                }}
              >
                {isSubmitting ? (
                  <Box display="flex" alignItems="center" justifyContent="center">
                    <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                    <span>Logging Session...</span>
                  </Box>
                ) : (
                  'Log Session'
                )}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
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
              instructions: PropTypes.string.isRequired,
              videoId: PropTypes.string.isRequired,
              // Add other fields as necessary
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
