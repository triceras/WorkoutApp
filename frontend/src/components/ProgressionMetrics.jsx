import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
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
  const [trainingSessions, setTrainingSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get('user/progression/');
      
      if (!response.data) {
        throw new Error('No data received from server');
      }

      const { training_sessions } = response.data;
      
      if (!Array.isArray(training_sessions)) {
        throw new Error('Invalid training sessions data');
      }
      
      const completedSessions = training_sessions
        .filter(session => session.source === 'completed')
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setTrainingSessions(completedSessions);
    } catch (err) {
      setError('Failed to load progression metrics');
      console.error('Error fetching progression metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const getWorkoutTypeColor = (type) => {
    const colors = {
      'Light Cardio': '#4caf50',
      'Cardio': '#2196f3',
      'Strength': '#ff9800',
      'HIIT': '#f44336',
    };
    return colors[type] || '#757575';
  };

  const getEmojiForRating = (rating) => {
    const emojis = {
      1: '😢',
      2: '😕',
      3: '😐',
      4: '🙂',
      5: '😄'
    };
    return emojis[rating] || 'N/A';
  };

  const averageRating = trainingSessions.length > 0
    ? trainingSessions.reduce((acc, session) => acc + (session.emoji_feedback || 0), 0) / trainingSessions.length
    : 'N/A';

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={4}>
          <MetricCard
            title="Total Sessions"
            value={trainingSessions.length}
            icon={<FitnessCenterIcon sx={{ color: '#1976d2' }} />}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <MetricCard
            title="Average Rating"
            value={typeof averageRating === 'number' ? averageRating.toFixed(1) : 'N/A'}
            icon={<TrendingUpIcon sx={{ color: '#4caf50' }} />}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <MetricCard
            title="Feedback Count"
            value={trainingSessions.filter(s => s.emoji_feedback !== null).length}
            icon={<EmojiEventsIcon sx={{ color: '#ff9800' }} />}
          />
        </Grid>
      </Grid>

      <Typography variant="h5" component="h2" mb={3} fontWeight="medium">
        Training Sessions History
      </Typography>

      <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell>Date</TableCell>
              <TableCell>Workout Type</TableCell>
              <TableCell>Exercise</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Comments</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trainingSessions.map((session) => (
              <TableRow 
                key={session.id}
                sx={{ '&:hover': { bgcolor: '#fafafa' } }}
              >
                <TableCell>
                  {new Date(session.date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={session.workout_type}
                    size="small"
                    sx={{
                      bgcolor: getWorkoutTypeColor(session.workout_type),
                      color: 'white',
                    }}
                  />
                </TableCell>
                <TableCell>
                  {session.exercises?.map((exercise, index) => (
                    <div key={index}>
                      {exercise.exercise_name}
                    </div>
                  ))}
                </TableCell>
                <TableCell>
                  {session.workout_type.toLowerCase().includes('cardio') ? 
                    `${session.time || session.duration || 'N/A'} min` : 
                    `${session.duration || 'N/A'} min`}
                </TableCell>
                <TableCell>
                  <Tooltip title={`Rating: ${session.emoji_feedback || 'N/A'}`}>
                    <span style={{ fontSize: '1.2rem' }}>
                      {session.emoji_feedback !== null ? getEmojiForRating(session.emoji_feedback) : 'N/A'}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {session.comments || 'No comments'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ProgressionMetrics;
