import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Image, Modal, FlatList, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { profileService } from '../../src/services/profileService';
import { imageService } from '../../src/services/imageService';
import { useAuth } from '../../src/context/AuthContext';
import { GENDERS, COUNTRIES } from '../../src/constants';

export default function CreateProfileScreen() {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date>(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedGender, setSelectedGender] = useState(0);
  const [country, setCountry] = useState('');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [aboutMe, setAboutMe] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setHasProfile } = useAuth();

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

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo seleccionar la foto');
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }
    
    // Check age >= 18
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      Alert.alert('Error', 'Debes ser mayor de 18 años');
      return;
    }

    try {
      setLoading(true);
      let uploadedPhotoUrl: string | null = null;

      if (photoUri) {
        setUploadingPhoto(true);
        try {
          const uploadRes = await imageService.uploadProfileImage(photoUri);
          if (uploadRes?.imageUrl) {
            uploadedPhotoUrl = uploadRes.imageUrl;
          }
        } catch (uploadErr) {
          console.error('Error uploading photo:', uploadErr);
        } finally {
          setUploadingPhoto(false);
        }
      }

      const payload: any = {
        name,
        birthDate: birthDate.toISOString(),
        photos: uploadedPhotoUrl ? [uploadedPhotoUrl] : [],
      };
      if (GENDERS[selectedGender]) payload.gender = GENDERS[selectedGender];
      if (country.trim()) payload.country = country.trim();
      if (aboutMe.trim()) payload.aboutMe = aboutMe.trim();

      await profileService.createProfile(payload);
      setHasProfile(true);
      router.replace('/(tabs)/chats');
    } catch (e: any) {
      let rawMsg = e.response?.data?.message || 'Error al crear perfil';
      if (Array.isArray(rawMsg)) {
        rawMsg = rawMsg.join('\n');
      } else if (typeof rawMsg === 'object') {
        rawMsg = JSON.stringify(rawMsg);
      }
      Alert.alert('Error', String(rawMsg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Crea tu Perfil</Text>
            <Text style={styles.subtitle}>Queremos conocerte</Text>
            
            {/* Avatar selector */}
            <View style={styles.photoContainer}>
              <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickPhoto}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color="#3B7BC0" />
                    <Text style={styles.avatarPlaceholderText}>Foto de perfil</Text>
                  </View>
                )}
                <View style={styles.addBadge}>
                  <Ionicons name="add" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>

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
              value={aboutMe} 
              onChangeText={setAboutMe} 
              placeholder="Cuéntanos algo sobre ti..." 
              multiline 
              maxLength={500} 
            />
            
            <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading || uploadingPhoto}>
              {loading || uploadingPhoto ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Comenzar</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
  container: { flex: 1, backgroundColor: '#6BB8E0' },
  scrollContent: { padding: 20, flexGrow: 1, paddingBottom: 40 },
  card: { backgroundColor: '#FDFBF5', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#3B7BC0', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#7A7E9A', textAlign: 'center', marginBottom: 20 },
  photoContainer: { alignItems: 'center', marginBottom: 20 },
  avatarWrapper: { width: 100, height: 100, borderRadius: 50, position: 'relative' },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#4B8FD4' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8F4FD', borderWidth: 2, borderColor: '#C8C4D8', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  avatarPlaceholderText: { fontSize: 11, color: '#3B7BC0', fontWeight: 'bold', marginTop: 2 },
  addBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#4B8FD4', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FDFBF5' },
  label: { fontSize: 14, color: '#2A2E4A', marginBottom: 8, fontWeight: 'bold' },
  input: { backgroundColor: '#FDFBF5', borderWidth: 2, borderColor: '#C8C4D8', borderRadius: 16, padding: 12, fontSize: 16, marginBottom: 16 },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDFBF5', borderWidth: 2, borderColor: '#C8C4D8', borderRadius: 16, padding: 14, marginBottom: 16 },
  dateText: { fontSize: 16, color: '#2A2E4A', fontWeight: '600' },
  countrySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDFBF5', borderWidth: 2, borderColor: '#C8C4D8', borderRadius: 16, padding: 14, marginBottom: 16 },
  countryText: { fontSize: 16, color: '#2A2E4A', fontWeight: '600' },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  genderBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: '#C8C4D8', backgroundColor: '#FDFBF5' },
  genderBtnActive: { borderColor: '#4B8FD4', backgroundColor: '#E8F4FD' },
  genderBtnText: { fontSize: 14, color: '#7A7E9A', fontWeight: '600' },
  genderBtnTextActive: { color: '#3B7BC0' },
  button: { backgroundColor: '#4B8FD4', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 4, marginTop: 16 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FDFBF5', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#C8C4D8', paddingBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#3B7BC0' },
  countryOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  countryOptionSelected: { backgroundColor: '#E8F4FD' },
  countryOptionText: { fontSize: 16, color: '#2A2E4A' },
  countryOptionTextSelected: { fontWeight: 'bold', color: '#3B7BC0' },
});
