// src/context/WebSocketContext.js

import React, { createContext, useContext, useState } from 'react';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);

  const sendNotification = (message) => {
    setNotification(message);
    // Auto-dismiss the notification after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  return (
    <WebSocketContext.Provider value={{ notification, sendNotification }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  return useContext(WebSocketContext);
};
