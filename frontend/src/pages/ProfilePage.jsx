// src/pages/ProfilePage.jsx

import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import ProgressionMetrics from '../components/ProgressionMetrics';
import UploadProfilePicture from '../components/UploadProfilePicture';
import LogSessionForm from '../components/LogSessionForm';
import './ProfilePage.css';

const ProfilePage = () => {
  const [profileData, setProfileData] = useState(null);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('trainingSessions');
  const [expandedSessions, setExpandedSessions] = useState({});

  // Function to fetch profile data from the backend
  const fetchProfileData = async () => {
    try {
      const response = await axiosInstance.get('user/progression/');
      setProfileData(response.data);
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError('Failed to load profile data.');
    }
  };

  // Function to fetch workout plans from the backend
  const fetchWorkoutPlans = async () => {
    try {
      const response = await axiosInstance.get('workout-plans/');
      setWorkoutPlans(response.data);
    } catch (err) {
      console.error('Error fetching workout plans:', err);
      setError('Failed to load workout plans.');
    }
  };

  // Fetch profile data and workout plans on component mount
  useEffect(() => {
    fetchProfileData();
    fetchWorkoutPlans();
  }, []);

  // Handle tab switching
  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
  };

  // Toggle session details visibility
  const toggleSession = (sessionId) => {
    setExpandedSessions((prevState) => ({
      ...prevState,
      [sessionId]: !prevState[sessionId],
    }));
  };

  // Refresh profile data after successful profile picture upload or session logging
  const handleUploadSuccess = () => {
    fetchProfileData();
  };

  // Handle session logged from LogSessionForm
  const handleSessionLogged = (sessionData) => {
    console.log('Session logged:', sessionData);
    // Update profile data after a session is logged
    fetchProfileData();
  };

  // Display error message if data fetching fails
  if (error) {
    return <div className="profile-loading">Error: {error}</div>;
  }

  // Display loading message while fetching data
  if (!profileData) {
    return <div className="profile-loading">Loading...</div>;
  }

  const { user, training_sessions } = profileData;

  return (
    <div className="profile-page">
      <h2>User Profile</h2>

      {/* User Information Box */}
      <div className="user-info-box">
        <div className="user-info-and-upload">
          {/* User Info and Picture */}
          <div className="user-info-section">
            <div className="user-info-content">
              <div className="profile-picture-container">
                {user.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt="Profile"
                    className="profile-picture"
                  />
                ) : (
                  <img
                    src="/default-profile.png"
                    alt="Default Profile"
                    className="profile-picture"
                  />
                )}
              </div>
              <div className="user-details">
                <p>
                  <strong>Full Name:</strong> {user.first_name} {user.last_name}
                </p>
                <p>
                  <strong>Age:</strong> {user.age || 'N/A'}
                </p>
                <p>
                  <strong>Member Since:</strong> {user.member_since}
                </p>
                <p>
                  <strong>Membership Number:</strong> {user.id}
                </p>
              </div>
            </div>
          </div>

          {/* Upload Profile Picture Component */}
          <UploadProfilePicture onUploadSuccess={handleUploadSuccess} />
        </div>
      </div>

      {/* Tabs for Training Sessions and Progression Metrics */}
      <div className="tabs">
        <button
          className={`tab-button ${
            activeTab === 'trainingSessions' ? 'active' : ''
          }`}
          onClick={() => handleTabClick('trainingSessions')}
        >
          Training Sessions
        </button>
        <button
          className={`tab-button ${
            activeTab === 'progressionMetrics' ? 'active' : ''
          }`}
          onClick={() => handleTabClick('progressionMetrics')}
        >
          Progression Metrics
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Training Sessions Tab */}
        {activeTab === 'trainingSessions' && (
          <div className="profile-section">
            <h3>Training Sessions</h3>
            {/* Log a Past Workout Session */}
            <LogSessionForm
              workoutPlans={workoutPlans}
              source="profile"
              onSessionLogged={handleSessionLogged}
            />

            {training_sessions.length === 0 ? (
              <p>No training sessions available.</p>
            ) : (
              training_sessions.map((session) => (
                <div key={session.id} className="session-item">
                  <div
                    className="session-header"
                    onClick={() => toggleSession(session.id)}
                  >
                    <h4>{session.session_name}</h4>
                    <span>{expandedSessions[session.id] ? '-' : '+'}</span>
                  </div>
                  {expandedSessions[session.id] && (
                    <div className="session-details">
                      <p>
                        <strong>Date:</strong>{' '}
                        {new Date(session.date).toLocaleDateString()}
                      </p>
                      <p>
                        <strong>Feedback:</strong>{' '}
                        {getEmoji(session.emoji_feedback)}
                      </p>

                      {session.intensity_level !== null &&
                        session.intensity_level !== undefined && (
                          <p>
                            <strong>Intensity Level:</strong>{' '}
                            {session.intensity_level}
                          </p>
                        )}

                      {session.duration !== null &&
                        session.duration !== undefined && (
                          <p>
                            <strong>Duration:</strong> {session.duration}{' '}
                            minutes
                          </p>
                        )}

                      {session.calories_burned !== null &&
                        session.calories_burned !== undefined && (
                          <p>
                            <strong>Calories Burned:</strong>{' '}
                            {session.calories_burned} kcal
                          </p>
                        )}

                      {session.heart_rate_pre !== null &&
                        session.heart_rate_pre !== undefined && (
                          <p>
                            <strong>Heart Rate Before:</strong>{' '}
                            {session.heart_rate_pre} bpm
                          </p>
                        )}

                      {session.heart_rate_post !== null &&
                        session.heart_rate_post !== undefined && (
                          <p>
                            <strong>Heart Rate After:</strong>{' '}
                            {session.heart_rate_post} bpm
                          </p>
                        )}

                      {session.comments && (
                        <p>
                          <strong>Comments:</strong> {session.comments}
                        </p>
                      )}

                      {/* Display Exercises in a Table */}
                      {session.exercises &&
                        session.exercises.length > 0 && (
                          <div className="session-exercises">
                            <h5>Exercises:</h5>
                            <table className="exercise-table">
                              <thead>
                                <tr>
                                  <th>Exercise Name</th>
                                  <th>Sets</th>
                                  <th>Reps</th>
                                  <th>Weight (kg)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {session.exercises.map((exercise) => (
                                  <tr key={exercise.id}>
                                    <td>{exercise.exercise_name}</td>
                                    <td>{exercise.sets}</td>
                                    <td>{exercise.reps}</td>
                                    <td>
                                      {exercise.weight !== null
                                        ? exercise.weight
                                        : 'N/A'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Progression Metrics Tab */}
        {activeTab === 'progressionMetrics' && (
          <div className="profile-section">
            <h3>Progression Metrics</h3>
            <ProgressionMetrics />
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to convert feedback score to emoji
const getEmoji = (score) => {
  const emojiMap = {
    0: '😰 Terrible',
    1: '😟 Very Bad',
    2: '😕 Bad',
    3: '😐 Neutral',
    4: '😊 Good',
    5: '😃 Excellent',
  };
  return emojiMap[score] || '🤔 Unknown';
};

export default ProfilePage;
