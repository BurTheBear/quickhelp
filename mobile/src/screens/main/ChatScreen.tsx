import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from '../../store';
import { chatAPI } from '../../services/api';
import { spacing, radius } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { formatDistanceToNow } from '../../utils/time';

type RouteParams = { requestId: string; requestTitle?: string };

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender?: { id: string; profile?: { displayName?: string } };
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:4000';

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { requestId, requestTitle } = route.params;
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const currentUser = useAppSelector((s) => s.auth.user) as any;
  const token = useAppSelector((s) => s.auth.accessToken) as string | null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  const flatRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load conversation history
  useEffect(() => {
    (async () => {
      try {
        const res = await chatAPI.getConversation(requestId);
        const conv = res.data.data;
        setConversationId(conv.id);
        setMessages(conv.messages ?? []);
      } catch {
        // conversation might not exist yet
      } finally {
        setLoading(false);
      }
    })();
  }, [requestId]);

  // Setup socket connection
  useEffect(() => {
    if (!token) return;

    const socket = io(API_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_request', requestId);
    });

    socket.on('new_message', (msg: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    });

    socket.on('typing_start', ({ userId }: { userId: string }) => {
      if (userId !== currentUser?.id) setOtherTyping(true);
    });

    socket.on('typing_stop', ({ userId }: { userId: string }) => {
      if (userId !== currentUser?.id) setOtherTyping(false);
    });

    return () => {
      socket.emit('leave_request', requestId);
      socket.disconnect();
    };
  }, [token, requestId]);

  const sendMessage = useCallback(async () => {
    const content = text.trim();
    if (!content || sending || !conversationId) return;

    setText('');
    setSending(true);

    // Optimistic message
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      content,
      senderId: currentUser?.id,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      // Send via socket (real-time) if connected, else REST fallback
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', { conversationId, content, type: 'TEXT' });
        // Remove optimistic — socket will broadcast the real one
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      } else {
        await chatAPI.sendMessage(requestId, content);
        // keep optimistic
      }
    } catch {
      // keep optimistic on REST error
    } finally {
      setSending(false);
    }
  }, [text, sending, conversationId, currentUser?.id, requestId]);

  const handleTyping = (val: string) => {
    setText(val);
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_start', { requestId });
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socketRef.current?.emit('typing_stop', { requestId });
      }, 1500);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUser?.id;
    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.sender?.profile?.displayName?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
            {formatDistanceToNow(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{requestTitle ?? 'Chat'}</Text>
          <Text style={styles.headerSub}>Help request conversation</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>Send a message to get started</Text>
            </View>
          }
          ListFooterComponent={
            otherTyping ? (
              <View style={styles.typingRow}>
                <View style={styles.typingBubble}>
                  <Text style={styles.typingDots}>• • •</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={handleTyping}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={18} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) { return StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: c.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.surface },
  backBtn: { marginRight: spacing.md, padding: 4 },
  headerInfo: { flex: 1 },
  headerTitle: { fontWeight: '700', color: c.text, fontSize: 16 },
  headerSub: { fontSize: 11, color: c.textMuted, marginTop: 2 },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.md },
  msgRowMe: { flexDirection: 'row-reverse' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.primary + '30', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  avatarText: { fontSize: 13, fontWeight: '700', color: c.primary },
  bubble: { maxWidth: '75%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.xl, borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: c.primary, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: 4, marginLeft: spacing.sm },
  bubbleThem: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  bubbleText: { fontSize: 15, color: c.text, lineHeight: 21 },
  bubbleTextMe: { color: c.white },
  bubbleTime: { fontSize: 10, color: c.textMuted, marginTop: 3 },
  bubbleTimeMe: { color: c.white + 'AA' },
  typingRow: { flexDirection: 'row', marginBottom: spacing.md },
  typingBubble: { backgroundColor: c.surface, borderRadius: radius.xl, borderBottomLeftRadius: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: c.border },
  typingDots: { fontSize: 16, color: c.textMuted, letterSpacing: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyText: { fontSize: 14, color: c.textMuted },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.md, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface, gap: spacing.sm },
  input: { flex: 1, backgroundColor: c.card, borderRadius: radius.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, fontSize: 15, color: c.text, maxHeight: 100, borderWidth: 1, borderColor: c.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: c.primary + '50' },
}); }
