import { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io('/', {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket server');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setConnected(false);
    });

    socketInstance.on('sessions-update', (sessionData) => {
      setSessions(sessionData);
    });

    socketInstance.on('new-subsession', (data) => {
      console.log('New subsession request:', data);
    });

    socketInstance.on('subsession-update', (data) => {
      console.log('Subsession update:', data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const registerSession = useCallback((sessionId, type, metadata) => {
    if (socket && connected) {
      socket.emit('register-session', { sessionId, type, metadata });
    }
  }, [socket, connected]);

  const requestSubsession = useCallback((parentSessionId, task, parameters) => {
    if (socket && connected) {
      socket.emit('subsession-request', { parentSessionId, task, parameters });
    }
  }, [socket, connected]);

  const updateSessionStatus = useCallback((sessionId, status, metadata) => {
    if (socket && connected) {
      socket.emit('update-session-status', { sessionId, status, metadata });
    }
  }, [socket, connected]);

  const respondToSubsession = useCallback((subsessionId, response, status) => {
    if (socket && connected) {
      socket.emit('subsession-response', { subsessionId, response, status });
    }
  }, [socket, connected]);

  return {
    socket,
    connected,
    sessions,
    registerSession,
    requestSubsession,
    updateSessionStatus,
    respondToSubsession
  };
}