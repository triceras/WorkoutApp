// src/components/ProgressionMetrics.jsx

import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import './ProgressionMetrics.css';

function ProgressionMetrics() {
  const [metrics, setMetrics] = useState({
    total_sessions: 0,
    average_rating: null,
    feedback_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await axiosInstance.get('auth/user-progression/');
        setMetrics(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching progression metrics:', err);
        setError(true);
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return <p>Loading progression metrics...</p>;
  }

  if (error) {
    return <p>Failed to load progression metrics.</p>;
  }

  return (
    <div className="progression-metrics">
      <div className="metric">
        <h4>Total Sessions</h4>
        <p>{metrics.total_sessions}</p>
      </div>
      <div className="metric">
        <h4>Average Rating</h4>
        <p>{metrics.average_rating ? metrics.average_rating.toFixed(1) : 'N/A'}</p>
      </div>
      <div className="metric">
        <h4>Feedback Count</h4>
        <p>{metrics.feedback_count}</p>
      </div>
      {/* Add more metrics as needed */}
    </div>
  );
}

export default ProgressionMetrics;
