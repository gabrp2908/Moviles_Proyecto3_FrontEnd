import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { chatService } from '../../src/services/chatService';
import { profileService } from '../../src/services/profileService';
import { matchService } from '../../src/services/matchService';
import { useSocket } from '../../src/context/SocketContext';
import { useAuth } from '../../src/context/AuthContext';
import { ChatListItem, Profile } from '../../src/types';

export default function ChatsScreen() {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const router = useRouter();
  const { onlineUsers, socket } = useSocket();
  const { user } = useAuth();

  const loadChats = async () => {
    if (!user) return;
    try {
      // Load chats
      const data = await chatService.getChats();
      const chatsList = Array.isArray(data) ? data : [];
      
      // Sort by last message date, or chat creation date if no messages exist yet
      const sortedList = chatsList.sort((a, b) => {
        const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
        const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });

      setChats(sortedList);
      setFilteredChats(sortedList);

      // Load incoming likes for notifications badge
      const likesData = await matchService.getIncomingLikes();
      if (Array.isArray(likesData)) {
        setUnreadNotifs(likesData.length);
      }

      // Fetch missing profiles
      const missingIds = new Set<string>();
      chatsList.forEach(c => {
        const otherId = c.participants.find(p => p !== user?.userId);
        if (otherId && !profiles[otherId]) {
          missingIds.add(otherId);
        }
      });

      if (missingIds.size > 0) {
        const newProfiles: Record<string, Profile> = {};
        await Promise.all(
          Array.from(missingIds).map(async (id) => {
            try {
              const p = await profileService.getProfile(id);
              if (p) {
                newProfiles[id] = p;
              } else {
                newProfiles[id] = {
                  id,
                  userId: id,
                  name: 'Usuario',
                  photos: [],
                  aboutMe: '',
                  birthDate: '',
                  age: 0,
                  height: null,
                  gender: null,
                  country: '',
                  education: null,
                  languages: []
                };
              }
            } catch (err) {
              console.log('Error fetching profile', id);
            }
          })
        );
        setProfiles(prev => ({ ...prev, ...newProfiles }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload chats every time the screen gains focus (e.g. returning from a chat)
  useFocusEffect(
    useCallback(() => {
      if (user) loadChats();
    }, [user])
  );

  // Listen for new messages via socket to update the list in real-time
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      setChats(prev => {
        const updated = prev.map(chat => {
          if (chat.id === msg.chatId) {
            return {
              ...chat,
              lastMessage: {
                content: msg.content,
                senderId: msg.senderId,
                type: msg.type || 'text',
                createdAt: msg.createdAt,
              },
              updatedAt: msg.createdAt,
              unreadCount: msg.senderId !== user?.userId ? chat.unreadCount + 1 : chat.unreadCount,
            };
          }
          return chat;
        });
        // Move the chat with the new message to the top based on lastMessage createdAt
        updated.sort((a, b) => {
          const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
          const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });
        return updated;
      });
      setFilteredChats(prev => {
        const updated = prev.map(chat => {
          if (chat.id === msg.chatId) {
            return {
              ...chat,
              lastMessage: {
                content: msg.content,
                senderId: msg.senderId,
                type: msg.type || 'text',
                createdAt: msg.createdAt,
              },
              updatedAt: msg.createdAt,
              unreadCount: msg.senderId !== user?.userId ? chat.unreadCount + 1 : chat.unreadCount,
            };
          }
          return chat;
        });
        updated.sort((a, b) => {
          const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
          const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });
        return updated;
      });
    };

    socket.on('newMessage', handleNewMessage);
    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [socket, user?.userId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadChats();
  }, []);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text) {
      setFilteredChats(chats);
    } else {
      setFilteredChats(chats.filter(c => {
        const otherId = c.participants.find(p => p !== user?.userId);
        const nameMatch = otherId && profiles[otherId]?.name?.toLowerCase().includes(text.toLowerCase());
        const msgMatch = c.lastMessage?.content?.toLowerCase().includes(text.toLowerCase());
        return nameMatch || msgMatch;
      }));
    }
  };

  const getOtherUserId = (participants: string[]): string => {
    return participants.find(p => p !== user?.userId) || '';
  };

  const formatTime = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderItem = ({ item }: { item: ChatListItem }) => {
    const otherUserId = getOtherUserId(item.participants);
    const profile = otherUserId ? profiles[otherUserId] : null;
    const isOnline = otherUserId ? onlineUsers[otherUserId] : false;
    
    // Display data
    const displayName = profile?.name || 'Usuario';
    const displayPhoto = profile?.photos?.[0];
    const initial = displayName.charAt(0).toUpperCase();
    
    let previewMessage = item.lastMessage?.content || 'Sin mensajes';
    if (item.lastMessage?.type === 'image') {
      previewMessage = '📷 Imagen';
    }

    return (
      <TouchableOpacity style={styles.itemCard} onPress={() => router.push(`/(tabs)/chat/${item.id}` as any)}>
        <View>
          <View style={styles.avatar}>
            {displayPhoto ? (
              <Image source={{ uri: displayPhoto }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initial}</Text>
            )}
          </View>
          {isOnline && <View style={styles.onlineBadge} />}
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>{previewMessage}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.time}>{formatTime(item.lastMessage?.createdAt)}</Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unreadCount}</Text></View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Chats</Text>
        <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/(tabs)/likes')}>
          <Ionicons name="notifications-outline" size={26} color="#3B7BC0" />
          {unreadNotifs > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadNotifs}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput style={styles.searchInput} placeholder="Buscar chats..." value={search} onChangeText={handleSearch} />
      </View>
      
      {loading && !refreshing ? <ActivityIndicator size="large" color="#4B8FD4" style={{ marginTop: 20 }} /> : (
        <FlatList
          data={filteredChats}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#7A7E9A" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>Aún no hay conversaciones.</Text>
              <Text style={styles.emptySubtext}>¡Ve a Buscar y encuentra a alguien!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#4B8FD4' },
  notifBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FDFBF5', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)', position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#D94F4F', borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  searchInput: { backgroundColor: '#FDFBF5', borderWidth: 2, borderColor: '#C8C4D8', borderRadius: 16, padding: 12, fontSize: 16 },
  listContent: { paddingHorizontal: 16, flexGrow: 1 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDFBF5', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6BB8E0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  onlineBadge: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#5BBF6B', borderWidth: 2, borderColor: '#FDFBF5' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2A2E4A' },
  lastMessage: { fontSize: 14, color: '#7A7E9A', marginTop: 4 },
  meta: { alignItems: 'flex-end' },
  time: { fontSize: 12, color: '#7A7E9A', marginBottom: 4 },
  unreadBadge: { backgroundColor: '#D94F4F', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { textAlign: 'center', color: '#2A2E4A', fontSize: 18, fontWeight: 'bold' },
  emptySubtext: { textAlign: 'center', color: '#7A7E9A', fontSize: 16, marginTop: 8 },
});
