// src/pages/Dashboard.jsx

import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import WorkoutPlan from '../components/WorkoutPlan';
import ErrorMessage from '../components/ErrorMessage';
import './Dashboard.css'; 

function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    console.log('Token in Dashboard:', token);

    // Set timeout to 60 seconds
    axiosInstance.defaults.timeout = 60000;
  
    // Fetch user data and workout plan
    const fetchData = async () => {
      try {
        // Fetch user data
        const userResponse = await axiosInstance.get('user/');
        console.log('User data response:', userResponse.data);
        setUserData(userResponse.data);

        // Fetch workout plan
        const workoutPlanResponse = await axiosInstance.get('workout-plan/');
        console.log('Workout plan response:', workoutPlanResponse.data);

        if (workoutPlanResponse.data.plan_data && workoutPlanResponse.data.plan_data.plan) {
          setWorkoutPlan(workoutPlanResponse.data.plan_data);
        } else {
          setError('No workout plan available.');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Unable to load user data or workout plan.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div>
      <div className="dashboard-content">
        <h2>Welcome, {userData?.name}</h2>
        {workoutPlan ? (
          <WorkoutPlan plan={workoutPlan} />
        ) : (
          <p>Loading your workout plan...</p>
        )}
        {/* Rest of your dashboard components */}
      </div>
    </div>
  );
}

export default Dashboard;
