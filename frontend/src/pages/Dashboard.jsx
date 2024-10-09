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
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Function to handle when a session is logged.
   * Receives session data from LogSessionForm and can be used to update state or provide feedback.
   */
  const handleSessionLogged = (sessionData) => {
    console.log('Session logged:', sessionData);
    // You can update state, show notifications, or perform other actions here.
  };

  useEffect(() => {
    /**
     * Fetches user data and workout plans from the backend API.
     * Handles loading state and error messages appropriately.
     */
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
            // Optionally, redirect to login page here.
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

  /**
   * Renders a loading state while data is being fetched.
   */
  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  /**
   * Renders an error message if an error occurred during data fetching.
   */
  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <h2 className="welcome-message">
          Welcome {userData?.first_name || userData?.username || 'Valued User'}
        </h2>
        {workoutPlans.length > 0 ? (
          <>
            {/* WorkoutPlan component to display the first workout plan */}
            <WorkoutPlan workoutData={workoutPlans[0].plan_data} />
            
            {/* LogSessionForm to handle logging sessions */}
            <LogSessionForm
              workoutPlans={workoutPlans}
              onSessionLogged={handleSessionLogged}
            />
          </>
        ) : (
          <p className="no-workout-plans">No workout plans available.</p>
        )}
        {/* You can include additional dashboard components here */}
      </div>
    </div>
  );
}

export default Dashboard;
