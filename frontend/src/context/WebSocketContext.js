// src/context/WebSocketContext.js

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import ReconnectingWebSocket from 'reconnecting-websocket';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { authToken, user, loading: authLoading } = useAuth();
  const socketRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsReconnecting, setWsReconnecting] = useState(false);
  const [latestWorkoutPlan, setLatestWorkoutPlan] = useState(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    console.log('WebSocketProvider - Authentication State:', {
      authToken: authToken ? 'Token present' : 'No token',
      user: user ? user.id : 'No user',
      loading: authLoading
    });

    const cleanupSocket = () => {
      if (socketRef.current) {
        console.log('Cleaning up WebSocket connection');
        socketRef.current.close();
        socketRef.current = null;
        setWsConnected(false);
        setWsReconnecting(false);
        reconnectAttempts.current = 0;
      }
    };

    if (authLoading) {
      console.log('WebSocketProvider: Authentication is still loading');
      return cleanupSocket;
    }

    if (!authToken || !user?.id) {
      console.log('WebSocketProvider: No auth token or user available');
      setWsConnected(false);
      return cleanupSocket;
    }

    // Clean up any existing connection before creating a new one
    cleanupSocket();

    try {
      // Always use port 8000 for WebSocket connections in development
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = process.env.NODE_ENV === 'development' ? 'localhost:8000' : window.location.host;
      // Remove any existing 'Token ' prefix and spaces
      const cleanToken = authToken.replace(/^Token\s+/i, '').trim();
      const wsUrl = `${protocol}://${host}/ws/workout-plan/${user.id}/?token=${cleanToken}`;

      console.log(
        'WebSocketProvider: Attempting connection with URL:',
        wsUrl.replace(cleanToken, '[REDACTED]')
      );

      socketRef.current = new ReconnectingWebSocket(wsUrl, [], {
        maxRetries: maxReconnectAttempts,
        reconnectionDelayGrowFactor: 1.3,
        maxReconnectionDelay: 5000,
        minReconnectionDelay: 1000,
        connectionTimeout: 4000,
      });

      socketRef.current.onopen = () => {
        console.log('WebSocket connection established');
        setWsConnected(true);
        setWsReconnecting(false);
        reconnectAttempts.current = 0;
        toast.success('Connected to workout plan service');

        // Send a test message
        socketRef.current.send(JSON.stringify({ 
          type: 'test',
          message: 'Hello server!',
          user_id: user.id
        }));
      };

      socketRef.current.onmessage = (event) => {
        console.log('Received WebSocket message:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('Parsed WebSocket message:', data);
          
          switch (data.type) {
            case 'workout_plan':
            case 'workout_plan_completed':
              const planData = data.plan_data || data.workout_plan;
              console.log('Setting latest workout plan:', planData);
              if (planData) {
                setLatestWorkoutPlan(planData);
                toast.success('Your workout plan is ready!');
              } else {
                console.error('No workout plan data in message:', data);
              }
              break;
            case 'error':
              console.error('Server error:', data.message);
              toast.error(data.message);
              break;
            case 'connection_established':
              console.log('Server confirmed connection:', data.message);
              break;
            default:
              console.log('Received message of type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socketRef.current.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setWsConnected(false);
        
        if (reconnectAttempts.current < maxReconnectAttempts) {
          setWsReconnecting(true);
          reconnectAttempts.current += 1;
          console.log(`Reconnection attempt ${reconnectAttempts.current} of ${maxReconnectAttempts}`);
        } else {
          setWsReconnecting(false);
          toast.error('Failed to connect to workout plan service');
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
        
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          setWsReconnecting(false);
          toast.error('Connection error occurred');
        }
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      toast.error('Failed to setup WebSocket connection');
    }

    return cleanupSocket;
  }, [authToken, user, authLoading]);

  const sendMessage = (message) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending message:', message);
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message - socket is not open');
      toast.error('Socket is not connected');
    }
  };

  return (
    <WebSocketContext.Provider value={{ 
      wsConnected, 
      wsReconnecting, 
      latestWorkoutPlan, 
      sendMessage,
      reconnectAttempts: reconnectAttempts.current 
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;
