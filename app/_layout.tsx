import React, { useEffect } from 'react';
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
      router.replace('/(tabs)/chats');
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
