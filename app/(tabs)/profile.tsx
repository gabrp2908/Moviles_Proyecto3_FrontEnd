import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { profileService } from '../../src/services/profileService';
import { imageService } from '../../src/services/imageService';
import { Profile } from '../../src/types';
import { GENDERS, EDUCATION } from '../../src/constants';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aboutMe, setAboutMe] = useState('');
  const [country, setCountry] = useState('');

  const loadProfile = async () => {
    try {
      const data = await profileService.getMyProfile();
      setProfile(data);
      setAboutMe(data.aboutMe || '');
      setCountry(data.country || '');
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
      setSaving(true);
      await profileService.updateProfile({ aboutMe, country });
      Alert.alert('Éxito', 'Perfil actualizado');
      loadProfile();
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets[0]) {
        const res = await imageService.uploadProfileImage(result.assets[0].uri);
        if (res?.imageUrl && profile) {
          const updatedPhotos = [...(profile.photos || []), res.imageUrl];
          await profileService.updateProfile({ photos: updatedPhotos });
        }
        Alert.alert('Éxito', 'Foto subida correctamente');
        loadProfile();
      }
    } catch (e: any) {
      console.error('Upload photo error:', e.response?.data || e);
      Alert.alert('Error', e.response?.data?.message || e.message || 'Error al subir foto');
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es irreversible. ¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            const { authService } = require('../../src/services/authService');
            await authService.deleteAccount('');
            logout();
          } catch (e) {
            Alert.alert('Error', 'No se pudo eliminar la cuenta');
          }
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.header}>Mi Perfil</Text>
      {loading && !refreshing ? <ActivityIndicator size="large" color="#4B8FD4" style={{ marginTop: 20 }} /> : (
        <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {profile?.photos && profile.photos.length > 0 ? (
                <Image 
                  source={{ uri: profile.photos[0] }} 
                  style={styles.avatarImage} 
                />
              ) : (
                <Text style={styles.avatarText}>{profile?.name?.[0] || '?'}</Text>
              )}
            </View>
            <Text style={styles.nameText}>{profile?.name}</Text>
            {profile?.age && <Text style={styles.ageText}>{profile.age} años</Text>}
          </View>

          {/* Photo grid */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Fotos</Text>
            <View style={styles.photoGrid}>
              {profile?.photos?.map((photo, i) => (
                <Image 
                  key={i} 
                  source={{ uri: photo }} 
                  style={styles.photoThumb} 
                />
              ))}
              <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPhoto}>
                <Ionicons name="add" size={30} color="#4B8FD4" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Profile data */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Datos</Text>
            
            <Text style={styles.label}>Sobre mí</Text>
            <TextInput 
              style={[styles.input, { height: 100 }]} 
              multiline 
              value={aboutMe} 
              onChangeText={setAboutMe} 
              placeholder="Cuéntanos sobre ti..."
              maxLength={500}
            />

            <Text style={styles.label}>País</Text>
            <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="Ej: México" />

            {profile?.gender && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Género:</Text>
                <Text style={styles.infoValue}>{profile.gender}</Text>
              </View>
            )}
            {profile?.education && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Educación:</Text>
                <Text style={styles.infoValue}>{profile.education}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar cambios</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.button, styles.logoutBtn]} onPress={handleLogout}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.deleteBtn]} onPress={handleDeleteAccount}>
            <Text style={styles.deleteText}>Eliminar cuenta</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
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
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#6BB8E0', justifyContent: 'center', alignItems: 'center', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4, overflow: 'hidden' },
  avatarImage: { width: 100, height: 100 },
  avatarText: { fontSize: 40, color: '#fff', fontWeight: 'bold' },
  nameText: { fontSize: 20, fontWeight: 'bold', color: '#2A2E4A', marginTop: 12 },
  ageText: { fontSize: 16, color: '#7A7E9A', marginTop: 4 },
  card: { backgroundColor: '#FDFBF5', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#3B7BC0', marginBottom: 16 },
  label: { fontSize: 14, color: '#7A7E9A', marginBottom: 8 },
  input: { backgroundColor: '#FDFBF5', borderWidth: 2, borderColor: '#C8C4D8', borderRadius: 16, padding: 12, fontSize: 16, marginBottom: 16, textAlignVertical: 'top' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoValue: { fontSize: 16, color: '#2A2E4A', marginLeft: 8, fontWeight: '600' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumb: { width: 80, height: 80, borderRadius: 16, resizeMode: 'cover' },
  addPhotoBtn: { width: 80, height: 80, borderRadius: 16, borderWidth: 2, borderColor: '#C8C4D8', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F0E8' },
  button: { backgroundColor: '#4B8FD4', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 4 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#F5F0E8', borderWidth: 2, borderColor: '#7A7E9A', marginTop: 20, shadowOpacity: 0 },
  logoutText: { color: '#7A7E9A', fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: '#F5F0E8', borderWidth: 2, borderColor: '#D94F4F', marginTop: 12, shadowOpacity: 0 },
  deleteText: { color: '#D94F4F', fontSize: 16, fontWeight: 'bold' },
});
