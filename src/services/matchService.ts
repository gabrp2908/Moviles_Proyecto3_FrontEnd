import { api } from './api';
import { SwipeResponse, Match, IncomingLike } from '../types';

export const matchService = {
  swipe: async (toUserId: string, liked: boolean): Promise<SwipeResponse> => {
    const response = await api.post('/matches/swipe', {
      toUserId,
      direction: liked ? 'right' : 'left',
    });
    return response.data;
  },

  getMatches: async (): Promise<Match[]> => {
    const response = await api.get('/matches');
    return response.data;
  },

  getIncomingLikes: async (): Promise<IncomingLike[]> => {
    const response = await api.get('/matches/incoming');
    return response.data;
  }
};
