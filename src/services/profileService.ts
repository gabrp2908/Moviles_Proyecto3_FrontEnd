import { api } from './api';
import { Profile, FeedProfile, CreateProfilePayload, UpdateProfilePayload } from '../types';

export const profileService = {
  getMyProfile: async (): Promise<Profile | null> => {
    try {
      const response = await api.get('/profiles/me');
      return response.data;
    } catch (e: any) {
      if (e.response && e.response.status === 404) {
        return null;
      }
      throw e;
    }
  },

  createProfile: async (data: CreateProfilePayload): Promise<Profile> => {
    const response = await api.post('/profiles/me', data);
    return response.data;
  },

  updateProfile: async (data: UpdateProfilePayload): Promise<Profile> => {
    const response = await api.put('/profiles/me', data);
    return response.data;
  },

  getFeed: async (): Promise<FeedProfile[]> => {
    const response = await api.get('/profiles/feed');
    return response.data;
  },

  getProfile: async (userId: string): Promise<Profile> => {
    const response = await api.get(`/profiles/${userId}`);
    return response.data;
  }
};
