// src/components/LogSessionForm.jsx

import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import './LogSessionForm.css';
import PropTypes from 'prop-types';

const LogSessionForm = ({ workoutPlans, onSessionLogged }) => {
  // State variables
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workoutPlanId, setWorkoutPlanId] = useState(
    workoutPlans.length > 0 ? workoutPlans[0].id : ''
  );
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [emojiFeedback, setEmojiFeedback] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Predefined emojis representing feelings from 0 to 5
  const feelings = [
    { id: 0, emoji: '😞', label: 'Terrible' },
    { id: 1, emoji: '😟', label: 'Very Bad' },
    { id: 2, emoji: '😐', label: 'Bad' },
    { id: 3, emoji: '🙂', label: 'Okay' },
    { id: 4, emoji: '😃', label: 'Good' },
    { id: 5, emoji: '😄', label: 'Awesome' },
  ];

  // Parsing function to extract sessions from plan string
  const parseWorkoutPlan = (plan) => {
    if (typeof plan !== 'string') {
      console.error('Invalid plan data:', plan);
      return { workoutDays: [] };
    }

    // Normalize line breaks to '\n'
    const cleanPlan = plan.replace(/\r\n/g, '\n');

    // Regex to match day headers like "**Day 1: Chest and Triceps (60 minutes)**"
    const dayRegex = /\*\*Day\s+\d+:\s+[^*]+\*\*/g;

    // Use matchAll to find all day headers with their indices
    const matches = [...cleanPlan.matchAll(dayRegex)];
    const workoutDays = [];

    if (matches.length === 0) {
      console.warn('No workout days matched in the plan.');
    }

    matches.forEach((match, index) => {
      const title = match[0].replace(/\*\*/g, '').trim();
      const startIndex = match.index + match[0].length;

      // Determine the end index
      const endIndex =
        index < matches.length - 1
          ? matches[index + 1].index
          : cleanPlan.indexOf('**Additional Tips:**') !== -1
          ? cleanPlan.indexOf('**Additional Tips:**')
          : cleanPlan.length;

      const content = cleanPlan.slice(startIndex, endIndex).trim();
      workoutDays.push({ title, content });
    });

    // Extract Additional Tips if present
    const tipsMatch = cleanPlan.match(/\*\*Additional Tips:\*\*(.*)/s);
    let additionalTips = '';
    if (tipsMatch) {
      additionalTips = tipsMatch[1].trim();
    }

    console.log('Parsed Workout Days:', workoutDays);
    console.log('Parsed Additional Tips:', additionalTips);

    return { workoutDays, additionalTips };
  };

  // Fetch sessions when workoutPlanId changes
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
        const response = await axiosInstance.get(
          `workout-plans/${workoutPlanId}/`
        );
        console.log('Workout plan response:', response.data);

        const planData = response.data.plan_data;
        console.log('Plan data:', planData);

        if (planData && planData.plan) {
          const plan = planData.plan;
          console.log('Plan string:', plan);

          // Parse the plan string to extract sessions
          const { workoutDays } = parseWorkoutPlan(plan);
          console.log('Parsed Workout Days:', workoutDays);

          if (workoutDays.length > 0) {
            setSessions(workoutDays);
            setSelectedSession(workoutDays[0].title);
            setError(null); // Clear any previous errors
          } else {
            setSessions([]);
            setSelectedSession('');
            setError('No sessions found in the selected workout plan.');
          }
        } else {
          console.error('Plan data does not contain a plan string.');
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

    fetchSessions();
  }, [workoutPlanId]);

  // Handle emoji selection
  const handleEmojiSelect = (feelingId) => {
    setEmojiFeedback(feelingId);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage('');
    try {
      const response = await axiosInstance.post('training_sessions/', {
        workout_plan_id: workoutPlanId,
        date,
        session_name: selectedSession,
        emoji_feedback: emojiFeedback,
      });
      console.log('Session logged:', response.data);
      onSessionLogged(response.data);
      // Reset form fields
      setDate(new Date().toISOString().split('T')[0]);
      setEmojiFeedback('');
      setSuccessMessage('Session logged successfully!');
    } catch (error) {
      console.error('Error logging session:', error);
      setError('Failed to log session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="log-session-form">
      <h3>Log Training Session</h3>
      {error && <p className="error" role="alert">{error}</p>}
      {successMessage && <p className="success" role="status">{successMessage}</p>}
      <form onSubmit={handleSubmit}>
        {/* Date Input */}
        <label htmlFor="session-date">
          Date:
          <input
            id="session-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>

        {/* Workout Plan Dropdown */}
        <label htmlFor="workout-plan-select">
          Workout Plan:
          <select
            id="workout-plan-select"
            value={workoutPlanId}
            onChange={(e) => setWorkoutPlanId(e.target.value)}
            required
          >
            {workoutPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.user
                  ? `Workout Plan for ${plan.user.username}`
                  : `Workout Plan ${plan.id}`}
              </option>
            ))}
          </select>
        </label>

        {/* Session Dropdown */}
        <label htmlFor="session-select">
          Session:
          {loadingSessions ? (
            <p>Loading sessions...</p>
          ) : sessions.length > 0 ? (
            <select
              id="session-select"
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              required
            >
              {sessions.map((session, index) => (
                <option key={`${session.title}-${index}`} value={session.title}>
                  {session.title}
                </option>
              ))}
            </select>
          ) : (
            <p>No sessions available.</p>
          )}
        </label>

        {/* Emoji Feedback */}
        <fieldset className="emoji-feedback">
          <legend>How are you feeling?</legend>
          <div className="emojis-container">
            {feelings.map((feeling) => (
              <button
                type="button"
                key={feeling.id}
                className={`emoji-button ${emojiFeedback === feeling.id ? 'selected' : ''}`}
                onClick={() => handleEmojiSelect(feeling.id)}
                aria-label={`${feeling.label} (${feeling.id})`}
                title={`${feeling.label}`}
              >
                <span role="img" aria-hidden="true">{feeling.emoji}</span>
              </button>
            ))}
          </div>
        </fieldset>

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
      user: PropTypes.shape({
        username: PropTypes.string.isRequired,
      }).isRequired,
      plan_data: PropTypes.shape({
        plan: PropTypes.string.isRequired,
      }).isRequired,
      created_at: PropTypes.string.isRequired,
    })
  ).isRequired,
  onSessionLogged: PropTypes.func.isRequired,
};

export default LogSessionForm;
