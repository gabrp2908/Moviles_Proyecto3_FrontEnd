import React, { createContext, useContext, useEffect, useState } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socketService';
import { useAuth } from './AuthContext';
import { Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: Record<string, boolean>;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUsers: {},
  isConnected: false,
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (token) {
      const s = connectSocket(token);
      setSocket(s);

      s.on('connect', () => setIsConnected(true));
      s.on('disconnect', () => setIsConnected(false));
      s.on('userOnline', (userId: string) => setOnlineUsers(prev => ({ ...prev, [userId]: true })));
      s.on('userOffline', (userId: string) => setOnlineUsers(prev => ({ ...prev, [userId]: false })));

      const heartbeat = setInterval(() => {
        if (s.connected) {
          s.emit('heartbeat');
        }
      }, 5000);

      return () => {
        clearInterval(heartbeat);
        s.off('connect');
        s.off('disconnect');
        s.off('userOnline');
        s.off('userOffline');
        disconnectSocket();
      };
    }
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
