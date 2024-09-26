// src/pages/Dashboard.jsx

import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import WorkoutPlan from '../components/WorkoutPlan';
import ErrorMessage from '../components/ErrorMessage';

function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    console.log('Token in Dashboard:', token);
  
    // Fetch user data
    axiosInstance
      .get('user/')
      .then((response) => {
        console.log('User data response:', response.data);
        setUserData(response.data);
      })
      .catch((error) => {
        console.error('Error fetching user data:', error);
        setError('Unable to load user data.');
      });
  
    // Fetch workout plan
    axiosInstance
      .get('workout-plans/')
      .then((response) => {
        console.log('Workout plans response:', response.data);
        if (response.data.length > 0) {
          // Use the latest workout plan
          setWorkoutPlan(response.data[response.data.length - 1].plan_data);
        } else {
          // No workout plan exists; create one
          axiosInstance
            .post('workout-plans/', {})
            .then((response) => {
              console.log('New workout plan created:', response.data);
              setWorkoutPlan(response.data.plan_data);
            })
            .catch((error) => {
              console.error('Error creating workout plan:', error);
              setError('Unable to generate workout plan.');
            });
        }
      })
      .catch((error) => {
        console.error('Error fetching workout plans:', error);
        setError('Unable to load workout plan.');
      });
  }, []);

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div>
      <h2>Welcome, {userData?.name}</h2>
      {workoutPlan ? (
        <WorkoutPlan plan={workoutPlan} />
      ) : (
        <p>Loading your workout plan...</p>
      )}
      {/* Rest of your dashboard components */}
    </div>
  );
}

export default Dashboard;
