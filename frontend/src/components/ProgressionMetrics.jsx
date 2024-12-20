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
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer
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
    sessions: []  // Ensure this is initialized as an empty array
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

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

  useEffect(() => {
    fetchMetrics();

    const handleSessionLogged = (event) => {
      console.log('Session logged event received:', event.detail);
      fetchMetrics();
    };

    window.addEventListener('session-logged', handleSessionLogged);
    return () => window.removeEventListener('session-logged', handleSessionLogged);
  }, [fetchMetrics]);

  const renderSessionExercises = (session) => {
    // Separate exercises by type
    const strengthExercises = session.exercises.filter(ex => 
      ex.exercise_type === 'strength' || ex.tracking_type === 'weight_based'
    );
    const cardioExercises = session.exercises.filter(ex => 
      ex.exercise_type === 'cardio' || ex.tracking_type === 'time_based'
    );

    const tableStyles = {
      bgcolor: 'rgb(236, 252, 239)',
      borderRadius: '4px',
      '& .MuiTable-root': {
        borderCollapse: 'collapse',
      },
      '& .MuiTableCell-root': {
        borderBottom: '1px solid rgba(224, 224, 224, 1)',
      }
    };

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {strengthExercises.length > 0 && (
          <TableContainer component={Paper} elevation={0} sx={tableStyles}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: '40%' }}>EXERCISE</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>SET 1</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>SET 2</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>SET 3</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>SET 4</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {strengthExercises.map((exercise, idx) => (
                  <TableRow key={idx}>
                    <TableCell component="th" scope="row">
                      {exercise.exercise_name || exercise.name}
                    </TableCell>
                    <TableCell align="center">{exercise.reps || '12'}</TableCell>
                    <TableCell align="center">{exercise.reps || '12'}</TableCell>
                    <TableCell align="center">{exercise.reps || '12'}</TableCell>
                    <TableCell align="center">-</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {cardioExercises.length > 0 && (
          <TableContainer component={Paper} elevation={0} sx={tableStyles}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: '40%' }}>EXERCISE</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>DURATION</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>INTENSITY</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cardioExercises.map((exercise, idx) => (
                  <TableRow key={idx}>
                    <TableCell component="th" scope="row">
                      {exercise.exercise_name || exercise.name}
                    </TableCell>
                    <TableCell>{exercise.duration || '5 minutes'}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>
                      {exercise.intensity || 'moderate'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Display session comments if available */}
        {session.comments && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Comments</Typography>
            <Typography variant="body2" color="text.secondary">
              {session.comments}
            </Typography>
          </Box>
        )}
      </Box>
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

      {!isRestDay && (
        <>
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
        </>
      )}
    </Box>
  );
};

export default ProgressionMetrics;
