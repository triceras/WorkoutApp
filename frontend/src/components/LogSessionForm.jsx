import React, { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import { Formik, Form, FieldArray, useFormikContext } from "formik";
import * as Yup from "yup";
import axiosInstance from "../api/axiosInstance";
import { AuthContext } from "../context/AuthContext";
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
  Autocomplete,
} from "@mui/material";
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
  Assignment,
} from "@mui/icons-material";

const EMOJIS = [
  {
    value: 0,
    icon: <SentimentVeryDissatisfied fontSize="large" />,
    label: "Terrible",
  },
  {
    value: 1,
    icon: <SentimentDissatisfied fontSize="large" />,
    label: "Very Bad",
  },
  { value: 2, icon: <SentimentNeutral fontSize="large" />, label: "Bad" },
  { value: 3, icon: <SentimentSatisfied fontSize="large" />, label: "Okay" },
  { value: 4, icon: <SentimentVerySatisfied fontSize="large" />, label: "Good" },
  {
    value: 5,
    icon: <SentimentSatisfiedAlt fontSize="large" />,
    label: "Awesome",
  },
];

const WORKOUT_TYPE_CHOICES = [
  "Cardio",
  "Light Cardio",
  "Strength",
  "Flexibility",
  "Balance",
  "Endurance",
  "Power",
  "Speed",
  "Agility",
  "Plyometric",
  "Core",
  "Chest & Triceps",
  "Back & Biceps",
  "Shoulders & Abs",
  "Legs",
  "Full Body",
  "Upper Body",
  "Lower Body",
  "Push",
  "Pull",
  "HIIT",
  "Recovery",
  "Stretching",
];

const INTENSITY_OPTIONS = ["Low", "Moderate", "High"];

