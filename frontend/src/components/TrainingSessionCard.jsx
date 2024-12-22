import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
} from "@mui/material";

const tableStyles = {
  mainBackgroundColor: "#f0f0f0",
  headerBackgroundColor: "#ddd",
  cellBorderColor: "#eee",
};
const headerStyles = {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
    padding: "12px",
    textAlign: "left",
  };

const cellStyles = {
    padding: "12px",
    borderBottom: "1px solid #eee",
  };

  const renderSessionExerciseDetails = (session, exercises) => {
    // Handle cases where exercises might be undefined or null
    const sessionExercises = exercises || [];

    const strengthExercises = sessionExercises.filter(
      (ex) =>
        ex.exercise_type === "strength" && ex.tracking_type === "weight_based"
    );

    const timeBasedExercises = sessionExercises.filter(
      (ex) =>
        ex.tracking_type === "time_based" ||
        ["cardio", "recovery", "flexibility", "stretching"].includes(
          ex.exercise_type?.toLowerCase()
        )
    );

    console.log("Strength Exercises:", strengthExercises.map(ex => ex.name));
    console.log("Time-Based Exercises:", timeBasedExercises.map(ex => ex.name));

    

    const renderStrengthExercisesTable = (exercises) => {
      if (exercises.length === 0) return null;
      return (
        <Box mt={3}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "bold" }}>
            Strength Exercises
          </Typography>
          <TableContainer component={Paper} elevation={0} sx={tableStyles}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...headerStyles, width: "40%" }}>
                    EXERCISE
                  </TableCell>
                  <TableCell sx={{ ...headerStyles, textAlign: "center" }}>
                    SETS
                  </TableCell>
                  <TableCell sx={{ ...headerStyles, textAlign: "center" }}>
                    REPS
                  </TableCell>
                  <TableCell sx={{ ...headerStyles, textAlign: "center" }}>
                    WEIGHT
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exercises.map((exercise, idx) => (
                  <TableRow key={idx}>
                    <TableCell sx={cellStyles}>{exercise.name}</TableCell>
                    <TableCell sx={{ ...cellStyles, textAlign: "center" }}>
                      {exercise.sets || "N/A"}
                    </TableCell>
                    <TableCell sx={{ ...cellStyles, textAlign: "center" }}>
                      {exercise.reps || "N/A"}
                    </TableCell>
                    <TableCell sx={{ ...cellStyles, textAlign: "center" }}>
                      {exercise.weight === null ? "N/A" : exercise.weight}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      );
    };

    const renderCardioExercisesTable = (exercises) => {
      if (exercises.length === 0) return null;
      return (
        <Box mt={3}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "bold" }}>
            Time-Based Exercises
          </Typography>
          <TableContainer component={Paper} elevation={0} sx={tableStyles}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...headerStyles, width: "40%" }}>
                    EXERCISE
                  </TableCell>
                  <TableCell sx={{ ...headerStyles, textAlign: "center" }}>
                    DURATION
                  </TableCell>
                  <TableCell sx={{ ...headerStyles, textAlign: "center" }}>
                    INTENSITY
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exercises.map((exercise, idx) => (
                  <TableRow key={idx}>
                    <TableCell sx={cellStyles}>{exercise.name}</TableCell>
                    <TableCell sx={{ ...cellStyles, textAlign: "center" }}>
                      {exercise.duration || "N/A"}
                    </TableCell>
                    <TableCell
                      sx={{
                        ...cellStyles,
                        textAlign: "center",
                        textTransform: "capitalize",
                      }}
                    >
                      {exercise.intensity || "Moderate"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      );
    };

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {renderStrengthExercisesTable(strengthExercises)}
        {renderCardioExercisesTable(timeBasedExercises)}
      </Box>
    );
  };

const TrainingSessionCard = ({ session, exercises }) => {
  const feedbackEmoji = session?.feedback_emoji; // Add optional chaining

  return (
    <Card sx={{ mb: 2, bgcolor: "#f8f9fa" }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" component="div">
            {session?.session_name || `Day ${session?.week_number}: Workout`}{" "}
            - {session?.date ? new Date(session.date).toLocaleTimeString() : ''}
          </Typography>
          {feedbackEmoji && (
            <Typography variant="h5" component="span" aria-label="feedback-emoji">
              {feedbackEmoji}
            </Typography>
          )}
        </Box>
        <Typography color="text.secondary" gutterBottom>
          Date: {session?.date ? new Date(session.date).toLocaleDateString() : ''}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
          Exercises:
        </Typography>
        {renderSessionExerciseDetails(session, exercises)}
        {session?.comments && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Comments</Typography>
            <Typography variant="body2" color="text.secondary">
              {session.comments}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TrainingSessionCard;
