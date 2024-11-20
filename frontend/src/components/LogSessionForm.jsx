// src/components/LogSessionForm.jsx

import React, { useState, useEffect, useContext } from 'react';
import axiosInstance from '../api/axiosInstance';
import PropTypes from 'prop-types';
import { AuthContext } from '../context/AuthContext';
import moment from 'moment';
import {
  TextField,
  Button,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Box,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  SentimentVeryDissatisfied,
  SentimentDissatisfied,
  SentimentNeutral,
  SentimentSatisfied,
  SentimentVerySatisfied,
  SentimentSatisfiedAlt,
} from '@mui/icons-material';
import './LogSessionForm.css';

const EMOJIS = [
  { value: 0, icon: <SentimentVeryDissatisfied fontSize="large" />, label: 'Terrible' },
  { value: 1, icon: <SentimentDissatisfied fontSize="large" />, label: 'Very Bad' },
  { value: 2, icon: <SentimentNeutral fontSize="large" />, label: 'Bad' },
  { value: 3, icon: <SentimentSatisfied fontSize="large" />, label: 'Okay' },
  { value: 4, icon: <SentimentVerySatisfied fontSize="large" />, label: 'Good' },
  { value: 5, icon: <SentimentSatisfiedAlt fontSize="large" />, label: 'Awesome' }, 
];

