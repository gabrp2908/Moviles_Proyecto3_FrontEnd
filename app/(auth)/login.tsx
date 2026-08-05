import React, { useState } from 'react';
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
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      await login(cleanEmail, password);
      router.replace('/(tabs)/chats');
    } catch (e: any) {
      const status = e.response?.status;
      const serverMsg = e.response?.data?.message;
      
      if (status === 401) {
        Alert.alert('Error', 'Credenciales inválidas. Verifica tu correo y contraseña.');
      } else if (status === 429) {
        Alert.alert('Error', 'Demasiados intentos. Espera unos minutos e intenta de nuevo.');
      } else if (status === 500) {
        Alert.alert('Error del servidor', 'El servidor tiene un problema interno. Puede que esté reiniciándose. Intenta de nuevo en unos segundos.');
      } else if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
        Alert.alert('Sin respuesta', 'El servidor tardó demasiado en responder. Puede estar despertando, intenta de nuevo en 30 segundos.');
      } else if (!e.response) {
        Alert.alert('Sin conexión', 'No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      } else {
        Alert.alert('Error', serverMsg || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>People Finder</Text>
        <Text style={styles.subtitle}>Encuentra a tu gente</Text>
        
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
