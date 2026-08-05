import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ActivityIndicator, Image, Animated, PanResponder, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { matchService } from '../../src/services/matchService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;

interface SwipeableItemProps {
  item: any;
  onAccept: (userId: string) => void;
  onReject: (userId: string) => void;
}

function SwipeableNotificationItem({ item, onAccept, onReject }: SwipeableItemProps) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 15,
      onPanResponderMove: (_, gesture) => {
        translateX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          // Swipe right -> accept
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onAccept(item.userId));
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          // Swipe left -> reject
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onReject(item.userId));
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const acceptBgOpacity = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const rejectBgOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const initial = item.name?.[0]?.toUpperCase() || '?';
  const hasPhoto = item.photos && item.photos.length > 0;

  return (
    <View style={styles.swipeContainer}>
      {/* Background indicators */}
      <Animated.View style={[styles.swipeBg, styles.swipeBgAccept, { opacity: acceptBgOpacity }]}>
        <Ionicons name="checkmark-circle" size={32} color="#fff" />
        <Text style={styles.swipeBgText}>Aceptar</Text>
      </Animated.View>
      <Animated.View style={[styles.swipeBg, styles.swipeBgReject, { opacity: rejectBgOpacity }]}>
        <Text style={styles.swipeBgText}>Rechazar</Text>
        <Ionicons name="close-circle" size={32} color="#fff" />
      </Animated.View>

      {/* Swipeable card */}
      <Animated.View
        style={[styles.itemCard, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.avatarWrap}>
          {hasPhoto ? (
            <Image source={{ uri: item.photos[0] }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name || 'Desconocido'}{item.age ? `, ${item.age}` : ''}</Text>
          <Text style={styles.subtitle}>Quiere conocerte</Text>
          {item.country && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color="#7A7E9A" style={{ marginRight: 3 }} />
              <Text style={styles.locationText}>{item.country}</Text>
            </View>
          )}
        </View>
        <View style={styles.swipeHint}>
          <Ionicons name="swap-horizontal-outline" size={20} color="#C8C4D8" />
        </View>
      </Animated.View>
    </View>
  );
}

export default function NotificationsScreen() {
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

  const handleAccept = async (userId: string) => {
    try {
      const res = await matchService.swipe(userId, true);
      setLikes(prev => prev.filter(l => l.userId !== userId));
      if (res.matched && res.matchId) {
        setCurrentMatchId(res.matchId);
        setMatchModalVisible(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await matchService.swipe(userId, false);
      setLikes(prev => prev.filter(l => l.userId !== userId));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with back button */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#3B7BC0" />
        </TouchableOpacity>
        <Text style={styles.header}>Notificaciones</Text>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.helperText}>Desliza a la derecha para aceptar, a la izquierda para rechazar</Text>

      {loading && !refreshing ? <ActivityIndicator size="large" color="#4B8FD4" style={{ marginTop: 20 }} /> : (
        <FlatList
          data={likes}
          keyExtractor={(item, index) => item.id || item.userId || index.toString()}
          renderItem={({ item }) => (
            <SwipeableNotificationItem
              item={item}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={48} color="#7A7E9A" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>Sin notificaciones nuevas</Text>
              <Text style={styles.emptySubtext}>Cuando alguien quiera conocerte, aparecerá aquí</Text>
            </View>
          }
        />
      )}

      {/* Match Modal */}
      <Modal visible={matchModalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalCard}>
            <Ionicons name="sparkles" size={56} color="#E8C845" style={{ marginBottom: 12 }} />
            <Text style={styles.modalTitle}>¡Es un match!</Text>
            <Text style={styles.modalSubtitle}>Ahora pueden conversar</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setMatchModalVisible(false);
                if (currentMatchId) router.push(`/(tabs)/chat/${currentMatchId}` as any);
              }}
            >
              <Text style={styles.buttonText}>Ir al chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: '#7A7E9A', marginTop: 10 }]} onPress={() => setMatchModalVisible(false)}>
              <Text style={styles.buttonText}>Seguir viendo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FDFBF5', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)' },
  header: { fontSize: 22, fontWeight: 'bold', color: '#4B8FD4' },
  helperText: { textAlign: 'center', fontSize: 13, color: '#7A7E9A', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  listContent: { paddingHorizontal: 16, flexGrow: 1 },
  swipeContainer: { marginBottom: 12, position: 'relative', height: 80 },
  swipeBg: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  swipeBgAccept: { backgroundColor: '#5BBF6B', justifyContent: 'flex-start' },
  swipeBgReject: { backgroundColor: '#D94F4F', justifyContent: 'flex-end' },
  swipeBgText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginHorizontal: 8 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDFBF5', borderRadius: 16, padding: 12, borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, height: 80 },
  avatarWrap: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#6BB8E0', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 52, height: 52 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2A2E4A' },
  subtitle: { fontSize: 13, color: '#5BBF6B', fontWeight: '600', marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  locationText: { fontSize: 12, color: '#7A7E9A' },
  swipeHint: { paddingLeft: 8 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { textAlign: 'center', color: '#2A2E4A', fontSize: 18, fontWeight: 'bold' },
  emptySubtext: { textAlign: 'center', color: '#7A7E9A', fontSize: 14, marginTop: 8, paddingHorizontal: 20 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FDFBF5', borderRadius: 24, padding: 32, alignItems: 'center' },
  modalTitle: { fontSize: 28, fontWeight: 'bold', color: '#3B7BC0', marginBottom: 8 },
  modalSubtitle: { fontSize: 16, color: '#7A7E9A', marginBottom: 24 },
  button: { backgroundColor: '#4B8FD4', borderRadius: 16, padding: 16, alignItems: 'center', width: '100%', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 4 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
