import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, Image, Modal, FlatList, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/context/AuthContext';
import { profileService } from '../../src/services/profileService';
import { imageService } from '../../src/services/imageService';
import { Profile } from '../../src/types';
import { GENDERS, COUNTRIES, EDUCATION } from '../../src/constants';

export default function ProfileScreen() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date>(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedGender, setSelectedGender] = useState(0);
  const [country, setCountry] = useState('');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [aboutMe, setAboutMe] = useState('');
  const [education, setEducation] = useState<string | null>(null);
  const [height, setHeight] = useState<string>('');

  const loadProfile = async () => {
    try {
      const data = await profileService.getMyProfile();
      if (data) {
        setProfile(data);
        setName(data.name || '');
        if (data.birthDate) {
          setBirthDate(new Date(data.birthDate));
        }
        if (data.gender) {
          const gIndex = GENDERS.indexOf(data.gender.toLowerCase());
          if (gIndex >= 0) setSelectedGender(gIndex);
        }
        setCountry(data.country || '');
        setAboutMe(data.aboutMe || '');
        setEducation(data.education || null);
        setHeight(data.height ? String(data.height) : '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); loadProfile(); }, []);

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setBirthDate(date);
    }
  };

  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        name: name.trim(),
        birthDate: birthDate.toISOString(),
        gender: GENDERS[selectedGender],
        country: country.trim() || undefined,
        aboutMe: aboutMe.trim() || undefined,
        education: education || undefined,
        height: height ? Number(height) : undefined,
      };

      await profileService.updateProfile(payload);
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
      loadProfile();
    } catch (e: any) {
      let rawMsg = e.response?.data?.message || 'No se pudo actualizar el perfil';
      if (Array.isArray(rawMsg)) rawMsg = rawMsg.join('\n');
      Alert.alert('Error', String(rawMsg));
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

  const handleDeletePhoto = (photoUrl: string) => {
    Alert.alert('Eliminar foto', '¿Deseas eliminar esta foto de tu perfil?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            if (profile) {
              const updatedPhotos = profile.photos.filter(p => p !== photoUrl);
              await profileService.updateProfile({ photos: updatedPhotos });
              try { await imageService.deleteProfileImage(photoUrl); } catch (e) {}
              loadProfile();
            }
          } catch (e) {
            Alert.alert('Error', 'No se pudo eliminar la foto');
          }
        }
      }
    ]);
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {profile?.photos && profile.photos.length > 0 ? (
                  <Image source={{ uri: profile.photos[0] }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{name?.[0] || '?'}</Text>
                )}
              </View>
              <Text style={styles.nameText}>{profile?.name}</Text>
              {profile?.age && <Text style={styles.ageText}>{profile.age} años</Text>}
            </View>

            {/* Photo grid */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Fotos de perfil</Text>
              <View style={styles.photoGrid}>
                {profile?.photos?.map((photo, i) => (
                  <View key={i} style={styles.photoThumbWrapper}>
                    <Image source={{ uri: photo }} style={styles.photoThumb} />
                    <TouchableOpacity style={styles.deletePhotoBadge} onPress={() => handleDeletePhoto(photo)}>
                      <Ionicons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPhoto}>
                  <Ionicons name="add" size={30} color="#4B8FD4" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Profile data editing */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Editar mis datos</Text>
              
              <Text style={styles.label}>Nombre *</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Tu nombre" maxLength={20} />

              <Text style={styles.label}>Fecha de Nacimiento *</Text>
              <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color="#3B7BC0" style={{ marginRight: 10 }} />
                <Text style={styles.dateText}>{formatDateString(birthDate)}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={birthDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  minimumDate={new Date(1920, 0, 1)}
                  onValueChange={handleDateChange}
                />
              )}

              <Text style={styles.label}>Género</Text>
              <View style={styles.genderRow}>
                {GENDERS.map((g, i) => (
                  <TouchableOpacity 
                    key={g} 
                    style={[styles.genderBtn, selectedGender === i && styles.genderBtnActive]}
                    onPress={() => setSelectedGender(i)}
                  >
                    <Ionicons 
                      name={g === 'masculino' ? 'male-outline' : g === 'femenino' ? 'female-outline' : 'person-outline'} 
                      size={16} 
                      color={selectedGender === i ? '#3B7BC0' : '#7A7E9A'} 
                      style={{ marginRight: 6 }} 
                    />
                    <Text style={[styles.genderBtnText, selectedGender === i && styles.genderBtnTextActive]}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>País</Text>
              <TouchableOpacity style={styles.countrySelector} onPress={() => setShowCountryModal(true)}>
                <Ionicons name="location-outline" size={20} color="#3B7BC0" style={{ marginRight: 10 }} />
                <Text style={styles.countryText}>{country || 'Selecciona tu país'}</Text>
                <Ionicons name="chevron-down" size={18} color="#7A7E9A" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              <Text style={styles.label}>Sobre mí</Text>
              <TextInput 
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]} 
                multiline 
                value={aboutMe} 
                onChangeText={setAboutMe} 
                placeholder="Cuéntanos sobre ti..."
                maxLength={500}
              />

              <Text style={styles.label}>Estatura (cm)</Text>
              <TextInput 
                style={styles.input} 
                value={height} 
                onChangeText={setHeight} 
                placeholder="Ej: 175" 
                keyboardType="numeric" 
                maxLength={3} 
              />

              <Text style={styles.label}>Nivel de Estudios</Text>
              <View style={styles.genderRow}>
                {EDUCATION.map((edu) => (
                  <TouchableOpacity 
                    key={edu} 
                    style={[styles.genderBtn, education === edu && styles.genderBtnActive]}
                    onPress={() => setEducation(education === edu ? null : edu)}
                  >
                    <Text style={[styles.genderBtnText, education === edu && styles.genderBtnTextActive]}>
                      {edu}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

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
        </KeyboardAvoidingView>
      )}

      {/* Country Selection Modal */}
      <Modal visible={showCountryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona tu País</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Ionicons name="close" size={24} color="#2A2E4A" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.countryOption, country === item && styles.countryOptionSelected]} 
                  onPress={() => {
                    setCountry(item);
                    setShowCountryModal(false);
                  }}
                >
                  <Text style={[styles.countryOptionText, country === item && styles.countryOptionTextSelected]}>
                    {item}
                  </Text>
                  {country === item && <Ionicons name="checkmark" size={20} color="#3B7BC0" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#4B8FD4', padding: 16 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  avatarContainer: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#6BB8E0', justifyContent: 'center', alignItems: 'center', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4, overflow: 'hidden' },
  avatarImage: { width: 100, height: 100 },
  avatarText: { fontSize: 40, color: '#fff', fontWeight: 'bold' },
  nameText: { fontSize: 20, fontWeight: 'bold', color: '#2A2E4A', marginTop: 12 },
  ageText: { fontSize: 16, color: '#7A7E9A', marginTop: 4 },
  card: { backgroundColor: '#FDFBF5', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#3B7BC0', marginBottom: 16 },
  label: { fontSize: 14, color: '#7A7E9A', marginBottom: 8, fontWeight: 'bold' },
  input: { backgroundColor: '#FDFBF5', borderWidth: 2, borderColor: '#C8C4D8', borderRadius: 16, padding: 12, fontSize: 16, marginBottom: 16 },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDFBF5', borderWidth: 2, borderColor: '#C8C4D8', borderRadius: 16, padding: 14, marginBottom: 16 },
  dateText: { fontSize: 16, color: '#2A2E4A', fontWeight: '600' },
  countrySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDFBF5', borderWidth: 2, borderColor: '#C8C4D8', borderRadius: 16, padding: 14, marginBottom: 16 },
  countryText: { fontSize: 16, color: '#2A2E4A', fontWeight: '600' },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  genderBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 2, borderColor: '#C8C4D8', backgroundColor: '#FDFBF5' },
  genderBtnActive: { borderColor: '#4B8FD4', backgroundColor: '#E8F4FD' },
  genderBtnText: { fontSize: 14, color: '#7A7E9A', fontWeight: '600' },
  genderBtnTextActive: { color: '#3B7BC0' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumbWrapper: { position: 'relative' },
  photoThumb: { width: 80, height: 80, borderRadius: 16, resizeMode: 'cover' },
  deletePhotoBadge: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#D94F4F', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FDFBF5' },
  addPhotoBtn: { width: 80, height: 80, borderRadius: 16, borderWidth: 2, borderColor: '#C8C4D8', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F0E8' },
  button: { backgroundColor: '#4B8FD4', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 4, marginTop: 12 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#F5F0E8', borderWidth: 2, borderColor: '#7A7E9A', marginTop: 20, shadowOpacity: 0 },
  logoutText: { color: '#7A7E9A', fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: '#F5F0E8', borderWidth: 2, borderColor: '#D94F4F', marginTop: 12, shadowOpacity: 0 },
  deleteText: { color: '#D94F4F', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FDFBF5', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#C8C4D8', paddingBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#3B7BC0' },
  countryOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  countryOptionSelected: { backgroundColor: '#E8F4FD' },
  countryOptionText: { fontSize: 16, color: '#2A2E4A' },
  countryOptionTextSelected: { fontWeight: 'bold', color: '#3B7BC0' },
});
