// src/pages/ProfilePage.jsx

import React, { useEffect, useState, useContext } from 'react';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import './ProfilePage.css';

function ProfilePage() {
  const { authToken } = useContext(AuthContext);
  const [userInfo, setUserInfo] = useState(null);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States for editing profile picture
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const userResponse = await axiosInstance.get('users/me/'); // Updated endpoint
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

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (optional)
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }
      setSelectedFile(file);
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('No file selected.');
      return;
    }

    const formData = new FormData();
    formData.append('profile_picture', selectedFile);

    try {
      setUploading(true);
      const response = await axiosInstance.put('user/me/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUserInfo(response.data);
      setIsEditing(false);
      setSelectedFile(null);
      setPreviewURL(null);
      setError(null);
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      setError('Failed to upload profile picture.');
    } finally {
      setUploading(false);
    }
  };

  // Handle cancel action
  const handleCancel = () => {
    setIsEditing(false);
    setSelectedFile(null);
    setPreviewURL(null);
    setError(null);
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
            <img src={userInfo.profile_picture || '/default-profile.png'} alt={`${userInfo.username}'s profile`} />
          </div>
          <h3>Personal Information</h3>
          {/* Profile Picture Edit Functionality */}
          {isEditing ? (
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-group">
                <label htmlFor="profile_picture">Select New Profile Picture:</label>
                <input
                  type="file"
                  id="profile_picture"
                  name="profile_picture"
                  accept="image/*"
                  onChange={handleFileChange}
                  required
                />
              </div>
              {previewURL && (
                <div className="preview">
                  <p>Preview:</p>
                  <img src={previewURL} alt="Preview" className="preview-image" />
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="btn-save" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Save'}
                </button>
                <button type="button" className="btn-cancel" onClick={handleCancel} disabled={uploading}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <p><strong>Username:</strong> {userInfo.username}</p>
              <p><strong>First Name:</strong> {userInfo.first_name || 'N/A'}</p>
              <p><strong>Last Name:</strong> {userInfo.last_name || 'N/A'}</p>
              <p><strong>Email:</strong> {userInfo.email || 'N/A'}</p>
              <button className="btn-edit" onClick={() => setIsEditing(true)}>
                Edit Profile Picture
              </button>
            </>
          )}
        </div>
        <div className="profile-section">
          <h3>Your Progress</h3>
          <p><strong>Workouts Completed:</strong> {workoutCount}</p>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
