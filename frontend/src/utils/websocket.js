// src/utils/websocket.js

import ReconnectingWebSocket from 'reconnecting-websocket';

/**
 * Establishes a WebSocket connection and sets up event handlers.
 * @param {number} userId - The ID of the authenticated user.
 * @param {string} token - The authentication token for the user.
 * @param {function} onMessage - Callback function to handle incoming messages.
 * @returns {WebSocket} - The WebSocket instance.
 */
export const connectWebSocket = (userId, token, onMessage) => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const port = process.env.NODE_ENV === 'development' ? '8000' : window.location.port;
  const host = process.env.NODE_ENV === 'development' ? `localhost:${port}` : window.location.host;
  const wsUrl = `${protocol}://${host}/api/ws/workout-plan/${userId}/?token=${token}`;

  console.log('Connecting WebSocket to:', wsUrl);

  const socket = new ReconnectingWebSocket(wsUrl, [], {
    maxRetries: 10,
    reconnectionDelayGrowFactor: 1.3,
    maxReconnectionDelay: 10000,
    minReconnectionDelay: 1000,
  });

  socket.onopen = () => {
    console.log('WebSocket connection established');
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data);
      onMessage(data);
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed');
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return socket;
};

/**
 * Disconnects the existing WebSocket connection.
 * @param {WebSocket} socket - The WebSocket instance to disconnect.
 */
export const disconnectWebSocket = (socket) => {
  if (socket) {
    socket.close();
  }
};
