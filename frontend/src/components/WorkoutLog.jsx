import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';

const WorkoutLog = () => {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await axios.get('/api/training-sessions/');
        setSessions(response.data);
      } catch (error) {
        console.error('Error fetching training sessions:', error);
      }
    };

    fetchSessions();
  }, []);

  const getEmojiForFeedback = (feedback) => {
    const emojiMap = {
      'GREAT': '😄',
      'GOOD': '🙂',
      'OKAY': '😐',
      'BAD': '😕',
      'TERRIBLE': '😢'
    };
    return emojiMap[feedback] || '';
  };

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto', padding: 2 }}>
      <Typography variant="h4" gutterBottom>
        Workout Log
      </Typography>
      {sessions.map((session) => (
        <Card key={session.id} sx={{ marginBottom: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                {session.session_name || session.workout_type}
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                {format(new Date(session.date), 'MMM d, yyyy')}
              </Typography>
            </Box>
            
            <Box display="flex" alignItems="center" mt={1}>
              <Typography variant="body1" sx={{ marginRight: 1 }}>
                Feedback:
              </Typography>
              <Typography variant="h6">
                {getEmojiForFeedback(session.emoji_feedback)}
              </Typography>
            </Box>

            {session.comments && (
              <Typography variant="body2" color="textSecondary" mt={1}>
                Notes: {session.comments}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>
              Exercises:
            </Typography>
            <List dense>
              {session.exercise_details?.map((detail, index) => (
                <ListItem key={index}>
                  <ListItemText primary={detail} />
                </ListItem>
              ))}
            </List>

            <Box mt={2} display="flex" gap={1} flexWrap="wrap">
              {session.duration && (
                <Chip
                  label={`Duration: ${session.duration} min`}
                  variant="outlined"
                  size="small"
                />
              )}
              {session.calories_burned && (
                <Chip
                  label={`Calories: ${session.calories_burned}`}
                  variant="outlined"
                  size="small"
                />
              )}
              {session.average_heart_rate && (
                <Chip
                  label={`Avg HR: ${session.average_heart_rate} bpm`}
                  variant="outlined"
                  size="small"
                />
              )}
              {session.max_heart_rate && (
                <Chip
                  label={`Max HR: ${session.max_heart_rate} bpm`}
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default WorkoutLog;
