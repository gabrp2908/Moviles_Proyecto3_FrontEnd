import { api } from './api';
import { ChatListItem, MessagesResponse } from '../types';

export const chatService = {
  getChats: async (): Promise<ChatListItem[]> => {
    const response = await api.get('/chat');
    return response.data;
  },

  getMessages: async (chatId: string, page: number = 1, limit: number = 20): Promise<MessagesResponse> => {
    const response = await api.get(`/chat/${chatId}/messages`, {
      params: { page, limit }
    });
    return response.data;
  },

  markAsRead: async (chatId: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/chat/${chatId}/read`);
    return response.data;
  }
};