const LogSessionForm = ({ workoutPlans, onSessionLogged }) => {
  const { user } = useContext(AuthContext);
  const username = user && user.username ? user.username : '';

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workoutPlanId, setWorkoutPlanId] = useState(
    workoutPlans.length > 0 ? workoutPlans[0].id : ''
  );
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [emojiFeedback, setEmojiFeedback] = useState(null);
  const [comments, setComments] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [existingSessions, setExistingSessions] = useState([]);

  useEffect(() => {
    let timer;
    if (successMessage) {
      timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!workoutPlanId) {
        setSessions([]);
        setSelectedSession('');
        setError('No workout plan selected.');
        return;
      }

      setLoadingSessions(true);
      try {
        const response = await axiosInstance.get(`workout-plans/${workoutPlanId}/`);
        const planData = response.data.plan_data;

        if (planData && planData.workoutDays) {
          const { workoutDays } = planData;

          if (workoutDays.length > 0) {
            setSessions(workoutDays);
            setSelectedSession(workoutDays[0].day);
            setError(null);
          } else {
            setSessions([]);
            setSelectedSession('');
            setError('No sessions found in the selected workout plan.');
          }
        } else {
          setError('Failed to load sessions.');
          setSessions([]);
          setSelectedSession('');
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setError('Failed to load sessions.');
        setSessions([]);
        setSelectedSession('');
      } finally {
        setLoadingSessions(false);
      }
    };

    const fetchExistingSessions = async () => {
      try {
        const response = await axiosInstance.get('training_sessions/', {
          params: {
            workout_plan_id: workoutPlanId,
          },
        });
        setExistingSessions(response.data);
      } catch (error) {
        console.error('Error fetching existing sessions:', error);
        setError('Failed to fetch existing training sessions.');
      }
    };

    fetchSessions();
    fetchExistingSessions();
  }, [workoutPlanId]);

  const handleEmojiSelect = (value) => {
    setEmojiFeedback(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage('');

    if (emojiFeedback === null || emojiFeedback === undefined) {
      setError('Please select how you are feeling.');
      setIsSubmitting(false);
      return;
    }

    // Check for existing sessions on the same day
    const isSameDay = existingSessions.some(
      (session) =>
        session.date === date && session.session_name === selectedSession
    );

    if (isSameDay) {
      setError('You have already logged this session for today.');
      setIsSubmitting(false);
      return;
    }

    // Check for existing sessions in the same week
    const selectedDate = moment(date);
    const weekStart = selectedDate.clone().startOf('isoWeek');
    const weekEnd = selectedDate.clone().endOf('isoWeek');

    const isSameWeek = existingSessions.some((session) => {
      const sessionDate = moment(session.date);
      return (
        session.session_name === selectedSession &&
        sessionDate.isBetween(weekStart, weekEnd, null, '[]')
      );
    });

    if (isSameWeek) {
      setError('You have already logged this session for this week.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await axiosInstance.post('training_sessions/', {
        workout_plan_id: workoutPlanId,
        date,
        session_name: selectedSession,
        emoji_feedback: parseInt(emojiFeedback, 10),
        comments: comments,
      });
      console.log('Session logged:', response.data);
      onSessionLogged(response.data);

      // Reset form fields
      setDate(new Date().toISOString().split('T')[0]);
      setEmojiFeedback(null);
      setComments('');
      setSuccessMessage('Session logged successfully!');
      // Update existing sessions state
      setExistingSessions((prevSessions) => [...prevSessions, response.data]);
    } catch (error) {
      console.error('Error logging session:', error);
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          setError(errorData);
        } else if (errorData.detail) {
          setError(errorData.detail);
        } else if (errorData.non_field_errors) {
          setError(errorData.non_field_errors.join(' '));
        } else {
          const fieldErrors = Object.values(errorData).flat();
          setError(fieldErrors.join(' '));
        }
      } else {
        setError('Failed to log session. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="log-session-form">
      <Typography variant="h4" component="h3" align="center" gutterBottom>
        Log Training Session
      </Typography>
      {error && (
        <Typography variant="body1" color="error" align="center">
          {error}
        </Typography>
      )}
      {successMessage && (
        <Typography variant="body1" color="primary" align="center">
          {successMessage}
        </Typography>
      )}
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Date Input */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          {/* Workout Plan Dropdown */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel id="workout-plan-label">Workout Plan</InputLabel>
              <Select
                labelId="workout-plan-label"
                id="workout-plan"
                value={workoutPlanId}
                onChange={(e) => setWorkoutPlanId(e.target.value)}
                label="Workout Plan"
              >
                {workoutPlans.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>
                    {username
                      ? `Workout Plan for ${username}`
                      : `Workout Plan ${plan.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Session Dropdown */}
          <Grid item xs={12}>
            {loadingSessions ? (
              <Typography variant="body1">Loading sessions...</Typography>
            ) : sessions.length > 0 ? (
              <FormControl fullWidth required>
                <InputLabel id="session-label">Session</InputLabel>
                <Select
                  labelId="session-label"
                  id="session"
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  label="Session"
                >
                  {sessions.map((session) => (
                    <MenuItem key={session.day} value={session.day}>
                      {session.day}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Typography variant="body1" color="error">
                No sessions available.
              </Typography>
            )}
          </Grid>

          {/* Emoji Feedback */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              How are you feeling?
            </Typography>
            <Box display="flex" justifyContent="space-between" flexWrap="wrap">
              {EMOJIS.map((item) => (
                <Tooltip key={item.value} title={item.label}>
                  <IconButton
                    color={emojiFeedback === item.value ? 'primary' : 'default'}
                    onClick={() => handleEmojiSelect(item.value)}
                    size="large"
                  >
                    {item.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </Box>
          </Grid>

          {/* Comments Section */}
          <Grid item xs={12}>
            <TextField
              label="Comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any additional comments about your training session..."
              multiline
              rows={4}
              fullWidth
              required
            />
          </Grid>

          {/* Submit Button */}
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting}
              fullWidth
            >
              {isSubmitting ? 'Logging...' : 'Log Session'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </div>
  );
};

// Updated PropTypes to accept 'id' as a string instead of a number
LogSessionForm.propTypes = {
  workoutPlans: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired, // Changed from PropTypes.number.isRequired to PropTypes.string.isRequired
      plan_data: PropTypes.object.isRequired,
    })
  ).isRequired,
  onSessionLogged: PropTypes.func.isRequired,
};

export default LogSessionForm;
