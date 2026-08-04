import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { profileService } from '../../src/services/profileService';
import { useAuth } from '../../src/context/AuthContext';
import { GENDERS, EDUCATION } from '../../src/constants';

export default function CreateProfileScreen() {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [selectedGender, setSelectedGender] = useState(0);
  const [country, setCountry] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setHasProfile } = useAuth();

  const handleCreate = async () => {
    if (!name || !birthDate) {
      Alert.alert('Error', 'Nombre y fecha de nacimiento son requeridos');
      return;
    }
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDate)) {
      Alert.alert('Error', 'Formato de fecha inválido. Usa YYYY-MM-DD');
      return;
    }
    try {
      setLoading(true);
      await profileService.createProfile({
        name,
        birthDate,
        gender: GENDERS[selectedGender] as any,
        country: country || undefined,
        aboutMe: aboutMe || undefined,
        photos: [],
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
          
          <Text style={styles.label}>Nombre *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Tu nombre" maxLength={20} />
          
          <Text style={styles.label}>Fecha de Nacimiento * (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} placeholder="1995-05-20" keyboardType="numeric" />
          
          <Text style={styles.label}>Género</Text>
          <View style={styles.genderRow}>
            {GENDERS.map((g, i) => (
              <TouchableOpacity 
                key={g} 
                style={[styles.genderBtn, selectedGender === i && styles.genderBtnActive]}
                onPress={() => setSelectedGender(i)}
              >
                <Text style={[styles.genderBtnText, selectedGender === i && styles.genderBtnTextActive]}>
                  {g === 'masculino' ? '👨 Masculino' : g === 'femenino' ? '👩 Femenino' : '🧑 Otro'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.label}>País</Text>
          <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="Ej: México" />

          <Text style={styles.label}>Sobre mí</Text>
          <TextInput 
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
            value={aboutMe} 
            onChangeText={setAboutMe} 
            placeholder="Cuéntanos algo sobre ti..." 
            multiline 
            maxLength={500} 
          />
          
          <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Comenzar 🚀</Text>}
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
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  genderBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: '#C8C4D8', backgroundColor: '#FDFBF5' },
  genderBtnActive: { borderColor: '#4B8FD4', backgroundColor: '#E8F4FD' },
  genderBtnText: { fontSize: 14, color: '#7A7E9A', fontWeight: '600' },
  genderBtnTextActive: { color: '#3B7BC0' },
  button: { backgroundColor: '#4B8FD4', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 4, marginTop: 16 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
