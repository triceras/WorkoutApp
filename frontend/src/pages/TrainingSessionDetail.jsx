import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import FeedbackForm from '../components/FeedbackForm';

function TrainingSessionDetail({ match }) {
  const sessionId = match.params.id;
  const [session, setSession] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      const response = await axiosInstance.get(`training_sessions/${sessionId}/`);
      setSession(response.data);
    };

    const fetchFeedback = async () => {
      try {
        const response = await axiosInstance.get(`training_sessions/${sessionId}/feedback/`);
        setFeedback(response.data);
      } catch (error) {
        if (error.response.status !== 404) {
          console.error('Error fetching feedback:', error.response.data);
        }
      }
    };

    fetchSession();
    fetchFeedback();
  }, [sessionId]);

  const handleFeedbackSubmitted = (feedbackData) => {
    setFeedback(feedbackData);
  };

  return (
    <div>
      {session && (
        <>
          <h1>Training Session on {session.date}</h1>
          {/* Display session details */}
        </>
      )}
      {feedback ? (
        <div>
          <h2>Your Feedback</h2>
          <p>Rating: {feedback.rating} Star{feedback.rating > 1 ? 's' : ''}</p>
          <p>Comments: {feedback.comments}</p>
        </div>
      ) : (
        <FeedbackForm sessionId={sessionId} onFeedbackSubmitted={handleFeedbackSubmitted} />
      )}
    </div>
  );
}

export default TrainingSessionDetail;
