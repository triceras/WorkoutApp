// src/pages/ProfilePage.jsx

import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import ProgressionMetrics from '../components/ProgressionMetrics';
import UploadProfilePicture from '../components/UploadProfilePicture';
import VideoModal from '../components/VideoModal';
import LogSessionForm from '../components/LogSessionForm';
import './ProfilePage.css';

const ProfilePage = () => {
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('trainingSessions'); // Default active tab
  const [expandedSessions, setExpandedSessions] = useState({}); // Track expanded sessions
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);

  // Function to fetch profile data from the backend
  const fetchProfileData = async () => {
    try {
      const response = await axiosInstance.get('user/progression/', {
        headers: {
          // Authorization handled by axiosInstance interceptor
        },
      });
      setProfileData(response.data);
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError('Failed to load profile data.');
    }
  };

  // Fetch profile data on component mount
  useEffect(() => {
    fetchProfileData();
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

  // Close video modal
  const closeModal = () => {
    setModalIsOpen(false);
    setCurrentVideoId(null);
  };

  // Refresh profile data after successful profile picture upload or session logging
  const handleUploadSuccess = () => {
    fetchProfileData();
  };

  // Handle session logged from ProfileLogSessionForm
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
                <p><strong>Full Name:</strong> {user.first_name} {user.last_name}</p>
                <p><strong>Age:</strong> {user.age || 'N/A'}</p>
                <p><strong>Member Since:</strong> {user.member_since}</p>
                <p><strong>Membership Number:</strong> {user.id}</p>
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
          className={`tab-button ${activeTab === 'trainingSessions' ? 'active' : ''}`}
          onClick={() => handleTabClick('trainingSessions')}
        >
          Training Sessions
        </button>
        <button
          className={`tab-button ${activeTab === 'progressionMetrics' ? 'active' : ''}`}
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
              onSessionLogged={(data) => {
                console.log('Session Logged:', data);
                // Refresh data or update state as needed
              }}
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
                    <span>
                      {expandedSessions[session.id] ? '-' : '+'}
                    </span>
                  </div>
                  {expandedSessions[session.id] && (
                    <div className="session-details">
                      <p><strong>Date:</strong> {new Date(session.date).toLocaleDateString()}</p>
                      <p><strong>Feedback:</strong> {getEmoji(session.emoji_feedback)}</p>
                      {session.comments && (
                        <p><strong>Comments:</strong> {session.comments}</p>
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

      {/* Video Modal */}
      <VideoModal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        videoId={currentVideoId}
      />
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
