// src/components/UploadProfilePicture.jsx

import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import './UploadProfilePicture.css';

function UploadProfilePicture({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (optional)
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        setSelectedFile(null);
        setPreviewURL(null);
        return;
      }
      setSelectedFile(file);
      setPreviewURL(URL.createObjectURL(file));
      setError(null);
      setSuccessMessage(null);
    }
  };

  // Handle form submission
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('No file selected.');
      return;
    }

    const formData = new FormData();
    formData.append('profile_picture', selectedFile);

    try {
      setUploading(true);
      const response = await axiosInstance.patch('user/me/', formData, {  // Updated endpoint
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSuccessMessage('Profile picture uploaded successfully.');
      setSelectedFile(null);
      setPreviewURL(null);
      onUploadSuccess(response.data); // Notify parent component
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      setError('Failed to upload profile picture.');
    } finally {
      setUploading(false);
    }
  };

  // Handle cancel action
  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewURL(null);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="upload-profile-picture">
      <h3>Upload Profile Picture</h3>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      {previewURL && (
        <div className="preview">
          <p>Preview:</p>
          <img src={previewURL} alt="Preview" className="preview-image" />
        </div>
      )}
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      <div className="upload-actions">
        <button onClick={handleUpload} disabled={uploading || !selectedFile}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <button onClick={handleCancel} disabled={uploading}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default UploadProfilePicture;