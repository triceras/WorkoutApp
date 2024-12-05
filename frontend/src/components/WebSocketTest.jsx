import React from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';

const WebSocketTest = () => {
    const { isConnected, error, sendMessage } = useWebSocket();
    const { user } = useAuth();

    const handleTestMessage = () => {
        sendMessage({
            type: 'test',
            message: 'Test message from client'
        });
    };

    return (
        <div style={{ padding: '20px' }}>
            <h3>WebSocket Test</h3>
            <p>Connection Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {user && <p>User ID: {user.id}</p>}
            <button 
                onClick={handleTestMessage}
                disabled={!isConnected}
                style={{
                    padding: '10px 20px',
                    backgroundColor: isConnected ? '#4CAF50' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isConnected ? 'pointer' : 'not-allowed'
                }}
            >
                Send Test Message
            </button>
        </div>
    );
};

export default WebSocketTest;
