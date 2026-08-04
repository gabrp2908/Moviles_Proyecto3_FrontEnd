import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { AuthUser } from '../types';
import { clearToken, saveToken, getToken } from '../services/api';
import { disconnectSocket } from '../services/socketService';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  hasProfile: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  setHasProfile: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const storedToken = await getToken();
      if (storedToken) {
        setToken(storedToken);
        const me = await authService.getMe();
        setUser(me);
        try {
          const profile = await profileService.getMyProfile();
          setHasProfile(!!profile);
        } catch (e) {
          setHasProfile(false);
        }
      }
    } catch (e) {
      console.error(e);
      await clearToken();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    const res = await authService.mobileLogin(email, pass);
    // mobileLogin already saves the token via saveToken inside the service
    // res is the full AuthTokenResponse with access_token and user
    setToken(res.access_token);
    setUser(res.user);
    try {
      const profile = await profileService.getMyProfile();
      setHasProfile(!!profile);
    } catch (e) {
      setHasProfile(false);
    }
  };

  const register = async (email: string, pass: string) => {
    await authService.register(email, pass);
    await login(email, pass);
  };

  const logout = async () => {
    try { await authService.logout(); } catch (e) {}
    await clearToken();
    disconnectSocket();
    setToken(null);
    setUser(null);
    setHasProfile(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, hasProfile, login, register, logout, setHasProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
