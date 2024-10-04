// src/pages/Dashboard.jsx

import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import WorkoutPlan from '../components/WorkoutPlan';
import LogSessionForm from '../components/LogSessionForm';
import ErrorMessage from '../components/ErrorMessage';
import './Dashboard.css'; 

function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to handle when a session is logged
  const handleSessionLogged = (sessionData) => {
    console.log('Session logged:', sessionData);
    // You can update state or provide feedback to the user here
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    console.log('Token in Dashboard:', token);

    // Set timeout to 60 seconds
    axiosInstance.defaults.timeout = 60000;
  
    // Fetch user data and workout plans
    const fetchData = async () => {
      try {
        // Fetch user data
        const userResponse = await axiosInstance.get('user/');
        console.log('User data response:', userResponse.data);
        setUserData(userResponse.data);

        // Fetch all workout plans
        const workoutPlansResponse = await axiosInstance.get('workout-plans/');
        console.log('Workout plans response:', workoutPlansResponse.data);

        if (workoutPlansResponse.data && workoutPlansResponse.data.length > 0) {
          setWorkoutPlans(workoutPlansResponse.data);
          setCurrentPlan(workoutPlansResponse.data[0]); // Set the first plan as the current plan
        } else {
          setError('No workout plans available.');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (error.response) {
          if (error.response.status === 404) {
            setError('No workout plans found. Please create one.');
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
        <h2>Welcome {userData?.first_name || userData?.username || 'Valued User'}</h2>
        {workoutPlans.length > 0 ? (
          <>
            {currentPlan && <WorkoutPlan plan={currentPlan.plan_data.plan} />}
            <LogSessionForm
              workoutPlans={workoutPlans}
              onSessionLogged={handleSessionLogged}
            />
          </>
        ) : (
          <p>No workout plans available.</p>
        )}
        {/* Rest of your dashboard components */}
      </div>
    </div>
  );
}

export default Dashboard;
