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
const getExerciseType = (workoutType) => {
  const typeMap = {
    'Cardio': 'cardio',
    'Light Cardio': 'cardio',
    'Endurance': 'endurance',
    'Strength': 'strength',
    'Flexibility': 'flexibility',
    'Balance': 'balance',
    'Power': 'power',
    'Speed': 'speed',
    'Agility': 'agility',
    'Plyometric': 'plyometric',
    'Core': 'core',
  };
  
  return typeMap[workoutType] || 'cardio'; // Default to cardio if type not found
};

// Helper function to check if exercise is cardio/endurance type
const isCardioExercise = (exerciseType) => {
  if (!exerciseType) return false;
  const type = String(exerciseType).toLowerCase();
  return ['cardio', 'endurance'].includes(type);
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

  // State to hold selected workout plan
  const [selectedWorkoutPlan, setSelectedWorkoutPlan] = useState(workoutPlans[0] || null);

  // Effect to handle workout plan selection
  useEffect(() => {
    if (workoutPlans.length > 0 && !selectedWorkoutPlan) {
      setSelectedWorkoutPlan(workoutPlans[0]);
    }
  }, [workoutPlans]);

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
              const isCardio = exercise.name?.toLowerCase().includes('jogging') || 
                             exercise.name?.toLowerCase().includes('running') ||
                             exercise.exercise_type === 'cardio' ||
                             exercise.tracking_type === 'time_based';

              const processedExercise = {
                ...exercise,
                tracking_type: 'time_based',
                exercise_type: 'cardio',
                duration: exercise.duration || '30 minutes',
                intensity: exercise.intensity || 'Low',
                sets: null,
                reps: null
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
      date: DateTime.local().toFormat('yyyy-MM-dd'),
      workout_type: 'Cardio',  // Always start with a valid value
      workout_plan_id: selectedWorkoutPlan?.id || '',
      exercises: currentSession?.exercises?.map(exercise => {
        console.log('Mapping exercise for form:', exercise);
        const isCardio = exercise.name?.toLowerCase().includes('jogging') || 
                        exercise.name?.toLowerCase().includes('running') ||
                        exercise.exercise_type === 'cardio' ||
                        exercise.tracking_type === 'time_based';

        // Extract numeric duration value and remove "minutes" text
        let duration = '30';
        if (exercise.duration) {
          const match = exercise.duration.replace(/\s*minutes\s*/, '').trim();
          duration = match || '30';
        }
        console.log('Duration value:', duration);

        const formExercise = {
          name: exercise.name,
          exercise_type: isCardio ? 'cardio' : 'strength',
          tracking_type: isCardio ? 'time_based' : 'weight_based',
          duration: duration,
          intensity: exercise.intensity || 'Low',
          sets: isCardio ? '' : (exercise.sets || ''),
          reps: isCardio ? '' : (exercise.reps || ''),
          weight: exercise.weight || '',
          notes: ''
        };
        console.log('Form exercise:', formExercise);
        return formExercise;
      }) || [],
      feedback_rating: 3,
      feedback_notes: '',
    },
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
            duration: Yup.string()
              .when('exercise_type', (exerciseType, schema) =>
                exerciseType === 'cardio'
                  ? schema.required('Duration is required')
                  : schema
              ),
            intensity: Yup.string()
              .when('exercise_type', (exerciseType, schema) =>
                exerciseType === 'cardio'
                  ? schema.required('Intensity is required')
                  : schema
              ),
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
          const isCardio = exercise.name?.toLowerCase().includes('jogging') || 
                          exercise.name?.toLowerCase().includes('running') ||
                          exercise.exercise_type === 'cardio' ||
                          exercise.tracking_type === 'time_based';
          
          return {
            exercise_id: exercise.exercise_id,  // Make sure this is set
            name: exercise.name,
            exercise_type: exercise.exercise_type,
            tracking_type: isCardio ? 'time_based' : 'reps_based',
            duration: isCardio ? parseInt(exercise.duration) : null,  // Convert to integer
            intensity: isCardio ? exercise.intensity || 'Low' : null,  // Ensure proper case
            sets: !isCardio ? parseInt(exercise.sets) : null,
            reps: !isCardio ? parseInt(exercise.reps) : null,
            weight: exercise.weight ? parseFloat(exercise.weight) : null
          };
        });

        const sessionData = {
          workout_plan_id: values.workout_plan_id || selectedWorkoutPlan?.id,
          workout_type: values.workout_type || 'Cardio',
          exercises: transformedExercises,
          user: user.id,
          date: values.date,
          feedback_rating: values.feedback_rating,
          feedback_notes: values.feedback_notes,
          source: 'completed',  // Always set source to 'completed' for logged sessions
          // Add time field for cardio workouts
          time: values.workout_type === 'Cardio' ? 
            (transformedExercises[0]?.duration || 30) : null
        };

        if (!sessionData.workout_plan_id) {
          throw new Error('A workout plan is required. Please select a workout plan or create one.');
        }

        if (sessionData.workout_type === 'Cardio' && !sessionData.time) {
          throw new Error('Duration is required for cardio workouts');
        }

        console.log('Submitting session data:', sessionData);
        const response = await axiosInstance.post('/training_sessions/', sessionData);
        
        setSubmissionStatus({
          success: 'Session logged successfully!',
          error: ''
        });

        if (onSessionLogged) {
          onSessionLogged(response.data);
        }

        // Reset form after successful submission
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

  // Update the workout type if it's not in the valid options
  useEffect(() => {
    if (currentSession?.workout_type && !WORKOUT_TYPE_OPTIONS.includes(currentSession.workout_type)) {
      // If the current session has an invalid workout type, update it
      if (formik) {
        formik.setFieldValue('workout_type', 'Cardio');
      }
    }
  }, [currentSession]);

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
    formik.setFieldValue('feedback_rating', value);
    formik.setFieldError('feedback_rating', undefined); // Clear previous errors
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
      } else if (workoutDay.type === 'active_recovery') {
        // Handle active recovery days
        const updatedSession = {
          ...workoutDay,
          exercises: workoutDay.exercises.map(exercise => ({
            ...exercise,
            tracking_type: exercise.tracking_type || 'time_based',
            duration: exercise.duration || '20-30',
            intensity: exercise.intensity || 'low'
          }))
        };
        formik.setFieldValue('workout_type', updatedSession.workout_type);
        formik.setFieldValue('session_name', updatedSession.day);
        const mappedExercises = await mapExerciseNamesToIds(updatedSession.exercises, updatedSession.workout_type);
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
        setError(null);
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
    const selectedEmoji = EMOJIS.find(emoji => emoji.value === formik.values.feedback_rating);
    const isNegativeFeedback = formik.values.feedback_rating <= 2;

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
                opacity: formik.values.feedback_rating === emoji.value ? 1 : 0.5,
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
          name="feedback_notes"
          label={isNegativeFeedback ? "Please tell us what we can improve" : "Additional notes (optional)"}
          value={formik.values.feedback_notes}
          onChange={formik.handleChange}
          error={formik.touched.feedback_notes && Boolean(formik.errors.feedback_notes)}
          helperText={
            isNegativeFeedback
              ? "Your feedback helps us adjust your workout plan. What exercises were too difficult? What would you like to change?"
              : formik.touched.feedback_notes && formik.errors.feedback_notes
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
      <Box
        component="form"
        onSubmit={formik.handleSubmit}
        sx={{
          maxWidth: '800px',
          margin: '0 auto',
          p: { xs: 2, sm: 3 },
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: '#2D3748',
              mb: 1,
            }}
          >
            🏋️‍♂️ Log Training Session
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              color: '#718096',
            }}
          >
            Track your progress and help us improve your workout plan
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: '15px',
            background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)',
            border: '1px solid rgba(33, 150, 243, 0.1)',
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: '#1976d2',
              fontWeight: 700,
              display: 'block',
              mb: 2,
            }}
          >
            📅 WORKOUT DETAILS
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                name="date"
                label="Date"
                value={formik.values.date}
                onChange={handleDateChange}
                error={formik.touched.date && Boolean(formik.errors.date)}
                helperText={formik.touched.date && formik.errors.date}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="workout-plan-label">Workout Plan</InputLabel>
                <Select
                  labelId="workout-plan-label"
                  id="workout-plan"
                  value={formik.values.workout_plan_id}
                  onChange={(e) => {
                    formik.setFieldValue('workout_plan_id', e.target.value);
                    const plan = workoutPlans.find(p => p.id === e.target.value);
                    setSelectedWorkoutPlan(plan || null);
                  }}
                  label="Workout Plan"
                  error={formik.touched.workout_plan_id && Boolean(formik.errors.workout_plan_id)}
                >
                  {workoutPlans.map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      {plan.name || `Workout Plan ${plan.id}`}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.workout_plan_id && formik.errors.workout_plan_id && (
                  <FormHelperText error>{formik.errors.workout_plan_id}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="workout-type-label">Workout Type</InputLabel>
                <Select
                  labelId="workout-type-label"
                  id="workout-type"
                  name="workout_type"
                  value={WORKOUT_TYPE_OPTIONS.includes(formik.values.workout_type) ? formik.values.workout_type : 'Cardio'}
                  onChange={(e) => {
                    formik.setFieldValue('workout_type', e.target.value);
                    // Update exercise types based on workout type
                    if (formik.values.exercises.length > 0) {
                      const newExercises = formik.values.exercises.map(exercise => ({
                        ...exercise,
                        exercise_type: getExerciseType(e.target.value)
                      }));
                      formik.setFieldValue('exercises', newExercises);
                    }
                  }}
                  label="Workout Type"
                  error={formik.touched.workout_type && Boolean(formik.errors.workout_type)}
                >
                  {WORKOUT_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.workout_type && formik.errors.workout_type && (
                  <FormHelperText error>{formik.errors.workout_type}</FormHelperText>
                )}
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: '15px',
            background: 'linear-gradient(135deg, #fff3e0 0%, #ffffff 100%)',
            border: '1px solid rgba(245, 124, 0, 0.1)',
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: '#f57c00',
              fontWeight: 700,
              display: 'block',
              mb: 2,
            }}
          >
            💪 EXERCISES
          </Typography>
          <FieldArray name="exercises">
            {({ push, remove }) => (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {formik.values.exercises.map((exercise, index) => {
                  const isCardio = exercise.name?.toLowerCase().includes('jogging') || 
                                 exercise.name?.toLowerCase().includes('running') ||
                                 exercise.exercise_type === 'cardio' ||
                                 exercise.tracking_type === 'time_based';
                  
                  return (
                    <Box
                      key={index}
                      sx={{
                        p: 2,
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.7)',
                        border: '1px solid rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            name={`exercises.${index}.name`}
                            label="Exercise Name"
                            value={exercise.name}
                            onChange={formik.handleChange}
                            error={
                              formik.touched.exercises?.[index]?.name &&
                              Boolean(formik.errors.exercises?.[index]?.name)
                            }
                            helperText={
                              formik.touched.exercises?.[index]?.name &&
                              formik.errors.exercises?.[index]?.name
                            }
                          />
                        </Grid>
                        {isCardio ? (
                          <>
                            <Grid item xs={6} sm={3}>
                              <TextField
                                fullWidth
                                name={`exercises.${index}.duration`}
                                label="Duration"
                                type="text"
                                value={formik.values.exercises[index].duration?.replace(/\s*minutes\s*/, '') || ''}
                                onChange={(e) => {
                                  // Only allow numeric input
                                  const value = e.target.value.replace(/[^0-9]/g, '');
                                  formik.setFieldValue(`exercises.${index}.duration`, value);
                                }}
                                error={
                                  formik.touched.exercises?.[index]?.duration &&
                                  Boolean(formik.errors.exercises?.[index]?.duration)
                                }
                                helperText={
                                  formik.touched.exercises?.[index]?.duration &&
                                  formik.errors.exercises?.[index]?.duration
                                }
                                InputProps={{
                                  endAdornment: <InputAdornment position="end">min</InputAdornment>,
                                }}
                              />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <FormControl fullWidth>
                                <InputLabel>Intensity</InputLabel>
                                <Select
                                  name={`exercises.${index}.intensity`}
                                  value={exercise.intensity || ''}
                                  onChange={formik.handleChange}
                                  label="Intensity"
                                >
                                  {INTENSITY_OPTIONS.map((intensity) => (
                                    <MenuItem key={intensity} value={intensity}>
                                      {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                          </>
                        ) : (
                          <>
                            <Grid item xs={6} sm={2}>
                              <TextField
                                fullWidth
                                name={`exercises.${index}.sets`}
                                label="Sets"
                                type="number"
                                value={exercise.sets}
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
                            <Grid item xs={6} sm={2}>
                              <TextField
                                fullWidth
                                name={`exercises.${index}.reps`}
                                label="Reps"
                                type="number"
                                value={exercise.reps}
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
                            <Grid item xs={12} sm={2}>
                              <TextField
                                fullWidth
                                name={`exercises.${index}.weight`}
                                label="Weight (kg)"
                                type="number"
                                value={exercise.weight}
                                onChange={formik.handleChange}
                              />
                            </Grid>
                          </>
                        )}
                        <Grid item xs={12} sm={1}>
                          <IconButton
                            onClick={() => remove(index)}
                            color="error"
                            sx={{ mt: { xs: 1, sm: 0 } }}
                          >
                            <RemoveCircle />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </Box>
                  );
                })}
                <Button
                  startIcon={<AddCircle />}
                  onClick={() =>
                    push({
                      name: '',
                      duration: '',
                      intensity: 'low',
                      sets: '',
                      reps: '',
                      weight: '',
                      notes: ''
                    })
                  }
                  sx={{
                    mt: 1,
                    background: 'linear-gradient(135deg, #f57c00 0%, #ff9800 100%)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #ef6c00 0%, #f57c00 100%)',
                    },
                  }}
                >
                  Add Exercise
                </Button>
              </Box>
            )}
          </FieldArray>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: '15px',
            background: 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%)',
            border: '1px solid rgba(76, 175, 80, 0.1)',
          }}
        >
          <Typography
            variant="overline"
            sx={{
              color: '#43a047',
              fontWeight: 700,
              display: 'block',
              mb: 2,
            }}
          >
            📝 FEEDBACK
          </Typography>
          {renderFeedbackSection()}
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {/* Display validation errors if any */}
          {!formik.isValid && formik.submitCount > 0 && (
            <Typography color="error" variant="body2">
              Please fix the following errors:
              <ul>
                {Object.entries(formik.errors).map(([field, error]) => {
                  if (field === 'exercises') {
                    return formik.errors.exercises?.map((exerciseError, index) => (
                      exerciseError && (
                        <li key={`exercise-${index}`}>
                          Exercise {index + 1}:{' '}
                          {Object.entries(exerciseError).map(([key, value]) => (
                            <div key={key}>{value}</div>
                          ))}
                        </li>
                      )
                    ));
                  }
                  return (
                    <li key={field}>
                      {typeof error === 'string' ? error : JSON.stringify(error)}
                    </li>
                  );
                })}
              </ul>
            </Typography>
          )}
          
          <Button
            type="submit"
            variant="contained"
            onClick={() => {
              console.log('Submit button clicked');
              console.log('Form state:', {
                values: formik.values,
                errors: formik.errors,
                isValid: formik.isValid,
                isSubmitting,
                touched: formik.touched
              });
              formik.handleSubmit();
            }}
            sx={{
              py: 2,
              px: 6,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6B46C1 0%, #553C9A 100%)',
              fontSize: '1.1rem',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #553C9A 0%, #44307D 100%)',
              },
            }}
          >
            {isSubmitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Log Session'
            )}
          </Button>
        </Box>
      </Box>
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
