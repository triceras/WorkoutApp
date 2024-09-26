// src/components/WorkoutPlan.jsx

import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';

function WorkoutPlan() {
  const [workoutPlan, setWorkoutPlan] = useState(null);

  useEffect(() => {
    axiosInstance
      .get('workout-plan/')
      .then((response) => {
        setWorkoutPlan(response.data.workout_plan);
      })
      .catch((error) => {
        console.error('Error fetching workout plan:', error);
      });
  }, []);

  if (!workoutPlan) {
    return <div>Loading workout plan...</div>;
  }

  return (
    <div>
      <h2>Your AI-Generated Workout Plan</h2>
      <pre>{workoutPlan}</pre>
      {/* Format the workout plan as needed */}
    </div>
  );
}

export default WorkoutPlan;
