import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { profileService } from '../../../../src/services/profileService';
import { Profile } from '../../../../src/types';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      try {
        const data = await profileService.getProfile(userId);
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B8FD4" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>No se pudo cargar el perfil.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#3B7BC0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.photosContainer}>
          {profile.photos && profile.photos.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {profile.photos.map((photo, index) => (
                <Image key={index} source={{ uri: photo }} style={styles.photo} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noPhotoPlaceholder}>
              <Ionicons name="person" size={80} color="#C8C4D8" />
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.name}>{profile.name}{profile.age ? `, ${profile.age}` : ''}</Text>
          
          {profile.country && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={18} color="#7A7E9A" style={{ marginRight: 4 }} />
              <Text style={styles.locationText}>{profile.country}</Text>
            </View>
          )}

          <View style={styles.divider} />

          {profile.aboutMe && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Acerca de mí</Text>
              <Text style={styles.aboutText}>{profile.aboutMe}</Text>
            </View>
          )}

          <View style={styles.detailsGrid}>
            {profile.height && (
              <View style={styles.detailChip}>
                <Ionicons name="resize-outline" size={16} color="#3B7BC0" />
                <Text style={styles.chipText}>{profile.height} cm</Text>
              </View>
            )}
            {profile.education && (
              <View style={styles.detailChip}>
                <Ionicons name="school-outline" size={16} color="#3B7BC0" />
                <Text style={styles.chipText}>{profile.education}</Text>
              </View>
            )}
            {profile.gender && (
              <View style={styles.detailChip}>
                <Ionicons name="person-outline" size={16} color="#3B7BC0" />
                <Text style={styles.chipText}>{profile.gender}</Text>
              </View>
            )}
          </View>

          {profile.languages && profile.languages.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Idiomas que hablo</Text>
              <View style={styles.tagsContainer}>
                {profile.languages.map((lang, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>{lang}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  loadingContainer: { flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#4B8FD4' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FDFBF5', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)' },
  scrollContent: { paddingBottom: 40 },
  photosContainer: { height: SCREEN_WIDTH * 1.2, backgroundColor: '#E8F4FD' },
  photo: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.2, resizeMode: 'cover' },
  noPhotoPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  infoContainer: { padding: 24, backgroundColor: '#FDFBF5', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  name: { fontSize: 28, fontWeight: 'bold', color: '#2A2E4A' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  locationText: { fontSize: 16, color: '#7A7E9A' },
  divider: { height: 1, backgroundColor: '#C8C4D8', opacity: 0.5, marginVertical: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#4B8FD4', marginBottom: 8 },
  aboutText: { fontSize: 16, color: '#2A2E4A', lineHeight: 24 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  detailChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F4FD', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderWidth: 1, borderColor: 'rgba(59,123,192,0.2)' },
  chipText: { fontSize: 14, color: '#3B7BC0', fontWeight: '600' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#FDFBF5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#C8C4D8' },
  tagText: { fontSize: 14, color: '#7A7E9A', fontWeight: '600' },
  errorText: { fontSize: 18, color: '#D44040', marginBottom: 16 },
  backBtn: { backgroundColor: '#4B8FD4', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
