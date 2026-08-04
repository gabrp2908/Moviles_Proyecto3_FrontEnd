import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { chatService } from '../../src/services/chatService';
import { useSocket } from '../../src/context/SocketContext';
import { useAuth } from '../../src/context/AuthContext';
import { ChatListItem } from '../../src/types';

export default function ChatsScreen() {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { onlineUsers } = useSocket();
  const { user } = useAuth();

  const loadChats = async () => {
    try {
      const data = await chatService.getChats();
      setChats(Array.isArray(data) ? data : []);
      setFilteredChats(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadChats(); }, []);

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
        // participants is string[] — get the other user's ID
        const otherUserId = c.participants.find((p: string) => p !== user?.userId);
        // We don't have the name here, so filter by ID or last message content
        return c.lastMessage?.content?.toLowerCase().includes(text.toLowerCase()) || false;
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
    const isOnline = otherUserId ? onlineUsers[otherUserId] : false;
    const initial = otherUserId ? otherUserId.charAt(0).toUpperCase() : '?';
    
    return (
      <TouchableOpacity style={styles.itemCard} onPress={() => router.push(`/(tabs)/chat/${item.id}` as any)}>
        <View>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
          {isOnline && <View style={styles.onlineBadge} />}
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>Chat</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage?.content || 'Sin mensajes'}</Text>
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
      <Text style={styles.header}>Chats</Text>
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
              <Text style={styles.emptyEmoji}>💬</Text>
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
  header: { fontSize: 24, fontWeight: 'bold', color: '#4B8FD4', padding: 16 },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 16 },
  searchInput: { backgroundColor: '#FDFBF5', borderWidth: 2, borderColor: '#C8C4D8', borderRadius: 16, padding: 12, fontSize: 16 },
  listContent: { paddingHorizontal: 16, flexGrow: 1 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDFBF5', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 2, borderColor: 'rgba(42,46,74,0.12)', shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6BB8E0', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  onlineBadge: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#5BBF6B', borderWidth: 2, borderColor: '#FDFBF5' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2A2E4A' },
  lastMessage: { fontSize: 14, color: '#7A7E9A', marginTop: 4 },
  meta: { alignItems: 'flex-end' },
  time: { fontSize: 12, color: '#7A7E9A', marginBottom: 4 },
  unreadBadge: { backgroundColor: '#D94F4F', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { textAlign: 'center', color: '#2A2E4A', fontSize: 18, fontWeight: 'bold' },
  emptySubtext: { textAlign: 'center', color: '#7A7E9A', fontSize: 16, marginTop: 8 },
});
