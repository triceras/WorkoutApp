import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';

function FeedbackForm({ sessionId, onFeedbackSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post(
        `training_sessions/${sessionId}/feedback/`,
        { rating, comments }
      );
      onFeedbackSubmitted(response.data);
    } catch (error) {
      console.error('Error submitting feedback:', error.response.data);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Rating:
        <select value={rating} onChange={(e) => setRating(parseInt(e.target.value))}>
          {[1, 2, 3, 4, 5].map((star) => (
            <option key={star} value={star}>{`${star} Star${star > 1 ? 's' : ''}`}</option>
          ))}
        </select>
      </label>
      <br />
      <label>
        Comments:
        <textarea value={comments} onChange={(e) => setComments(e.target.value)} />
      </label>
      <br />
      <button type="submit">Submit Feedback</button>
    </form>
  );
}

export default FeedbackForm;
