import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SessionInfo } from '../types';

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  sessions: SessionInfo[];
  registerSession: (sessionId: string, type: string, metadata?: any) => void;
  requestSubsession: (parentSessionId: string, task: string, parameters?: any) => void;
  updateSessionStatus: (sessionId: string, status: string, metadata?: any) => void;
  respondToSubsession: (subsessionId: string, response: any, status: string) => void;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [connected, setConnected] = useState<boolean>(false);

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

    socketInstance.on('sessions-update', (sessionData: SessionInfo[]) => {
      setSessions(sessionData);
    });

    socketInstance.on('new-subsession', (data: any) => {
      console.log('New subsession request:', data);
    });

    socketInstance.on('subsession-update', (data: any) => {
      console.log('Subsession update:', data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const registerSession = useCallback((sessionId: string, type: string, metadata?: any): void => {
    if (socket && connected) {
      socket.emit('register-session', { sessionId, type, metadata });
    }
  }, [socket, connected]);

  const requestSubsession = useCallback((parentSessionId: string, task: string, parameters?: any): void => {
    if (socket && connected) {
      socket.emit('subsession-request', { parentSessionId, task, parameters });
    }
  }, [socket, connected]);

  const updateSessionStatus = useCallback((sessionId: string, status: string, metadata?: any): void => {
    if (socket && connected) {
      socket.emit('update-session-status', { sessionId, status, metadata });
    }
  }, [socket, connected]);

  const respondToSubsession = useCallback((subsessionId: string, response: any, status: string): void => {
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