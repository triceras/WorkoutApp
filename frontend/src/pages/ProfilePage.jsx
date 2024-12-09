// src/pages/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import ProgressionMetrics from '../components/ProgressionMetrics';
import UploadProfilePicture from '../components/UploadProfilePicture';
import './ProfilePage.css';

const ProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('trainingSessions');
  const [expandedSessions, setExpandedSessions] = useState({});
  const [profileData, setProfileData] = useState({
    user: {
      first_name: '',
      last_name: '',
      age: '',
      member_since: '',
      id: '',
      profile_picture: null
    },
    training_sessions: []
  });

  // Helper function to extract day number from day string
  const extractDayNumber = (dayString) => {
    const match = dayString.match(/Day (\d+)/i); // Case-insensitive match
    return match ? parseInt(match[1], 10) : null;
  };

  // Function to fetch profile data from the backend
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const userResponse = await axiosInstance.get('user/');
      const progressionResponse = await axiosInstance.get('user/progression/');
      
      setProfileData({
        user: userResponse.data,
        training_sessions: progressionResponse.data.training_sessions || []
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setError('Failed to load profile data');
      setLoading(false);
    }
  };

  // Function to fetch workout plans from the backend
  const fetchWorkoutPlans = async () => {
    try {
      const response = await axiosInstance.get('workout-plans/');
      const plans = response.data;

      // Process each workoutPlan to include dayNumber and type in workoutDays
      const processedPlans = plans.map((plan) => ({
        ...plan,
        workoutDays: plan.workoutDays.map((day) => ({
          ...day,
          dayNumber: extractDayNumber(day.day),
          type: day.day.toLowerCase().includes('rest') ? 'rest' : 'workout',
        })),
      }));

      console.log('Processed workoutPlans:', processedPlans); // Debugging
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

  const handleUploadSuccess = (newProfilePicture) => {
    setProfileData(prev => ({
      ...prev,
      user: {
        ...prev.user,
        profile_picture: newProfilePicture
      }
    }));
    fetchProfileData(); // Refresh all profile data after upload
  };

  const TrainingSessionsTab = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchSessions = async () => {
        try {
          const response = await axiosInstance.get('workout-plans/');
          if (response.data && response.data.length > 0) {
            const currentPlan = response.data[0];
            const scheduledSessions = currentPlan.workoutDays.map(day => ({
              id: `scheduled_${day.day}`,
              date: new Date(),
              session_name: day.day,
              workout_type: day.workout_type || 'Strength',
              exercises: day.exercises.map(exercise => {
                if (day.workout_type === 'Cardio') {
                  return {
                    name: exercise.name,
                    duration: exercise.setsReps,
                    isCardio: true
                  };
                } else {
                  const setsMatch = exercise.setsReps?.match(/(\d+)\s*sets/);
                  const repsMatch = exercise.setsReps?.match(/(\d+)\s*reps/);
                  
                  return {
                    name: exercise.name,
                    setsReps: exercise.setsReps,
                    sets: setsMatch ? parseInt(setsMatch[1]) : 3,
                    reps: repsMatch ? parseInt(repsMatch[1]) : 12,
                    isCardio: false
                  };
                }
              })
            }));
            setSessions(scheduledSessions);
          }
        } catch (error) {
          console.error('Error fetching training sessions:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchSessions();
    }, []);

    if (loading) {
      return (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      );
    }

    return (
      <div className="training-schedule">
        <div className="schedule-header">
          <h2>Weekly Training Schedule</h2>
        </div>
        
        {sessions.map((session) => (
          <div key={session.id} className="session-block">
            <div className="session-header">
              <div className="header-button">{session.session_name}</div>
              <div className="header-button workout-type">{session.workout_type}</div>
            </div>
            
            {session.session_name.toLowerCase().includes('recovery') ? (
              <div className="recovery-message">
                No workout planned for this recovery day. Take it easy and focus on stretching and light activities.
              </div>
            ) : (
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th className="exercise-name">EXERCISE</th>
                    {session.workout_type === 'Cardio' ? (
                      <th>DURATION</th>
                    ) : (
                      <>
                        <th>SET 1</th>
                        <th>SET 2</th>
                        <th>SET 3</th>
                        <th>SET 4</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {session.exercises.map((exercise, idx) => (
                    <tr key={idx}>
                      <td className="exercise-name">{exercise.name}</td>
                      {exercise.isCardio ? (
                        <td>{exercise.duration}</td>
                      ) : (
                        <>
                          {[...Array(4)].map((_, i) => (
                            <td key={i}>
                              {i < exercise.sets ? exercise.reps : '-'}
                            </td>
                          ))}
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="profile-loading">Loading...</div>;
  }

  if (error) {
    return <div className="profile-error">{error}</div>;
  }

  const { user, training_sessions } = profileData;

  return (
    <div className="page-container">
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
                  <strong>Member Since:</strong> {new Date(user.member_since).toLocaleDateString()}
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

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button 
          className={`nav-tab ${activeTab === 'trainingSessions' ? 'active' : 'inactive'}`}
          onClick={() => setActiveTab('trainingSessions')}
        >
          Training Sessions
        </button>
        <button 
          className={`nav-tab ${activeTab === 'progressionMetrics' ? 'active' : 'inactive'}`}
          onClick={() => setActiveTab('progressionMetrics')}
        >
          Progression Metrics
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'trainingSessions' && <TrainingSessionsTab />}
      {activeTab === 'progressionMetrics' && <ProgressionMetrics />}
    </div>
  );
};

export default ProfilePage;
