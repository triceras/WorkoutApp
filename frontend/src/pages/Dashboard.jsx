// src/pages/Dashboard.jsx

import React, { useEffect, useState, useContext, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import WorkoutPlan from '../components/WorkoutPlan';
import LogSessionForm from '../components/LogSessionForm';
import ErrorMessage from '../components/ErrorMessage';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

import './Dashboard.css'; 

function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();  // To handle navigation if needed

  // Reference to store WebSocket instance
  const socketRef = React.useRef(null);

  // Get authToken from AuthContext
  const { authToken, loading: authLoading } = useContext(AuthContext);

  // Function to handle when a session is logged.
  const handleSessionLogged = (sessionData) => {
    console.log('Session logged:', sessionData);
    // You can update state, show notifications, or perform other actions here.
  };

  // Define setupWebSocket using useCallback
  const setupWebSocket = useCallback(
    (user) => {
      if (!user || !authToken) return;

      // Build the WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${window.location.hostname}:8001/ws/workout-plan/?token=${authToken}`;    

      // Initialize WebSocket
      const socket = new ReconnectingWebSocket(wsUrl);

      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connection opened.');
      };

      socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        console.log('WebSocket message received:', data);

        if (data.type === 'workout_plan_generated') {
          // Update workout plans with the new plan data
          setWorkoutPlans((prevPlans) => {
            const updatedPlan = {
              user: user.id,
              plan_data: data.plan_data,
            };

            // Replace the existing plan or add a new one
            return [updatedPlan];
          });
        }
      };

      socket.onclose = () => {
        console.log('WebSocket connection closed.');
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    },
    [authToken] // Dependencies
  );

  useEffect(() => {
    if (authLoading) return; // Wait for auth loading to complete

    if (!authToken) {
      // Redirect to login if not authenticated
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        // Set the Authorization header for axiosInstance
        axiosInstance.defaults.headers['Authorization'] = `Token ${authToken}`;

        // Fetch user data
        const userResponse = await axiosInstance.get('user/');
        setUserData(userResponse.data);

        // Fetch all workout plans
        const workoutPlansResponse = await axiosInstance.get('workout-plans/');
        if (workoutPlansResponse.data && workoutPlansResponse.data.length > 0) {
          setWorkoutPlans(workoutPlansResponse.data);
        } else {
          setError('No workout plans available.');
        }

        // Establish WebSocket connection after fetching user data
        setupWebSocket(userResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        if (error.response) {
          if (error.response.status === 404) {
            setError('No workout plans found. Please create one.');
          } else if (error.response.status === 401) {
            setError('Unauthorized access. Please log in again.');
            // Redirect to login page
            navigate('/login');
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

    // Cleanup function to close WebSocket when component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [navigate, authToken, authLoading, setupWebSocket]);

  if (loading || authLoading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

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
            {/* WorkoutPlan component to display the latest workout plan */}
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
      </div>
    </div>
  );
}

export default Dashboard;
