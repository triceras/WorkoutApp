// src/pages/ProfilePage.jsx

import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import ProgressionMetrics from '../components/ProgressionMetrics';
import './ProfilePage.css';

const ProfilePage = () => {
    const [profileData, setProfileData] = useState(null);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('trainingSessions'); // Default active tab
    const [expandedSessions, setExpandedSessions] = useState({}); // Track expanded sessions

    const fetchProfileData = async () => {
        try {
            const token = localStorage.getItem('token');  // Ensure token is stored correctly
            const response = await axiosInstance.get('user/progression/', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            setProfileData(response.data);
        } catch (err) {
            console.error('Error fetching profile data:', err);
            setError(err);
        }
    };

    useEffect(() => {
        fetchProfileData();
    }, []);

    const handleTabClick = (tabName) => {
        setActiveTab(tabName);
    };

    const toggleSession = (sessionId) => {
        setExpandedSessions((prevState) => ({
            ...prevState,
            [sessionId]: !prevState[sessionId],
        }));
    };

    if (error) {
        return <div className="profile-loading">Error fetching profile data.</div>;
    }

    if (!profileData) {
        return <div className="profile-loading">Loading...</div>;
    }

    return (
        <div className="profile-page">
            <h2>User Profile</h2>
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

            <div className="tab-content">
                {activeTab === 'trainingSessions' && (
                    <div className="profile-section">
                        <h3>Training Sessions</h3>
                        {profileData.training_sessions.length === 0 ? (
                            <p>No training sessions available.</p>
                        ) : (
                            profileData.training_sessions.map((session) => (
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

                {activeTab === 'progressionMetrics' && (
                    <div className="profile-section">
                        <h3>Progression Metrics</h3>
                        <ProgressionMetrics />
                    </div>
                )}
            </div>
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
