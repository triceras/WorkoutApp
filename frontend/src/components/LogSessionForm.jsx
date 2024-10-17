// src/components/LogSessionForm.jsx

import React, { useState, useEffect, useContext } from 'react';
import axiosInstance from '../api/axiosInstance';
import './LogSessionForm.css';
import PropTypes from 'prop-types';
import { AuthContext } from '../context/AuthContext'; // Import AuthContext
import moment from 'moment'; // Import moment for date manipulation

// Define the fixed emojis with corresponding values and descriptions
const EMOJIS = [
  { value: 0, emoji: '😞', label: 'Terrible' },
  { value: 1, emoji: '😟', label: 'Very Bad' },
  { value: 2, emoji: '😐', label: 'Bad' },
  { value: 3, emoji: '🙂', label: 'Okay' },
  { value: 4, emoji: '😃', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Awesome' },
];

const LogSessionForm = ({ workoutPlans, onSessionLogged }) => {
  // Get the username from AuthContext
  const { user } = useContext(AuthContext);
  const username = user && user.username ? user.username : '';

  // State variables
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

  // New state variable to store existing training sessions
  const [existingSessions, setExistingSessions] = useState([]);

  // Effect to clear success message after a delay
  useEffect(() => {
    let timer;
    if (successMessage) {
      timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000); // Message disappears after 5 seconds
    }
    return () => clearTimeout(timer);
  }, [successMessage]);

  // Fetch sessions and existing training sessions when workoutPlanId changes
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
        console.log('Workout plan response:', response.data);

        const planData = response.data.plan_data;
        console.log('Plan data:', planData);

        if (planData && planData.workoutDays) {
          const { workoutDays, additionalTips } = planData;
          console.log('Parsed Workout Days:', workoutDays);
          console.log('Parsed Additional Tips:', additionalTips);

          if (workoutDays.length > 0) {
            setSessions(workoutDays);
            setSelectedSession(workoutDays[0].day);
            setError(null); // Clear any previous errors
          } else {
            setSessions([]);
            setSelectedSession('');
            setError('No sessions found in the selected workout plan.');
          }
        } else {
          console.error('Plan data does not contain workoutDays.');
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

  // Handle fixed emoji selection
  const handleEmojiSelect = (value) => {
    setEmojiFeedback(value);
  };

  // Handle form submission with validation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage('');

    // Validate that an emoji has been selected
    if (emojiFeedback === null || emojiFeedback === undefined) {
      setError('Please select an emoji to provide your feedback.');
      setIsSubmitting(false);
      return;
    }

    // Check for existing sessions on the same day
    const isSameDay = existingSessions.some(
      (session) =>
        session.date === date &&
        session.session_name === selectedSession
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
        // Backend returned a validation error
        const errorData = error.response.data;
        // Handle different types of errors
        if (typeof errorData === 'string') {
          setError(errorData);
        } else if (errorData.detail) {
          setError(errorData.detail);
        } else if (errorData.non_field_errors) {
          setError(errorData.non_field_errors.join(' '));
        } else {
          // Collect all field errors
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
      <h3>Log Training Session</h3>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {successMessage && (
        <p className="success" role="status">
          {successMessage}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        {/* Date Input */}
        <label htmlFor="session-date">
          Date:
          <input
            type="date"
            id="session-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>

        {/* Workout Plan Dropdown */}
        <label htmlFor="workout-plan">
          Workout Plan:
          <select
            id="workout-plan"
            value={workoutPlanId}
            onChange={(e) => setWorkoutPlanId(e.target.value)}
            required
          >
            {workoutPlans.map((plan, index) => (
              <option key={`plan-${plan.id || index}`} value={plan.id}>
                {username
                  ? `Workout Plan for ${username}`
                  : `Workout Plan ${plan.id || index}`}
              </option>
            ))}
          </select>
        </label>

        {/* Session Dropdown */}
        <label htmlFor="session">
          Session:
          {loadingSessions ? (
            <p>Loading sessions...</p>
          ) : sessions.length > 0 ? (
            <select
              id="session"
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              required
            >
              {sessions.map((session, index) => (
                <option key={`session-${index}`} value={session.day}>
                  {session.day}
                </option>
              ))}
            </select>
          ) : (
            <p>No sessions available.</p>
          )}
        </label>

        {/* Emoji Feedback */}
        <div className="emoji-feedback-container">
          <label className="emoji-feedback-label">How are you feeling?</label>
          <div className="emoji-options">
            {EMOJIS.map((item) => (
              <button
                type="button"
                key={item.value}
                className={`emoji-button ${
                  emojiFeedback === item.value ? 'selected' : ''
                }`}
                onClick={() => handleEmojiSelect(item.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleEmojiSelect(item.value);
                  }
                }}
                aria-label={`${item.label} (${item.value})`}
                title={`${item.label} (${item.value})`}
              >
                <span role="img" aria-hidden="true" className="emoji">
                  {item.emoji}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Comments Section */}
        <div className="comments-section">
          <label htmlFor="comments">Comments:</label>
          <textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add any additional comments about your training session..."
            rows="5"
            maxLength="500"
            required
          />
        </div>

        {/* Submit Button */}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging...' : 'Log Session'}
        </button>
      </form>
    </div>
  );
};

LogSessionForm.propTypes = {
  workoutPlans: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      plan_data: PropTypes.object.isRequired,
    })
  ).isRequired,
  onSessionLogged: PropTypes.func.isRequired,
};

export default LogSessionForm;
