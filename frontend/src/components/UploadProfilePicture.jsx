// src/components/UploadProfilePicture.jsx

import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import './UploadProfilePicture.css';

function UploadProfilePicture({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
      setSuccessMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('No file selected.');
      return;
    }

    const formData = new FormData();
    formData.append('profile_picture', selectedFile);

    try {
      setUploading(true);
      await axiosInstance.patch('users/me/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSuccessMessage('Profile picture uploaded successfully.');
      setSelectedFile(null);
      onUploadSuccess();
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      setError('Failed to upload profile picture.');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="upload-profile-picture">
      <h3 className="upload-title">Upload Profile Picture</h3>
      <div className="upload-content">
        <div className="file-input-wrapper">
          <label htmlFor="file-upload" className="file-input-label">
            Choose file
          </label>
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="upload-input"
          />
          <span className="file-name">
            {selectedFile ? selectedFile.name : 'No file chosen'}
          </span>
        </div>
        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
        <button
          onClick={handleUpload}
          disabled={uploading || !selectedFile}
          className="btn-upload"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        {selectedFile && (
          <button
            onClick={handleCancel}
            disabled={uploading}
            className="btn-cancel"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default UploadProfilePicture;
