import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, ActivityIndicator, Image } from 'react-native';
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
      setProfiles(Array.isArray(data) ? data : []);
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
      const res = await matchService.swipe(current.userId, liked);
      if (res.matched) {
        setCurrentMatchId(res.matchId || null);
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
        ) : currentProfile ? (
          <View style={styles.card}>
            {currentProfile.photos && currentProfile.photos.length > 0 && (
              <Image source={{ uri: currentProfile.photos[0] }} style={styles.cardImage} />
            )}
            <View style={styles.cardHeader}>
              <Text style={styles.cardName}>{currentProfile.name}, {currentProfile.age}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.infoText}>{currentProfile.aboutMe || 'Sin descripción'}</Text>
              {currentProfile.country && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color="#7A7E9A" style={{ marginRight: 6 }} />
                  <Text style={styles.infoSubtext}>{currentProfile.country}</Text>
                </View>
              )}
              {currentProfile.height && (
                <View style={styles.infoRow}>
                  <Ionicons name="resize-outline" size={16} color="#7A7E9A" style={{ marginRight: 6 }} />
                  <Text style={styles.infoSubtext}>{currentProfile.height} cm</Text>
                </View>
              )}
              {currentProfile.education && (
                <View style={styles.infoRow}>
                  <Ionicons name="school-outline" size={16} color="#7A7E9A" style={{ marginRight: 6 }} />
                  <Text style={styles.infoSubtext}>{currentProfile.education}</Text>
                </View>
              )}
              
              {currentProfile.languages && currentProfile.languages.length > 0 && (
                <View style={styles.chips}>
                  {currentProfile.languages.map((l: string) => (
                    <View key={l} style={styles.chip}><Text style={styles.chipText}>{l}</Text></View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="sunny-outline" size={48} color="#7A7E9A" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No hay más personas por ahora.</Text>
            <Text style={styles.emptySubtext}>¡Vuelve más tarde!</Text>
          </View>
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
            <Ionicons name="sparkles" size={56} color="#E8C845" style={{ marginBottom: 12 }} />
            <Text style={styles.modalTitle}>¡Es un match!</Text>
            <Text style={styles.modalSubtitle}>Ahora pueden conversar</Text>
            <TouchableOpacity style={styles.button} onPress={() => { setMatchModalVisible(false); if(currentMatchId) router.push(`/(tabs)/chat/${currentMatchId}` as any); }}>
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
  cardImage: { width: '100%', height: 300, resizeMode: 'cover' },
  cardHeader: { backgroundColor: '#6BB8E0', padding: 20, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  cardInfo: { padding: 20 },
  infoText: { fontSize: 16, color: '#2A2E4A', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoSubtext: { fontSize: 14, color: '#7A7E9A' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  chip: { backgroundColor: '#B8D4F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  chipText: { color: '#3B7BC0', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { textAlign: 'center', fontSize: 18, color: '#2A2E4A', fontWeight: 'bold' },
  emptySubtext: { textAlign: 'center', fontSize: 16, color: '#7A7E9A', marginTop: 8 },
  actions: { flexDirection: 'row', justifyContent: 'space-evenly', paddingBottom: 20 },
  actionBtn: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 4 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FDFBF5', borderRadius: 24, padding: 32, alignItems: 'center' },
  modalTitle: { fontSize: 28, fontWeight: 'bold', color: '#3B7BC0', marginBottom: 8 },
  modalSubtitle: { fontSize: 16, color: '#7A7E9A', marginBottom: 24 },
  button: { backgroundColor: '#4B8FD4', borderRadius: 16, padding: 16, alignItems: 'center', width: '100%', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 4 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
