import { api, saveToken, clearToken } from './api';
import { AuthTokenResponse, AuthUser } from '../types';

export const authService = {
  register: async (email: string, password: string):Promise<{ message: string }> => {
    const response = await api.post('/auth/register', { email, password });
    return response.data;
  },

  mobileLogin: async (email: string, password: string): Promise<AuthTokenResponse> => {
    const response = await api.post('/auth/mobile-login', { email, password });
    await saveToken(response.data.access_token);
    return response.data;
  },

  getMe: async (): Promise<AuthUser> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    await clearToken();
  },

  forgetPassword: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/forget-password', { email });
    return response.data;
  },

  verifyReset: async (email: string, token: string): Promise<{ valid: boolean }> => {
    const response = await api.post('/auth/verify-reset', { email, token });
    return response.data;
  },

  resetPassword: async (email: string, token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/reset-password', { email, token, newPassword });
    return response.data;
  },

  deleteAccount: async (password: string): Promise<{ message: string }> => {
    const response = await api.delete('/auth/account', { data: { password } });
    return response.data;
  }
};
