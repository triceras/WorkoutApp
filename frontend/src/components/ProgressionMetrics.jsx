import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  Chip,
  CircularProgress
} from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import axiosInstance from '../api/axiosInstance';

const MetricCard = ({ title, value, icon }) => (
  <Card sx={{ height: '100%', bgcolor: '#f8f9fa', boxShadow: 2 }}>
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

const ProgressionMetrics = () => {
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
    sessions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Add more detailed logging
      console.log('Fetching metrics...');

      const response = await axiosInstance.get('user/progression/');
      console.log('Response received:', response);

      const data = response.data;
      console.log('Metrics data:', data);

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
          averageRating: 0,
          sessions: data.sessions || []
        });
      }
    } catch (err) {
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.response?.data?.error || 'Unable to fetch progress data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Remove redundant refreshMetrics function
  useEffect(() => {
    // Initial fetch
    fetchMetrics();
  
    const handleSessionLogged = (event) => {
      console.log('Session logged event received:', event.detail);
      fetchMetrics();
    };
  
    window.addEventListener('session-logged', handleSessionLogged);
    return () => window.removeEventListener('session-logged', handleSessionLogged);
  }, [fetchMetrics]);

  const renderSessionExercises = (session) => {
    if (!session.exercises || session.exercises.length === 0) {
        return (
            <Typography color="text.secondary">
                {session.source === 'scheduled' ? 'Scheduled session' : 'No exercises recorded'}
            </Typography>
        );
    }

    return (
        <List dense>
            {session.exercises.map((exercise, index) => {
                const isCardio = exercise.exercise_type === 'cardio';

                let details = '';
                if (isCardio) {
                    details = `duration: ${exercise.duration} mins`;
                    if (exercise.intensity) {
                        details += ` • ${exercise.intensity} intensity`;
                    }
                } else {
                    if (exercise.sets && exercise.reps) {
                        details = `sets: ${exercise.sets}, reps: ${exercise.reps}`;
                        if (exercise.weight) {
                            details += ` @ ${exercise.weight}kg`;
                        }
                    }
                }

                return (
                    <ListItem key={index}>
                        <ListItemText
                            primary={exercise.exercise_name}
                            secondary={details}
                        />
                    </ListItem>
                );
            })}
        </List>
    );
};

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
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
    <Box sx={{ p: 3 }}>
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
            icon={<EmojiEventsIcon sx={{ color: 'success.main' }} />}
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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
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

      <Typography variant="h6" component="h2" sx={{ mt: 4, mb: 2 }}>
        Recent Training Sessions
      </Typography>
      
      {metrics.sessions.map((session, index) => (
        <Card key={index} sx={{ mb: 2, bgcolor: '#f8f9fa' }}>
          <CardContent>
            <Typography variant="h6" component="div">
              {session.session_name || `Day ${session.week_number}: Workout`} - {new Date(session.date).toLocaleTimeString()}
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              Date: {new Date(session.date).toLocaleDateString()}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
              Exercises:
            </Typography>
            {renderSessionExercises(session)}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default ProgressionMetrics;
