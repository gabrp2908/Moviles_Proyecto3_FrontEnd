import React, { useEffect, useState, useCallback } from 'react';
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
      setLikes(Array.isArray(data) ? data : []);
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
      setLikes(prev => prev.filter(l => l.userId !== userId));
      if (res.matched) {
        setCurrentMatchId(res.matchId || null);
        setMatchModalVisible(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.itemCard}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.[0] || '?'}</Text></View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name || 'Desconocido'}</Text>
        <Text style={styles.subtitle}>Quiere conocerte</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#D94F4F' }]} onPress={() => handleAction(item.userId, false)}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#5BBF6B' }]} onPress={() => handleAction(item.userId, true)}>
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
          keyExtractor={(item, index) => item.id || item.userId || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💝</Text>
              <Text style={styles.emptyText}>Sin notificaciones nuevas</Text>
            </View>
          }
        />
      )}

      <Modal visible={matchModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🎉</Text>
            <Text style={styles.modalTitle}>¡Es un match!</Text>
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
  header: { fontSize: 24, fontWeight: 'bold', color: '#4B8FD4', padding: 16 },
  listContent: { padding: 16, flexGrow: 1 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDFBF5', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6BB8E0', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2A2E4A' },
  subtitle: { fontSize: 14, color: '#7A7E9A' },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 2 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { textAlign: 'center', color: '#7A7E9A', fontSize: 18 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FDFBF5', borderRadius: 24, padding: 32, alignItems: 'center' },
  modalEmoji: { fontSize: 48, marginBottom: 12 },
  modalTitle: { fontSize: 28, fontWeight: 'bold', color: '#3B7BC0', marginBottom: 20 },
  button: { backgroundColor: '#4B8FD4', borderRadius: 16, padding: 16, alignItems: 'center', width: '100%', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 4 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
