// src/pages/Dashboard.jsx

import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import WorkoutPlan from '../components/WorkoutPlan';
import ErrorMessage from '../components/ErrorMessage';
import './Dashboard.css'; 

function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [additionalTips, setAdditionalTips] = useState('');
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

        // Fetch workout plan using the updated endpoint
        const workoutPlanResponse = await axiosInstance.get('workout-plans/current/');
        console.log('Workout plan response:', workoutPlanResponse.data);

        if (workoutPlanResponse.data && workoutPlanResponse.data.plan_data) {
          setWorkoutPlan(workoutPlanResponse.data.plan_data.plan);
          setAdditionalTips(workoutPlanResponse.data.plan_data.additionalTips || '');
        } else {
          setError('No workout plan available.');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (error.response) {
          if (error.response.status === 404) {
            setError('No workout plan found. Please create one.');
          } else if (error.response.status === 401) {
            setError('Unauthorized access. Please log in again.');
            // Optionally, redirect to login page
          } else {
            setError('An error occurred while fetching data.');
          }
        } else {
          setError('Network error. Please try again later.');
        }
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
        {/* Update user name access */}
        <h2>Welcome {userData?.first_name || userData?.username || 'Valued User'}</h2>
        {workoutPlan ? (
          <WorkoutPlan plan={workoutPlan} additionalTips={additionalTips} />
        ) : (
          <p>Loading your workout plan...</p>
        )}
        {/* Rest of your dashboard components */}
      </div>
    </div>
  );
}

export default Dashboard;
