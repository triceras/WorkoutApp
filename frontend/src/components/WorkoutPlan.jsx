import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import ReactMarkdown from 'react-markdown';

function WorkoutPlan() {
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance
      .get('workout-plan/')
      .then((response) => {
        console.log('Workout Plan:', response.data.plan_data.plan);
        setWorkoutPlan(response.data.plan_data.plan);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching workout plan:', error);
        setError('Failed to fetch workout plan');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading workout plan...</div>;
  }

  if (!workoutPlan) {
    return <div>No workout plan available.</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h2>Your AI-Generated Workout Plan</h2>
      <ReactMarkdown>{workoutPlan}</ReactMarkdown>
    </div>
  );
}

export default WorkoutPlan;
