import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Link } from 'react-router-dom';

function TrainingSessionList() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const fetchSessions = async () => {
      const response = await axiosInstance.get('training_sessions/');
      setSessions(response.data);
    };

    fetchSessions();
  }, []);

  return (
    <div>
      <h1>Your Training Sessions</h1>
      {sessions.length > 0 ? (
        <ul>
          {sessions.map((session) => (
            <li key={session.id}>
              <Link to={`/training_sessions/${session.id}/`}>
                Session on {session.date}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>You have no training sessions logged.</p>
      )}
    </div>
  );
}

export default TrainingSessionList;
