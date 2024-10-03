// src/pages/ProfilePage.jsx

import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
//import { AuthContext } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import UploadProfilePicture from '../components/UploadProfilePicture';
import './ProfilePage.css';

function ProfilePage() {
  //const { authToken } = useContext(AuthContext);
  const [userInfo, setUserInfo] = useState(null);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const userResponse = await axiosInstance.get('user/me/'); // Updated endpoint
        setUserInfo(userResponse.data);

        const workoutsResponse = await axiosInstance.get('workout-sessions/');
        setWorkoutCount(workoutsResponse.data.length);
      } catch (err) {
        console.error('Error fetching profile data:', err);
        if (err.response && err.response.status === 401) {
          setError('Session expired. Please log in again.');
        } else {
          setError('Failed to load profile information.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  // Callback to handle upload success
  const handleUploadSuccess = (updatedUserData) => {
    setUserInfo(updatedUserData);
  };

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="profile-page">
      <h2>Your Profile</h2>
      <div className="profile-container">
        <div className="profile-section">
          <div className="profile-picture">
            <img
              src={
                userInfo.profile_picture
                  // ? `${axiosInstance.defaults.baseURL}${userInfo.profile_picture}`
                  ? userInfo.profile_picture_url
                  : '/default-profile.png'
              }
              alt={`${userInfo.username}'s profile`}
            />
          </div>
          <h3>Personal Information</h3>
          <p><strong>Username:</strong> {userInfo.username}</p>
          <p><strong>First Name:</strong> {userInfo.first_name || 'N/A'}</p>
          <p><strong>Last Name:</strong> {userInfo.last_name || 'N/A'}</p>
          <p><strong>Email:</strong> {userInfo.email || 'N/A'}</p>
          {/* Existing edit profile functionality remains unchanged */}
        </div>
        <div className="profile-section">
          <h3>Your Progress</h3>
          <p><strong>Workouts Completed:</strong> {workoutCount}</p>
        </div>
      </div>
      {/* Add the UploadProfilePicture component below existing sections */}
      <UploadProfilePicture onUploadSuccess={handleUploadSuccess} />
    </div>
  );
}

export default ProfilePage;
