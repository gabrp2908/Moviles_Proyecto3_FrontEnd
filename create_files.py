import os

base_dir = r"c:\Users\gabrp\OneDrive\Desktop\moviles_p3\PeopleFinderApp"

files = {
    "src/context/AuthContext.tsx": """import React, { createContext, useState, useEffect, useContext } from 'react';
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
    await saveToken(res.token);
    setToken(res.token);
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
""",

    "src/context/SocketContext.tsx": """import React, { createContext, useContext, useEffect, useState } from 'react';
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
""",

    "app/_layout.tsx": """import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments, Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { SocketProvider } from '../src/context/SocketContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, StatusBar } from 'react-native';

const RootLayoutNav = () => {
  const { isLoading, token } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [token, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F0E8' }}>
        <ActivityIndicator size="large" color="#4B8FD4" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F0E8" />
      <AuthProvider>
        <SocketProvider>
          <RootLayoutNav />
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
""",

    "app/(auth)/_layout.tsx": """import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
""",

    "app/(auth)/login.tsx": """import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Link, useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor, rellena todos los campos');
      return;
    }
    try {
      setLoading(true);
      await login(email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>People Finder</Text>
        <Text style={styles.subtitle}>Encuentra a tu gente ☀️</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
        </TouchableOpacity>
        
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.linkContainer}>
            <Text style={styles.linkText}>No tengo cuenta</Text>
          </TouchableOpacity>
        </Link>
        
        <Link href="/(auth)/forgot-password" asChild>
          <TouchableOpacity style={styles.linkContainer}>
            <Text style={styles.linkText}>Olvidé mi contraseña</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6BB8E0', justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#FDFBF5',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(42,46,74,0.12)',
    shadowColor: '#2A2E4A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: '#3B7BC0', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#7A7E9A', textAlign: 'center', marginBottom: 24 },
  input: {
    backgroundColor: '#FDFBF5',
    borderWidth: 2,
    borderColor: '#C8C4D8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4B8FD4',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#2A2E4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 4,
    marginTop: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  linkContainer: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#3B7BC0', fontSize: 16, fontWeight: '600' },
});
""",

    "app/(auth)/register.tsx": """import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Link, useRouter } from 'expo-router';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Por favor, rellena todos los campos');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    try {
      setLoading(true);
      await register(email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Error al crear cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>People Finder</Text>
        <Text style={styles.subtitle}>Crea tu cuenta ☀️</Text>
        
        <TextInput style={styles.input} placeholder="Correo electrónico" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Contraseña" value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="Confirmar contraseña" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crear cuenta</Text>}
        </TouchableOpacity>
        
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.linkContainer}>
            <Text style={styles.linkText}>Ya tengo cuenta</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6BB8E0', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#FDFBF5', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#3B7BC0', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#7A7E9A', textAlign: 'center', marginBottom: 24 },
  input: { backgroundColor: '#FDFBF5', borderWidth: 2, borderColor: '#C8C4D8', borderRadius: 16, padding: 16, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#4B8FD4', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 4, marginTop: 8 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  linkContainer: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#3B7BC0', fontSize: 16, fontWeight: '600' },
});
""",

    "app/(auth)/forgot-password.tsx": """import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { authService } from '../../src/services/authService';
import { Link, useRouter } from 'expo-router';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendCode = async () => {
    try {
      setLoading(true);
      await authService.forgetPassword(email);
      setStep(2);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Error al enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    try {
      setLoading(true);
      await authService.verifyReset(email, code);
      setStep(3);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setLoading(true);
      await authService.resetPassword(email, code, password);
      Alert.alert('Éxito', 'Contraseña actualizada');
      router.replace('/(auth)/login');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Recuperar Contraseña</Text>
        
        {step === 1 && (
          <>
            <Text style={styles.subtitle}>Ingresa tu correo para recibir un código</Text>
            <TextInput style={styles.input} placeholder="Correo electrónico" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar Código</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.subtitle}>Ingresa el código de 6 dígitos</Text>
            <TextInput style={styles.input} placeholder="Código" value={code} onChangeText={setCode} keyboardType="numeric" />
            <TouchableOpacity style={styles.button} onPress={handleVerifyCode} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verificar</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.subtitle}>Ingresa tu nueva contraseña</Text>
            <TextInput style={styles.input} placeholder="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry />
            <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Cambiar Contraseña</Text>}
            </TouchableOpacity>
          </>
        )}
        
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.linkContainer}>
            <Text style={styles.linkText}>Volver al login</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6BB8E0', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#FDFBF5', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#3B7BC0', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#7A7E9A', textAlign: 'center', marginBottom: 24 },
  input: { backgroundColor: '#FDFBF5', borderWidth: 2, borderColor: '#C8C4D8', borderRadius: 16, padding: 16, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#4B8FD4', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 4, marginTop: 8 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  linkContainer: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#3B7BC0', fontSize: 16, fontWeight: '600' },
});
""",

    "app/(tabs)/_layout.tsx": """import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useEffect } from 'react';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { hasProfile, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !hasProfile) {
      router.replace('/(tabs)/create-profile');
    }
  }, [hasProfile, isLoading]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FDFBF5',
          borderTopColor: '#C8C4D8',
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
        tabBarActiveTintColor: '#3B7BC0',
        tabBarInactiveTintColor: '#7A7E9A',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: 'Likes',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="create-profile" options={{ href: null }} />
      <Tabs.Screen name="chat/[chatId]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
""",

    "app/(tabs)/index.tsx": """import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { profileService } from '../../src/services/profileService';
import { matchService } from '../../src/services/matchService';
import { FeedProfile } from '../../src/types';

export default function SwipeFeedScreen() {
  const [profiles, setProfiles] = useState<FeedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const router = useRouter();

  const loadFeed = async () => {
    try {
      const data = await profileService.getFeed();
      setProfiles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadFeed(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed();
  }, []);

  const handleSwipe = async (liked: boolean) => {
    if (profiles.length === 0) return;
    const current = profiles[0];
    const newProfiles = [...profiles.slice(1)];
    setProfiles(newProfiles);

    try {
      const res = await matchService.swipe(current.userId._id, liked);
      if (res.match) {
        setCurrentMatchId(res.chatId || null);
        setMatchModalVisible(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const currentProfile = profiles[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>People Finder</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/likes')}>
          <Ionicons name="notifications-outline" size={28} color="#2A2E4A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading ? (
          <ActivityIndicator size="large" color="#4B8FD4" style={{ marginTop: 50 }} />
        ) : profiles.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardName}>{currentProfile.name}, {currentProfile.age}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.infoText}>{currentProfile.aboutMe || 'Sin descripción'}</Text>
              <Text style={styles.infoSubtext}>📍 {currentProfile.country}</Text>
              {currentProfile.height && <Text style={styles.infoSubtext}>📏 {currentProfile.height} cm</Text>}
              
              <View style={styles.chips}>
                {currentProfile.languages?.map((l: string) => (
                  <View key={l} style={styles.chip}><Text style={styles.chipText}>{l}</Text></View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>No hay más personas por ahora. ¡Vuelve más tarde! 🌤️</Text>
        )}
      </ScrollView>

      {profiles.length > 0 && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D94F4F' }]} onPress={() => handleSwipe(false)}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#5BBF6B' }]} onPress={() => handleSwipe(true)}>
            <Ionicons name="heart" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={matchModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>¡Es un match! 🎉</Text>
            <TouchableOpacity style={styles.button} onPress={() => { setMatchModalVisible(false); if(currentMatchId) router.push(`/(tabs)/chat/${currentMatchId}`); }}>
              <Text style={styles.buttonText}>Enviar mensaje</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: '#7A7E9A', marginTop: 10 }]} onPress={() => setMatchModalVisible(false)}>
              <Text style={styles.buttonText}>Seguir buscando</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#4B8FD4' },
  scrollContent: { padding: 16, flexGrow: 1 },
  card: { backgroundColor: '#FDFBF5', borderRadius: 24, borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, overflow: 'hidden', marginBottom: 20 },
  cardHeader: { backgroundColor: '#6BB8E0', padding: 40, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  cardInfo: { padding: 20 },
  infoText: { fontSize: 16, color: '#2A2E4A', marginBottom: 12 },
  infoSubtext: { fontSize: 14, color: '#7A7E9A', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  chip: { backgroundColor: '#B8D4F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  chipText: { color: '#3B7BC0', fontSize: 12, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', fontSize: 16, color: '#7A7E9A', marginTop: 50 },
  actions: { flexDirection: 'row', justifyContent: 'space-evenly', paddingBottom: 20 },
  actionBtn: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 4 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FDFBF5', borderRadius: 24, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 28, fontWeight: 'bold', color: '#3B7BC0', marginBottom: 20 },
  button: { backgroundColor: '#4B8FD4', borderRadius: 16, padding: 16, alignItems: 'center', width: '100%', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 4 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
""",

    "app/(tabs)/likes.tsx": """import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { matchService } from '../../src/services/matchService';

export default function LikesScreen() {
  const [likes, setLikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const router = useRouter();

  const loadLikes = async () => {
    try {
      const data = await matchService.getIncomingLikes();
      setLikes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadLikes(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLikes();
  }, []);

  const handleAction = async (userId: string, liked: boolean) => {
    try {
      const res = await matchService.swipe(userId, liked);
      setLikes(prev => prev.filter(l => l.fromUser._id !== userId));
      if (res.match) {
        setCurrentMatchId(res.chatId || null);
        setMatchModalVisible(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.itemCard}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{item.fromUser.name?.[0]}</Text></View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.fromUser.name}</Text>
        <Text style={styles.subtitle}>Quiere conocerte</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#D94F4F' }]} onPress={() => handleAction(item.fromUser._id, false)}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#5BBF6B' }]} onPress={() => handleAction(item.fromUser._id, true)}>
          <Ionicons name="checkmark" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.header}>Notificaciones</Text>
      {loading && !refreshing ? <ActivityIndicator size="large" color="#4B8FD4" style={{ marginTop: 20 }} /> : (
        <FlatList
          data={likes}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Sin notificaciones nuevas</Text>}
        />
      )}

      <Modal visible={matchModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>¡Es un match! 🎉</Text>
            <TouchableOpacity style={styles.button} onPress={() => { setMatchModalVisible(false); if(currentMatchId) router.push(`/(tabs)/chat/${currentMatchId}`); }}>
              <Text style={styles.buttonText}>Enviar mensaje</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: '#7A7E9A', marginTop: 10 }]} onPress={() => setMatchModalVisible(false)}>
              <Text style={styles.buttonText}>Seguir buscando</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#4B8FD4', padding: 16 },
  listContent: { padding: 16 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDFBF5', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6BB8E0', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2A2E4A' },
  subtitle: { fontSize: 14, color: '#7A7E9A' },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 2 },
  emptyText: { textAlign: 'center', color: '#7A7E9A', marginTop: 40 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FDFBF5', borderRadius: 24, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 28, fontWeight: 'bold', color: '#3B7BC0', marginBottom: 20 },
  button: { backgroundColor: '#4B8FD4', borderRadius: 16, padding: 16, alignItems: 'center', width: '100%', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 4 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
""",

    "app/(tabs)/chats.tsx": """import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { chatService } from '../../src/services/chatService';
import { useSocket } from '../../src/context/SocketContext';
import { useAuth } from '../../src/context/AuthContext';
import { ChatListItem } from '../../src/types';

export default function ChatsScreen() {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { onlineUsers } = useSocket();
  const { user } = useAuth();

  const loadChats = async () => {
    try {
      const data = await chatService.getChats();
      setChats(data);
      setFilteredChats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadChats(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadChats();
  }, []);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text) setFilteredChats(chats);
    else {
      setFilteredChats(chats.filter(c => {
        const otherUser = c.participants.find(p => p._id !== user?.id);
        return otherUser?.name.toLowerCase().includes(text.toLowerCase());
      }));
    }
  };

  const renderItem = ({ item }: { item: ChatListItem }) => {
    const otherUser = item.participants.find(p => p._id !== user?.id);
    const isOnline = otherUser ? onlineUsers[otherUser._id] : false;
    
    return (
      <TouchableOpacity style={styles.itemCard} onPress={() => router.push(`/(tabs)/chat/${item._id}` as any)}>
        <View>
          <View style={styles.avatar}><Text style={styles.avatarText}>{otherUser?.name?.[0]}</Text></View>
          {isOnline && <View style={styles.onlineBadge} />}
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{otherUser?.name}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage?.content || 'Sin mensajes'}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.time}>{item.lastMessage ? new Date(item.lastMessage.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unreadCount}</Text></View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.header}>Chats</Text>
      <View style={styles.searchContainer}>
        <TextInput style={styles.searchInput} placeholder="Buscar chats..." value={search} onChangeText={handleSearch} />
      </View>
      
      {loading && !refreshing ? <ActivityIndicator size="large" color="#4B8FD4" style={{ marginTop: 20 }} /> : (
        <FlatList
          data={filteredChats}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Aún no hay conversaciones. ¡Ve a Buscar y encuentra a alguien!</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#4B8FD4', padding: 16 },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 16 },
  searchInput: { backgroundColor: '#FDFBF5', borderWidth: 2, borderColor: '#C8C4D8', borderRadius: 16, padding: 12, fontSize: 16 },
  listContent: { paddingHorizontal: 16 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDFBF5', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6BB8E0', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  onlineBadge: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#5BBF6B', borderWidth: 2, borderColor: '#FDFBF5' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2A2E4A' },
  lastMessage: { fontSize: 14, color: '#7A7E9A', marginTop: 4 },
  meta: { alignItems: 'flex-end' },
  time: { fontSize: 12, color: '#7A7E9A', marginBottom: 4 },
  unreadBadge: { backgroundColor: '#D94F4F', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#7A7E9A', marginTop: 40 },
});
""",

    "app/(tabs)/chat/[chatId].tsx": """import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { chatService } from '../../../src/services/chatService';
import { socketActions } from '../../../src/services/socketService';
import { useSocket } from '../../../src/context/SocketContext';
import { useAuth } from '../../../src/context/AuthContext';
import { Message } from '../../../src/types';

export default function ChatDetailScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const router = useRouter();
  const { socket, onlineUsers } = useSocket();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const typingTimeout = useRef<any>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    loadMessages();
    chatService.markAsRead(chatId);
    
    if (socket) {
      socket.emit('joinChat', chatId);
      socket.on('newMessage', (msg: Message) => {
        if (msg.chatId === chatId) {
          setMessages(prev => [msg, ...prev]);
          chatService.markAsRead(chatId);
        }
      });
      socket.on('typing', (data: {chatId: string, userId: string}) => {
        if (data.chatId === chatId && data.userId !== user?.id) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 2000);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('newMessage');
        socket.off('typing');
      }
      chatService.markAsRead(chatId);
    };
  }, [chatId, socket]);

  const loadMessages = async () => {
    try {
      const data = await chatService.getMessages(chatId);
      setMessages(data.reverse()); // Assume API returns chronological, but FlatList inverted needs reversed
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = () => {
    if (!text.trim()) return;
    socketActions.sendMessage(chatId, text.trim());
    setText('');
  };

  const handleTyping = (val: string) => {
    setText(val);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    socketActions.typing(chatId);
    typingTimeout.current = setTimeout(() => {}, 300);
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;
    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowThem]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={styles.messageText}>{item.content}</Text>
          <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#2A2E4A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={messages}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          inverted
          contentContainerStyle={styles.listContent}
        />
        {isTyping && <Text style={styles.typingText}>Escribiendo...</Text>}
        
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            value={text}
            onChangeText={handleTyping}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 12, backgroundColor: '#FDFBF5', borderBottomWidth: 1, borderBottomColor: '#C8C4D8' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#2A2E4A' },
  keyboardAvoid: { flex: 1 },
  listContent: { padding: 16 },
  messageRow: { flexDirection: 'row', marginBottom: 12 },
  messageRowMe: { justifyContent: 'flex-end' },
  messageRowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
  bubbleMe: { backgroundColor: '#B8E8C4', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#B8D4F0', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 16, color: '#2A2E4A' },
  timeText: { fontSize: 10, color: '#7A7E9A', alignSelf: 'flex-end', marginTop: 4 },
  typingText: { fontSize: 12, color: '#7A7E9A', marginLeft: 16, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#FDFBF5', borderTopWidth: 1, borderTopColor: '#C8C4D8', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F5F0E8', borderWidth: 1, borderColor: '#C8C4D8', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4B8FD4', justifyContent: 'center', alignItems: 'center', marginLeft: 12, shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 2 },
});
""",

    "app/(tabs)/profile.tsx": """import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { profileService } from '../../src/services/profileService';
import { Profile } from '../../src/types';

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aboutMe, setAboutMe] = useState('');

  const loadProfile = async () => {
    try {
      const data = await profileService.getMyProfile();
      setProfile(data);
      setAboutMe(data.aboutMe || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); loadProfile(); }, []);

  const handleSave = async () => {
    try {
      await profileService.updateProfile({ aboutMe });
      Alert.alert('Éxito', 'Perfil actualizado');
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.header}>Mi Perfil</Text>
      {loading && !refreshing ? <ActivityIndicator size="large" color="#4B8FD4" style={{ marginTop: 20 }} /> : (
        <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{profile?.name?.[0]}</Text></View>
            <Text style={styles.nameText}>{profile?.name}</Text>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Datos</Text>
            <Text style={styles.label}>Sobre mí</Text>
            <TextInput style={[styles.input, { height: 100 }]} multiline value={aboutMe} onChangeText={setAboutMe} />
            <TouchableOpacity style={styles.button} onPress={handleSave}>
              <Text style={styles.buttonText}>Guardar cambios</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.button, styles.logoutBtn]} onPress={logout}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#4B8FD4', padding: 16 },
  scrollContent: { padding: 16 },
  avatarContainer: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#6BB8E0', justifyContent: 'center', alignItems: 'center', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  avatarText: { fontSize: 40, color: '#fff', fontWeight: 'bold' },
  nameText: { fontSize: 20, fontWeight: 'bold', color: '#2A2E4A', marginTop: 12 },
  card: { backgroundColor: '#FDFBF5', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#3B7BC0', marginBottom: 16 },
  label: { fontSize: 14, color: '#7A7E9A', marginBottom: 8 },
  input: { backgroundColor: '#FDFBF5', borderWidth: 2, borderColor: '#C8C4D8', borderRadius: 16, padding: 12, fontSize: 16, marginBottom: 16, textAlignVertical: 'top' },
  button: { backgroundColor: '#4B8FD4', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 4 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#F5F0E8', borderWidth: 2, borderColor: '#D94F4F', marginTop: 20 },
  logoutText: { color: '#D94F4F', fontSize: 16, fontWeight: 'bold' },
});
""",

    "app/(tabs)/create-profile.tsx": """import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { profileService } from '../../src/services/profileService';
import { useAuth } from '../../src/context/AuthContext';

export default function CreateProfileScreen() {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('Man');
  const [country, setCountry] = useState('España');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setHasProfile } = useAuth();

  const handleCreate = async () => {
    if (!name || !birthDate || !country) {
      Alert.alert('Error', 'Por favor llena los campos requeridos');
      return;
    }
    try {
      setLoading(true);
      await profileService.createProfile({
        name,
        birthDate: new Date(birthDate),
        gender: gender as any,
        country,
        photos: ['default.jpg']
      });
      setHasProfile(true);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Error al crear perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Crea tu Perfil</Text>
          <Text style={styles.subtitle}>¡Queremos conocerte! 🌟</Text>
          
          <Text style={styles.label}>Nombre</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Tu nombre" />
          
          <Text style={styles.label}>Fecha de Nacimiento (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} placeholder="1995-05-20" />
          
          <Text style={styles.label}>Género</Text>
          <TextInput style={styles.input} value={gender} onChangeText={setGender} />
          
          <Text style={styles.label}>País</Text>
          <TextInput style={styles.input} value={country} onChangeText={setCountry} />
          
          <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Comenzar</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6BB8E0' },
  scrollContent: { padding: 20, justifyContent: 'center', flexGrow: 1 },
  card: { backgroundColor: '#FDFBF5', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#3B7BC0', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#7A7E9A', textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 14, color: '#2A2E4A', marginBottom: 8, fontWeight: 'bold' },
  input: { backgroundColor: '#FDFBF5', borderWidth: 2, borderColor: '#C8C4D8', borderRadius: 16, padding: 12, fontSize: 16, marginBottom: 16 },
  button: { backgroundColor: '#4B8FD4', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 4, marginTop: 16 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
"""
}

for path, content in files.items():
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\\n")
