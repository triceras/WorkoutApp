// src/context/WebSocketContext.js

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const { authToken, loading: authLoading } = useAuth();
  const socketRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsReconnecting, setWsReconnecting] = useState(false);
  const [latestWorkoutPlan, setLatestWorkoutPlan] = useState(null);

  useEffect(() => {
    if (authLoading) {
      console.warn('WebSocketProvider: Auth is loading');
      return;
    }

    if (!authToken) {
      console.warn('WebSocketProvider: No authToken found');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const port = process.env.NODE_ENV === 'development' ? '8001' : window.location.port;
    const host =
      process.env.NODE_ENV === 'development' ? `localhost:${port}` : window.location.host;
    const wsUrl = `${protocol}://${host}/ws/workout-plan/?token=${authToken}`;

    console.log('WebSocketProvider: Connecting to', wsUrl);

    // Initialize WebSocket
    socketRef.current = new WebSocket(wsUrl);

    // WebSocket event handlers
    socketRef.current.onopen = () => {
      console.log('WebSocketProvider connection established');
      setWsConnected(true);
      setWsReconnecting(false);
      toast.success('Connected to server');
    };

    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocketProvider message received:', data);
        if (data.type === 'workout_plan_generated') {
          setLatestWorkoutPlan(data);
          toast.success('New workout plan received!');
        } else {
          console.warn('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('WebSocketProvider error processing message:', error);
        toast.error('Error processing workout plan update');
      }
    };

    socketRef.current.onclose = (event) => {
      console.log('WebSocketProvider connection closed:', event);
      setWsConnected(false);
      setWsReconnecting(true);
      toast.warning('Connection lost. Reconnecting...');
    };

    socketRef.current.onerror = (event) => {
      console.error('WebSocketProvider error:', event);
      toast.error('WebSocket encountered an error');
    };

    // Cleanup function
    return () => {
      console.log('WebSocketProvider cleaning up');
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [authToken, authLoading]);

  return (
    <WebSocketContext.Provider value={{ wsConnected, wsReconnecting, latestWorkoutPlan }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;
