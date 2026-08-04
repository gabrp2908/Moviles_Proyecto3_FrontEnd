import React, { useState } from 'react';
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
