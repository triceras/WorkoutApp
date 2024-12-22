import React, { useState, useEffect, useCallback } from "react";
import TrainingSessionCard from "./TrainingSessionCard";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
} from "@mui/material";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import axiosInstance from "../api/axiosInstance";

const MetricCard = ({ title, value, icon }) => (
  <Card sx={{ height: "100%", bgcolor: "#f8f9fa", boxShadow: 2 }}>
    <CardContent>
      <Box display="flex" alignItems="center" mb={1}>
        {icon}
        <Typography variant="h6" component="div" ml={1} color="text.secondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" component="div" fontWeight="bold">
        {value}
      </Typography>
    </CardContent>
  </Card>
);

const ProgressionMetrics = ({ isRestDay }) => {
  const [metrics, setMetrics] = useState({
    totalSessions: 0,
    recentSessions: 0,
    totalDuration: 0,
    averageDuration: 0,
    totalCalories: 0,
    workoutTypes: {},
    strengthProgress: {},
    cardioProgress: {},
    completionRate: 0,
    averageRating: 0,
    sessions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axiosInstance.get("user/progression/");
      const data = response.data;

      console.log("Fetched session data in Dashboard:", data); // Inspect fetched data in dashboard

      if (data) {
        setMetrics({
          totalSessions: data.total_sessions || 0,
          recentSessions: data.recent_sessions || 0,
          totalDuration: data.total_duration || 0,
          averageDuration: data.avg_duration || 0,
          totalCalories: data.total_calories || 0,
          workoutTypes: data.workout_types || {},
          strengthProgress: data.strength_progress || {},
          cardioProgress: data.cardio_progress || {},
          completionRate: ((data.recent_sessions || 0) / 30 * 100).toFixed(0),
          averageRating: data.avg_rating || 0,
          sessions: data.sessions || [],
        });
      }
    } catch (err) {
      console.error("Error fetching metrics:", err);
      const errorMessage =
        err.response?.data?.error || err.message || "Unknown error";
      const errorDetails = err.response
        ? JSON.stringify(err.response.data)
        : "No response details";
      setError(`Error: ${errorMessage}. Details: ${errorDetails}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();

    const handleSessionLogged = () => {
      fetchMetrics();
    };

    window.addEventListener("session-logged", handleSessionLogged);
    return () =>
      window.removeEventListener("session-logged", handleSessionLogged);
  }, [fetchMetrics]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
        color="error.main"
      >
        <Typography>{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Your Progress
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="Total Sessions"
            value={metrics.totalSessions}
            icon={<FitnessCenterIcon color="primary" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="Recent Sessions (30 days)"
            value={metrics.recentSessions}
            icon={<TrendingUpIcon color="secondary" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="Completion Rate"
            value={`${metrics.completionRate}%`}
            icon={<EmojiEventsIcon sx={{ color: "success.main" }} />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Workout Statistics
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1">
                  Total Duration: {Math.round(metrics.totalDuration)} minutes
                </Typography>
                <Typography variant="body1">
                  Average Duration: {metrics.averageDuration} minutes
                </Typography>
                <Typography variant="body1">
                  Total Calories: {metrics.totalCalories} kcal
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Workout Types
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
                {Object.entries(metrics.workoutTypes).map(([type, count]) => (
                  <Chip
                    key={type}
                    label={`${type}: ${count}`}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {!isRestDay && (
        <Box mt={4}>
          <Typography variant="h6" component="h2" gutterBottom>
            Recent Training Sessions
          </Typography>
          {metrics.sessions.map((session) => {
            // Find the corresponding workoutDay based on the session date
            const workoutDay = session.workout_plan.workoutDays.find(
              (day) =>
                day.day.toLowerCase() ===
                new Date(session.date)
                  .toLocaleString("en-US", { weekday: "long" })
                  .toLowerCase()
            );
            // Extract exercises from the workoutDay, or use an empty array if not found
            const exercises = workoutDay ? workoutDay.exercises : [];

            return (
              <TrainingSessionCard
                key={session.id}
                session={session}
                exercises={exercises}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default ProgressionMetrics;
