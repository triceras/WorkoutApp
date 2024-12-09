import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { useNavigate } from 'react-router-dom';

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
  const wsInstance = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsReconnecting, setWsReconnecting] = useState(false);
  const [latestWorkoutPlan, setLatestWorkoutPlan] = useState(null);
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      // Only cleanup WebSocket if we're really unmounting the app
      if (window.isUnloading) {
        if (wsInstance.current) {
          console.log('WebSocketProvider: Cleaning up WebSocket due to app unload');
          wsInstance.current.close(1000, 'Application unloading');
          wsInstance.current = null;
        }
      }
    };
  }, []);

  useEffect(() => {
    const connectWebSocket = () => {
      if (!authToken || !user || !user.id || wsInstance.current) {
        return;
      }

      console.log('WebSocketProvider - Authentication State:', {
        authToken: authToken ? 'Token present' : 'No token',
        user: user?.id,
        loading: authLoading
      });

      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = process.env.NODE_ENV === 'development'
        ? `ws://localhost:8001/ws/workout-plan/${user.id}/?token=${authToken}`
        : `${protocol}://${window.location.host}/ws/workout-plan/${user.id}/?token=${authToken}`;
      console.log('WebSocketProvider: Creating new connection with URL:', wsUrl.replace(authToken, '[REDACTED]'));

      wsInstance.current = new ReconnectingWebSocket(wsUrl, [], {
        maxRetries: 5,
        reconnectionDelayGrowFactor: 1.3,
        maxReconnectionDelay: 5000,
        minReconnectionDelay: 1000,
        connectionTimeout: 10000,
      });

      wsInstance.current.onopen = () => {
        console.log('WebSocket connection established');
        setWsConnected(true);
        setWsReconnecting(false);
      };

      wsInstance.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          switch (data.type) {
            case 'connection_established':
              console.log('WebSocket: Connection established');
              setWsConnected(true);
              toast.success('Connected to workout plan service');
              break;

            case 'workout_plan_completed':
              console.log('WebSocket: Workout plan completed message received', data);
              const planData = {
                ...data.plan_data,
                id: data.plan_id,
                user: {
                  id: user?.id,
                  username: user?.username || '',
                  // Include other user fields if needed
                }
              };
              if (planData) {
                console.log('WebSocket: Setting latest workout plan:', planData);
                setLatestWorkoutPlan(planData);
                toast.success('Your workout plan is ready!');
                // Only navigate if we're not already on dashboard
                if (window.location.pathname !== '/dashboard') {
                  navigate('/dashboard', { 
                    replace: true,
                    state: { 
                      workoutPlan: planData,
                      timestamp: new Date().getTime()
                    }
                  });
                }
              } else {
                console.error('WebSocket: No plan data in message:', data);
                toast.error('Error loading workout plan');
              }
              break;

            case 'workout_plan_progress':
              console.log('WebSocket: Progress update received:', data.message);
              toast.info(data.message);
              break;

            case 'error':
              console.error('WebSocket: Server error:', data.message);
              toast.error(data.message || 'An error occurred');
              break;

            default:
              console.log('WebSocket: Unhandled message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsInstance.current.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setWsConnected(false);
        
        if (event.code === 1000 || event.code === 1001) {
          // Normal closure or going away
          console.log('WebSocket: Normal closure');
          return;
        }
        
        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (!wsInstance.current) {
            console.log('Attempting to reconnect WebSocket...');
            setWsReconnecting(true);
            connectWebSocket();
          }
        }, 3000);
      };

      wsInstance.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };
    };

    connectWebSocket();

    return () => {
      if (wsInstance.current) {
        wsInstance.current.close();
        wsInstance.current = null;
      }
    };
  }, [authToken, user, authLoading]);

  const value = {
    connected: wsConnected,
    reconnecting: wsReconnecting,
    latestWorkoutPlan,
    socket: wsInstance.current,
    clearLatestWorkoutPlan: () => setLatestWorkoutPlan(null)
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;
