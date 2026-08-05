import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../constants';
import { Message } from '../types';

export interface ServerEvents {
  'message:new': (message: Message) => void;
  'typing:status': (data: { userId: string, typing: boolean }) => void;
  'match:new': (data: { matchId: string }) => void;
}

let socket: Socket | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

export const startHeartbeat = () => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (socket?.connected) {
      socket.emit('heartbeat');
    }
  }, 5000);
};

export const connectSocket = (token: string): Socket => {
  if (socket) return socket;
  socket = io(BASE_URL, {
    transports: ['websocket', 'polling'],
    auth: {
      token
    }
  });

  socket.on('connect', () => {
    startHeartbeat();
  });

  socket.on('disconnect', () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
  });

  return socket;
};

export const disconnectSocket = () => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export const socketActions = {
  join: (chatId: string) => {
    socket?.emit('join', { chatIds: [chatId] });
  },
  leave: (chatId: string) => {
    socket?.emit('leave', { chatId });
  },
  sendMessage: (chatId: string, content: string, type: 'text' | 'image' = 'text', imageUrl?: string) => {
    socket?.emit('sendMessage', { chatId, content, type, imageUrl });
  },
  typing: (chatId: string, isTyping: boolean = true) => {
    socket?.emit('typing', { chatId, typing: isTyping });
  }
};