const LogSessionForm = ({
  workoutPlans = [],
  currentWorkout = null,
  source = "completed",
  onSessionLogged = () => {},
}) => {
  const { user } = useContext(AuthContext);
  const [submissionStatus, setSubmissionStatus] = useState({
    success: "",
    error: "",
  });
  const [availableExercises, setAvailableExercises] = useState([]);
  const [exercisesLoading, setExercisesLoading] = useState(true);
  const [exercisesError, setExercisesError] = useState(null);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setExercisesLoading(true);
        const response = await axiosInstance.get("exercises/");
        const exercises = response.data.map((exercise) => ({
          ...exercise,
          exercise_type:
            exercise.exercise_type ||
            (exercise.name.toLowerCase().includes("bike")
              ? "cardio"
              : "strength"),
          tracking_type:
            exercise.exercise_type === "cardio" ||
            exercise.exercise_type === "recovery" ||
            exercise.exercise_type === "flexibility" ||
            exercise.exercise_type === "endurance" ||
            exercise.name.toLowerCase().includes("bike")
              ? "time_based"
              : "weight_based",
        }));
        setAvailableExercises(exercises);
      } catch (error) {
        console.error("Error fetching exercises:", error);
        setExercisesError("Failed to load exercises");
      } finally {
        setExercisesLoading(false);
      }
    };
    fetchExercises();
  }, []);

  // Set the touched state for all fields to true
  const SetTouched = () => {
    const { setFieldTouched } = useFormikContext();

    useEffect(() => {
      if (!exercisesLoading) {
        Object.keys(getInitialFormValues()).forEach((key) => {
          setFieldTouched(key, true);
        });
        getInitialFormValues().exercises.forEach((_, index) => {
          setFieldTouched(`exercises.${index}.name`, true);
          setFieldTouched(`exercises.${index}.exercise_type`, true);

          if (
            getInitialFormValues().exercises[index].tracking_type === "time_based"
          ) {
            setFieldTouched(`exercises.${index}.duration`, true);
            setFieldTouched(`exercises.${index}.intensity`, true);
          } else {
            setFieldTouched(`exercises.${index}.sets`, true);
            setFieldTouched(`exercises.${index}.reps`, true);
            setFieldTouched(`exercises.${index}.weight`, true);
          }
        });
      }
    }, [exercisesLoading, setFieldTouched]);

    return null;
  };

  const getInitialFormValues = () => {
    const today = new Date().toISOString().split("T")[0];
    const dayNumber = new Date().getDay();
    let initialValues = {
      session_name: currentWorkout?.name || `Day ${dayNumber}: Workout`,
      workout_type: currentWorkout?.workout_type || "Strength",
      session_date: today,
      heart_rate_pre: "",
      heart_rate_post: "",
      calories_burned: "",
      feedback_rating: 3,
      comments: "",
      exercises: [],
    };

    const workoutExercises = currentWorkout?.exercises || [];

    if (workoutExercises.length > 0 && availableExercises.length > 0) {
      initialValues.exercises = workoutExercises.map((exercise) => {
        console.log("Processing exercise:", exercise);

        const isCardio = exercise.tracking_type === "time_based";

        // Convert instructions if needed
        let instructionsValue = exercise.instructions;
        if (instructionsValue && typeof instructionsValue === "object") {
          instructionsValue = JSON.stringify(instructionsValue);
        }

        // Find matching exercise in available exercises
        const matchedExercise = availableExercises.find(
          (ex) =>
            ex.name.toLowerCase().trim() === exercise.name.toLowerCase().trim()
        );

        return {
          name: exercise.name,
          exercise_id: matchedExercise?.id || null,
          exercise_type: exercise.exercise_type,
          tracking_type: exercise.tracking_type,
          sets: isCardio ? null : exercise.sets?.toString().replace(/\s*sets?\s*/gi, ''),
          reps: isCardio ? null : exercise.reps?.toString().replace(/\s*reps?\s*/gi, ''),
          weight: isCardio
            ? null
            : exercise.weight === 0 ||
              exercise.weight === "bodyweight" ||
              exercise.exercise_type === "full body"
            ? "bodyweight"
            : exercise.weight?.toString().replace(/\s*lbs?\s*/gi, ''),
            duration: isCardio && exercise.duration
            ? `${parseInt(exercise.duration)} minutes`
            : null,
          intensity: isCardio
            ? INTENSITY_OPTIONS.includes(exercise.intensity)
              ? exercise.intensity
              : INTENSITY_OPTIONS[1]
            : null,
          avg_heart_rate: "",
          max_heart_rate: "",
          videoId: exercise.videoId || matchedExercise?.videoId || "",
          instructions: instructionsValue || "",
          equipment: exercise.equipment || "",
          isPrePopulated: true,
        };
      });
    }
    return initialValues;
  };

  const validationSchema = Yup.object({
    session_name: Yup.string().required("Session name is required"),
    workout_type: Yup.string().required("Workout type is required"),
    session_date: Yup.string().required("Session date is required"),
    exercises: Yup.array()
      .of(
        Yup.object({
          name: Yup.string().required("Exercise name is required"),
          exercise_id: Yup.number().nullable(),
          weight: Yup.mixed().nullable(),
          duration: Yup.string()
            .nullable()
            .test(
              "duration-required",
              "Duration is required for cardio exercises",
              function (value) {
                const { tracking_type, exercise_type } = this.parent;
                if (
                  tracking_type === "time_based" ||
                  exercise_type === "cardio"
                ) {
                  return value !== null && value !== "";
                }
                return true;
              }
            ),
          intensity: Yup.string()
            .nullable()
            .test(
              "intensity-required",
              "Intensity is required for cardio exercises",
              function (value) {
                const { tracking_type, exercise_type } = this.parent;
                if (
                  tracking_type === "time_based" ||
                  exercise_type === "cardio"
                ) {
                  return value !== null && value !== "";
                }
                return true;
              }
            )
            .test(
              "intensity-valid",
              "Invalid intensity value",
              function (value) {
                const { tracking_type, exercise_type } = this.parent;
                if (
                  (tracking_type === "time_based" ||
                    exercise_type === "cardio") &&
                  value
                ) {
                  return INTENSITY_OPTIONS.includes(value);
                }
                return true;
              }
            ),
          sets: Yup.mixed()
            .nullable()
            .transform((_, val) => {
              if (val === "" || val === null) return null;
              // Remove any non-numeric characters and convert to number
              const numericValue = val.toString().replace(/[^0-9]/g, '');
              return numericValue ? parseInt(numericValue) : null;
            }),
          reps: Yup.mixed()
            .nullable()
            .transform((_, val) => {
              if (val === "" || val === null) return null;
              // Remove any non-numeric characters and convert to number
              const numericValue = val.toString().replace(/[^0-9]/g, '');
              return numericValue ? parseInt(numericValue) : null;
            }),
          avg_heart_rate: Yup.number()
            .nullable()
            .transform((value) => (isNaN(value) ? null : value)),
          max_heart_rate: Yup.number()
            .nullable()
            .transform((value) => (isNaN(value) ? null : value)),
          tracking_type: Yup.string(),
          videoId: Yup.string().nullable(),
          instructions: Yup.string().nullable(),
          equipment: Yup.string().nullable(),
        })
      )
      .min(1, "At least one exercise is required"),
    feedback_rating: Yup.number().required("Please rate your session"),
    comments: Yup.string(),
    heart_rate_pre: Yup.number()
      .nullable()
      .transform((value) => (isNaN(value) ? null : value)),
    heart_rate_post: Yup.number()
      .nullable()
      .transform((value) => (isNaN(value) ? null : value)),
    calories_burned: Yup.number()
      .nullable()
      .transform((value) => (isNaN(value) ? null : value)),
  });

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    setSubmitting(true);
    console.log("Form values submitted:", values);

    try {
      const chosenWorkoutPlanId =
        workoutPlans.length > 0 && workoutPlans[0].id
          ? workoutPlans[0].id
          : null;

      if (!chosenWorkoutPlanId) {
        throw new Error("No workout plan ID found. Cannot log the session.");
      }

      const workoutTypeValue = WORKOUT_TYPE_CHOICES.includes(
        values.workout_type
      )
        ? values.workout_type
        : "Recovery";

      const exercisesData = values.exercises.map((exercise) => {
        const isCardio = exercise.tracking_type === "time_based";
        const intensityValue =
          isCardio && exercise.intensity ? exercise.intensity : null;

        if (isCardio || exercise.duration) {
          return {
            name: exercise.name,
            exercise_id: exercise.exercise_id,
            exercise_type: exercise.exercise_type,
            tracking_type: "time_based",
            sets: null,
            reps: null,
            weight: null,
            duration: exercise.duration ? parseInt(exercise.duration.toString().replace(/[^0-9]/g, '')) * 60 : null, // Convert minutes to seconds
            intensity: exercise.intensity || 'Moderate',
          };
        }

        return {
          name: exercise.name,
          exercise_id: exercise.exercise_id,
          exercise_type: exercise.exercise_type,
          tracking_type: exercise.tracking_type,
          sets: exercise.sets,
          reps: exercise.reps,
          weight:
            exercise.weight === "bodyweight" ||
            exercise.weight === 0 ||
            exercise.exercise_type === "full body"
              ? 0
              : exercise.weight
              ? exercise.weight
              : null,
          duration: null,
          intensity: null,
        };
      });

      const sessionData = {
        date: values.session_date,
        workout_plan_id: chosenWorkoutPlanId,
        source: source,
        session_name: values.session_name,
        workout_type: workoutTypeValue,
        heart_rate_pre: values.heart_rate_pre || null,
        heart_rate_post: values.heart_rate_post || null,
        calories_burned: values.calories_burned || null,
        feedback_rating: values.feedback_rating,
        comments: values.comments,
        exercises: exercisesData,
      };

      console.log("Session data to be sent:", sessionData);

      const response = await axiosInstance.post("training_sessions/", sessionData);

      console.log("API response:", response);

      if (response.status === 201) {
        setSubmissionStatus({
          success: "Training session logged successfully!",
          error: "",
        });
        onSessionLogged(response.data);

        const event = new CustomEvent("session-logged", {
          detail: { success: true },
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        (error.response?.status === 400
          ? "This session has already been logged"
          : "Failed to log training session");

      console.error("Error logging session:", error);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      }

      setSubmissionStatus({ success: "", error: errorMessage });
      setErrors({ submit: errorMessage });
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
      validateOnMount={true} // Validate on mount
      enableReinitialize={true}
    >
      {(formik) => {
        let workoutTypeValue = formik.values.workout_type || "";
        if (workoutTypeValue === "Active Recovery") {
          workoutTypeValue = "Recovery";
        }

        return (
          <Form noValidate>
            <SetTouched />
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
                              formik.touched.session_name &&
                              formik.errors.session_name
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
                            {formik.touched.workout_type &&
                              formik.errors.workout_type && (
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
                              return (
                                <Box key={index} sx={{ mb: 2, p: 2, bgcolor: alpha('#000', 0.02), borderRadius: 1 }}>
                                  <Grid container spacing={2} alignItems="center">
                                  <Grid item xs={12} sm={4}>
                                        <Autocomplete
                                            options={availableExercises}
                                            getOptionLabel={(option) => option.name || ''}
                                            value={availableExercises.find(ex => ex.id === exercise.exercise_id) || null}
                                            onChange={(event, newValue) => {
                                                formik.setFieldValue(`exercises.${index}.name`, newValue?.name || '');
                                                formik.setFieldValue(`exercises.${index}.exercise_id`, newValue?.id || null);
                                                const exerciseType = newValue?.exercise_type || 'strength';
                                                const isTimeBased = ['cardio', 'recovery', 'flexibility', 'endurance'].includes(exerciseType?.toLowerCase());
                                                formik.setFieldValue(`exercises.${index}.exercise_type`, exerciseType);
                                                formik.setFieldValue(`exercises.${index}.tracking_type`, isTimeBased ? 'time_based' : 'weight_based');

                                                if (isTimeBased) {
                                                    formik.setFieldValue(`exercises.${index}.sets`, null);
                                                    formik.setFieldValue(`exercises.${index}.reps`, null);
                                                    formik.setFieldValue(`exercises.${index}.weight`, null);
                                                    formik.setFieldValue(
                                                        `exercises.${index}.duration`,
                                                        newValue?.duration ? `${Math.round(parseInt(newValue.duration) / 60)} minutes` : '45 minutes'
                                                    );
                                                    formik.setFieldValue(`exercises.${index}.intensity`, newValue?.intensity || 'Moderate');
                                                } else {
                                                    // Get values from the selected exercise
                                                    // Parse sets and reps by removing the units
                                                    const sets = newValue?.sets?.toString().replace(/\s*sets?\s*/gi, '');
                                                    const reps = newValue?.reps?.toString().replace(/\s*reps?\s*/gi, '');
                                                    const weight = newValue?.weight === 0 ? 'bodyweight' : newValue?.weight?.toString().replace(/\s*lbs?\s*/gi, '');
                                                    
                                                    formik.setFieldValue(`exercises.${index}.sets`, sets);
                                                    formik.setFieldValue(`exercises.${index}.reps`, reps);
                                                    formik.setFieldValue(`exercises.${index}.weight`, weight);
                                                    formik.setFieldValue(`exercises.${index}.duration`, null);
                                                    formik.setFieldValue(`exercises.${index}.intensity`, null);
                                                }
                                            }}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Exercise Name"
                                                    error={formik.touched.exercises?.[index]?.name && Boolean(formik.errors.exercises?.[index]?.name)}
                                                    helperText={formik.touched.exercises?.[index]?.name && formik.errors.exercises?.[index]?.name}
                                                    InputLabelProps={{
                                                        shrink: true,
                                                    }}
                                                />
                                            )}
                                        />
                                    </Grid>

                                    {isCardio ? (
                                      <Grid item xs={12} sm={7} container spacing={2}>
                                        <Grid item xs={6}>
                                          <FormControl fullWidth>
                                            <TextField
                                              label="Duration"
                                              name={`exercises.${index}.duration`}
                                              value={formik.values.exercises[index].duration || ''}
                                              onChange={(e) => {
                                                const value = e.target.value.replace(/[^0-9]/g, '');
                                                formik.setFieldValue(
                                                  `exercises.${index}.duration`,
                                                  value === '' ? null : `${value} minutes`
                                                );
                                              }}
                                              error={formik.touched.exercises?.[index]?.duration && Boolean(formik.errors.exercises?.[index]?.duration)}
                                              helperText={formik.touched.exercises?.[index]?.duration && formik.errors.exercises?.[index]?.duration}
                                              InputProps={{
                                                endAdornment: <InputAdornment position="end">minutes</InputAdornment>,
                                              }}
                                            />
                                          </FormControl>
                                        </Grid>
                                        <Grid item xs={6}>
                                          <FormControl
                                            fullWidth
                                            error={formik.touched.exercises?.[index]?.intensity && Boolean(formik.errors.exercises?.[index]?.intensity)}
                                          >
                                            <InputLabel>Intensity</InputLabel>
                                            <Select
                                              name={`exercises.${index}.intensity`}
                                              value={exercise.intensity || 'Moderate'}
                                              onChange={(e) => {
                                                formik.setFieldValue(`exercises.${index}.intensity`, e.target.value);
                                              }}
                                              onBlur={() => formik.setFieldTouched(`exercises.${index}.intensity`, true)}
                                            >
                                              {INTENSITY_OPTIONS.map((option) => (
                                                <MenuItem key={option} value={option}>
                                                  {option}
                                                </MenuItem>
                                              ))}
                                            </Select>
                                            {formik.touched.exercises?.[index]?.intensity && formik.errors.exercises?.[index]?.intensity && (
                                              <FormHelperText>
                                                {formik.errors.exercises[index].intensity}
                                              </FormHelperText>
                                            )}
                                          </FormControl>
                                        </Grid>
                                      </Grid>
                                    ) : (
                                      <Grid item xs={12} sm={7} container spacing={2}>
                                        <Grid item xs={4}>
                                            <FormControl fullWidth>
                                              <TextField
                                                label="Sets"
                                                name={`exercises.${index}.sets`}
                                                type="number"
                                                value={formik.values.exercises[index].sets || ''} // This ensures values are displayed
                                                onChange={(e) => {
                                                  const value = e.target.value.replace(/[^0-9]/g, '');
                                                  formik.setFieldValue(
                                                    `exercises.${index}.sets`,
                                                    value === '' ? null : parseInt(value) // Parse to integer
                                                  );
                                                }}
                                                error={
                                                  formik.touched.exercises?.[index]?.sets &&
                                                  Boolean(formik.errors.exercises?.[index]?.sets)
                                                }
                                                helperText={
                                                  formik.touched.exercises?.[index]?.sets &&
                                                  formik.errors.exercises?.[index]?.sets
                                                }
                                              />
                                            </FormControl>
                                          </Grid>
                                          <Grid item xs={4}>
                                            <FormControl fullWidth>
                                              <TextField
                                                label="Reps"
                                                name={`exercises.${index}.reps`}
                                                type="number"
                                                value={formik.values.exercises[index].reps || ''} // This ensures values are displayed
                                                onChange={(e) => {
                                                  const value = e.target.value.replace(/[^0-9]/g, '');
                                                  formik.setFieldValue(
                                                    `exercises.${index}.reps`,
                                                    value === '' ? null : parseInt(value) // Parse to integer
                                                  );
                                                }}
                                                error={
                                                  formik.touched.exercises?.[index]?.reps &&
                                                  Boolean(formik.errors.exercises?.[index]?.reps)
                                                }
                                                helperText={
                                                  formik.touched.exercises?.[index]?.reps &&
                                                  formik.errors.exercises?.[index]?.reps
                                                }
                                              />
                                            </FormControl>
                                          </Grid>
                                        <Grid item xs={4}>
                                          <FormControl fullWidth>
                                            <TextField
                                              label="Weight"
                                              name={`exercises.${index}.weight`}
                                              type="text"
                                              value={formik.values.exercises[index].weight || ''}
                                              onChange={(e) => {
                                                const value = e.target.value;
                                                formik.setFieldValue(`exercises.${index}.weight`, value === '' ? null : value);
                                              }}
                                              error={formik.touched.exercises?.[index]?.weight && Boolean(formik.errors.exercises?.[index]?.weight)}
                                              helperText={formik.touched.exercises?.[index]?.weight && formik.errors.exercises?.[index]?.weight}
                                              InputProps={{
                                                endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                                              }}
                                            />
                                          </FormControl>
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
                                  sets: null,
                                  reps: null,
                                  weight: null,
                                  duration: null,
                                  intensity: null,
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
                            {EMOJIS.map((emoji) => (
                              <Grid item key={emoji.value}>
                                <IconButton
                                  onClick={() => formik.setFieldValue('feedback_rating', emoji.value)}
                                  color={formik.values.feedback_rating === emoji.value ? 'primary' : 'default'}
                                  size="large"
                                  title={emoji.label}
                                >
                                  {emoji.icon}
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
                    disabled={formik.isSubmitting || !formik.isValid}
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
  onSessionLogged: PropTypes.func,
};

export default LogSessionForm;
