import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '../constants';

const TOKEN_KEY = 'auth_token';

export const getToken = async () => {
  return await SecureStore.getItemAsync(TOKEN_KEY);
};

export const saveToken = async (token: string) => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const clearToken = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use((response) => {
  return response;
}, async (error) => {
  if (error.response && error.response.status === 401) {
    await clearToken();
    // Return a resolved empty response to avoid uncaught promise rejections
    // AuthContext will detect the missing token and redirect to login
    return Promise.resolve({ data: null, status: 401 });
  }
  return Promise.reject(error);
});

export class ApiError extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}
