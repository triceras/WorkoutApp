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
  const host = window.location.host;
  const wsUrl = `${protocol}://${host}/ws/workout-plan/${userId}/?token=${token}`;

  const socket = new ReconnectingWebSocket(wsUrl);

  socket.onopen = () => {
    console.log('WebSocket connection established.');
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed.');
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
