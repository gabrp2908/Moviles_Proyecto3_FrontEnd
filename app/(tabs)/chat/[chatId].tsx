import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { chatService } from '../../../src/services/chatService';
import { profileService } from '../../../src/services/profileService';
import { imageService } from '../../../src/services/imageService';
import { socketActions } from '../../../src/services/socketService';
import { useSocket } from '../../../src/context/SocketContext';
import { useAuth } from '../../../src/context/AuthContext';
import { Message, Profile } from '../../../src/types';

export default function ChatDetailScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const { socket, onlineUsers } = useSocket();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const typingTimeout = useRef<any>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!chatId) return;
    loadInitialData();
    
    if (socket) {
      socketActions.join(chatId);
      
      const handleNewMessage = (msg: Message) => {
        if (msg.chatId === chatId) {
          setMessages(prev => [msg, ...prev]);
          chatService.markAsRead(chatId);
        }
      };

      const handleTyping = (data: { chatId: string, userId: string }) => {
        if (data.chatId === chatId && data.userId !== user?.userId) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 2000);
        }
      };

      socket.on('message:new', handleNewMessage);
      socket.on('typing:status', handleTyping);

      return () => {
        socket.off('message:new', handleNewMessage);
        socket.off('typing:status', handleTyping);
        socketActions.leave(chatId);
        chatService.markAsRead(chatId);
      };
    }
  }, [chatId, socket]);

  const loadInitialData = async () => {
    if (!chatId) return;
    try {
      // 1. Load Messages
      const data = await chatService.getMessages(chatId);
      const msgs = data.messages || data;
      setMessages(Array.isArray(msgs) ? msgs.reverse() : []);
      chatService.markAsRead(chatId);

      // 2. Load Chat Info to get other user profile
      const allChats = await chatService.getChats();
      const currentChat = Array.isArray(allChats) ? allChats.find(c => c.id === chatId) : null;
      if (currentChat) {
        const otherId = currentChat.participants.find(p => p !== user?.userId);
        if (otherId) {
          setOtherUserId(otherId);
          const profile = await profileService.getProfile(otherId);
          setOtherProfile(profile);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = () => {
    if (!text.trim() || !chatId) return;
    socketActions.sendMessage(chatId, text.trim());
    setText('');
  };

  const handlePickImage = async () => {
    if (!chatId) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const uploadResult = await imageService.uploadChatImage(result.assets[0].uri);
        socketActions.sendMessage(chatId, '', 'image', uploadResult.imageUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleTextChange = (val: string) => {
    setText(val);
    if (!chatId) return;
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    socketActions.typing(chatId, true);
    typingTimeout.current = setTimeout(() => {
      socketActions.typing(chatId, false);
    }, 300);
  };

  const formatTime = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.userId;
    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowThem]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {item.type === 'image' && item.imageUrl && (
            <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
          )}
          {!!item.content && <Text style={styles.messageText}>{item.content}</Text>}
          <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  const isOnline = otherUserId ? onlineUsers[otherUserId] : false;
  const displayName = otherProfile?.name || 'Usuario';
  const displayPhoto = otherProfile?.photos?.[0];
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#2A2E4A" />
        </TouchableOpacity>
        
        <View style={styles.headerProfileInfo}>
          <View style={styles.avatarMini}>
            {displayPhoto ? (
              <Image source={{ uri: displayPhoto }} style={styles.avatarMiniImage} />
            ) : (
              <Text style={styles.avatarMiniText}>{initial}</Text>
            )}
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{displayName}</Text>
            {isTyping ? (
              <Text style={styles.typingIndicator}>escribiendo...</Text>
            ) : (
              <Text style={[styles.statusText, isOnline && styles.statusOnline]}>
                {isOnline ? 'En línea' : 'Desconectado'}
              </Text>
            )}
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderItem}
          inverted
          contentContainerStyle={styles.listContent}
        />
        
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator size="small" color="#4B8FD4" />
            ) : (
              <Ionicons name="image-outline" size={24} color="#7A7E9A" />
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            value={text}
            onChangeText={handleTextChange}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 10, backgroundColor: '#FDFBF5', borderBottomWidth: 1, borderBottomColor: '#C8C4D8' },
  headerProfileInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatarMini: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6BB8E0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 12 },
  avatarMiniImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarMiniText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  headerCenter: { justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#2A2E4A' },
  statusText: { fontSize: 12, color: '#7A7E9A' },
  statusOnline: { color: '#5BBF6B' },
  typingIndicator: { fontSize: 12, color: '#5BBF6B', fontStyle: 'italic' },
  keyboardAvoid: { flex: 1 },
  listContent: { padding: 16 },
  messageRow: { flexDirection: 'row', marginBottom: 12 },
  messageRowMe: { justifyContent: 'flex-end' },
  messageRowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
  bubbleMe: { backgroundColor: '#B8E8C4', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#B8D4F0', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 16, color: '#2A2E4A' },
  messageImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 8, resizeMode: 'cover' },
  timeText: { fontSize: 10, color: '#7A7E9A', alignSelf: 'flex-end', marginTop: 4 },
  inputContainer: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 12, backgroundColor: '#FDFBF5', borderTopWidth: 1, borderTopColor: '#C8C4D8', alignItems: 'center' },
  attachBtn: { padding: 8, marginRight: 4 },
  input: { flex: 1, backgroundColor: '#F5F0E8', borderWidth: 1, borderColor: '#C8C4D8', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4B8FD4', justifyContent: 'center', alignItems: 'center', marginLeft: 8, shadowColor: '#2A2E4A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 0, elevation: 2 },
});
