import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Animated, PanResponder, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { profileService } from '../../src/services/profileService';
import { matchService } from '../../src/services/matchService';
import { FeedProfile } from '../../src/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const TOAST_DURATION = 2000;

export default function PersonasFeedScreen() {
  const [profiles, setProfiles] = useState<FeedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'like' | 'nope' } | null>(null);

  const position = useRef(new Animated.ValueXY()).current;
  const swipeDirection = useRef<'none' | 'left' | 'right'>('none');

  const loadFeed = async () => {
    try {
      const data = await profileService.getFeed();
      setProfiles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFeed(); }, []);

  const showToast = (message: string, type: 'like' | 'nope') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), TOAST_DURATION);
  };

  const handleSwipeComplete = (liked: boolean) => {
    if (profiles.length === 0 || swiping) return;
    setSwiping(true);
    const current = profiles[0];

    const toValue = liked ? SCREEN_WIDTH + 150 : -(SCREEN_WIDTH + 150);
    Animated.timing(position, {
      toValue: { x: toValue, y: 0 },
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      // 1. Update UI state immediately
      setProfiles(prev => prev.slice(1));
      position.setValue({ x: 0, y: 0 });
      setSwiping(false);

      if (liked) {
        showToast(`Solicitud enviada a ${current.name}`, 'like');
      }

      // 2. Perform network request in background
      matchService.swipe(current.userId, liked).catch(err => {
        console.error('Error on swipe api:', err);
      });
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10,
      onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) > 10,
      onPanResponderGrant: () => {
        position.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: 0 });
        if (gesture.dx > 40) swipeDirection.current = 'right';
        else if (gesture.dx < -40) swipeDirection.current = 'left';
        else swipeDirection.current = 'none';
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          handleSwipeComplete(true);
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          handleSwipeComplete(false);
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
          swipeDirection.current = 'none';
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
        swipeDirection.current = 'none';
      }
    })
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const currentProfile = profiles[0];
  const nextProfile = profiles[1];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Personas</Text>
      </View>

      <View style={styles.cardStack}>
        {loading ? (
          <ActivityIndicator size="large" color="#4B8FD4" style={{ marginTop: 80 }} />
        ) : currentProfile ? (
          <>
            {/* Next card behind */}
            {nextProfile && (
              <View style={[styles.card, styles.cardBehind]}>
                {nextProfile.photos && nextProfile.photos.length > 0 ? (
                  <Image source={{ uri: nextProfile.photos[0] }} style={styles.cardImage} />
                ) : (
                  <View style={styles.cardImagePlaceholder}>
                    <Ionicons name="person" size={80} color="#C8C4D8" />
                  </View>
                )}
                <View style={styles.cardFooter}>
                  <Text style={styles.cardName}>{nextProfile.name}, {nextProfile.age}</Text>
                </View>
              </View>
            )}

            {/* Current card - swipeable */}
            <Animated.View
              style={[
                styles.card,
                {
                  transform: [
                    { translateX: position.x },
                    { rotate: rotate },
                  ],
                },
              ]}
              {...panResponder.panHandlers}
            >
              {/* LIKE overlay */}
              <Animated.View style={[styles.overlayLabel, styles.overlayLike, { opacity: likeOpacity }]}>
                <Ionicons name="heart" size={40} color="#fff" />
                <Text style={styles.overlayText}>LIKE</Text>
              </Animated.View>

              {/* NOPE overlay */}
              <Animated.View style={[styles.overlayLabel, styles.overlayNope, { opacity: nopeOpacity }]}>
                <Ionicons name="close" size={40} color="#fff" />
                <Text style={styles.overlayText}>NOPE</Text>
              </Animated.View>

              {currentProfile.photos && currentProfile.photos.length > 0 ? (
                <Image source={{ uri: currentProfile.photos[0] }} style={styles.cardImage} />
              ) : (
                <View style={styles.cardImagePlaceholder}>
                  <Ionicons name="person" size={80} color="#C8C4D8" />
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.cardName}>{currentProfile.name}, {currentProfile.age}</Text>
                {currentProfile.country && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color="#FDFBF5" style={{ marginRight: 4 }} />
                    <Text style={styles.cardSubtext}>{currentProfile.country}</Text>
                  </View>
                )}
                {currentProfile.aboutMe && (
                  <Text style={styles.cardAbout} numberOfLines={3}>{currentProfile.aboutMe}</Text>
                )}
                <View style={styles.detailsRow}>
                  {currentProfile.height && (
                    <View style={styles.detailChip}>
                      <Ionicons name="resize-outline" size={14} color="#3B7BC0" />
                      <Text style={styles.chipText}>{currentProfile.height} cm</Text>
                    </View>
                  )}
                  {currentProfile.education && (
                    <View style={styles.detailChip}>
                      <Ionicons name="school-outline" size={14} color="#3B7BC0" />
                      <Text style={styles.chipText}>{currentProfile.education}</Text>
                    </View>
                  )}
                  {currentProfile.gender && (
                    <View style={styles.detailChip}>
                      <Ionicons name="person-outline" size={14} color="#3B7BC0" />
                      <Text style={styles.chipText}>{currentProfile.gender}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Animated.View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="sunny-outline" size={64} color="#7A7E9A" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No hay más personas por ahora.</Text>
            <Text style={styles.emptySubtext}>¡Vuelve más tarde!</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={() => { setLoading(true); loadFeed(); }}>
              <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.refreshBtnText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>


      {/* Toast notification */}
      {toast && (
        <Animated.View style={[styles.toastContainer, toast.type === 'like' ? styles.toastLike : styles.toastNope]}>
          <Ionicons name={toast.type === 'like' ? 'paper-plane-outline' : 'close-circle-outline'} size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#4B8FD4' },
  cardStack: { flex: 1, width: '100%', position: 'relative', alignItems: 'center', justifyContent: 'center' },
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 24,
    height: '95%',
    backgroundColor: '#FDFBF5',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#2A2E4A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardBehind: { transform: [{ scale: 0.95 }], opacity: 0.7, zIndex: -1 },
  cardImage: { width: '100%', flex: 1, resizeMode: 'cover' },
  cardImagePlaceholder: { width: '100%', flex: 1, backgroundColor: '#E8F4FD', justifyContent: 'center', alignItems: 'center' },
  cardFooter: {
    backgroundColor: 'rgba(42,46,74,0.85)',
    padding: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  cardName: { fontSize: 24, fontWeight: 'bold', color: '#FDFBF5' },
  cardSubtext: { fontSize: 14, color: '#FDFBF5', opacity: 0.9 },
  cardAbout: { fontSize: 14, color: '#FDFBF5', opacity: 0.85, marginTop: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  detailChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, gap: 4 },
  chipText: { fontSize: 12, color: '#FDFBF5', fontWeight: '600' },
  overlayLabel: { position: 'absolute', top: 40, zIndex: 10, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  overlayLike: { right: 20, backgroundColor: 'rgba(91,191,107,0.9)' },
  overlayNope: { left: 20, backgroundColor: 'rgba(217,79,79,0.9)' },
  overlayText: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingBottom: 16, paddingTop: 8 },
  actionBtn: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', borderWidth: 3, backgroundColor: '#FDFBF5', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  rejectBtn: { borderColor: '#D94F4F' },
  acceptBtn: { borderColor: '#5BBF6B' },
  emptyContainer: { alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#2A2E4A', fontWeight: 'bold', textAlign: 'center' },
  emptySubtext: { fontSize: 16, color: '#7A7E9A', marginTop: 8, textAlign: 'center' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4B8FD4', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20 },
  refreshBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  toastContainer: { position: 'absolute', bottom: 40, left: 20, right: 20, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 },
  toastLike: { backgroundColor: '#5BBF6B' },
  toastNope: { backgroundColor: '#D94F4F' },
  toastText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
