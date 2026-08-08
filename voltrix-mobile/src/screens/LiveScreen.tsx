import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, KeyboardAvoidingView,
  Platform, FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { COLORS, timeAgo, formatUGX } from '../lib/utils';
import { useAppStore } from '../store/app.store';

export default function LiveScreen({ route, navigation }: any) {
  const { id } = route?.params || {};
  const { user } = useAppStore();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const { data: stream, refetch } = useQuery({
    queryKey: ['stream', id],
    queryFn: async () => (await api.get(`/streams/${id}`)).data.data,
    refetchInterval: 10000,
  });

  const { data: chatData } = useQuery({
    queryKey: ['chat', id],
    queryFn: async () => (await api.get(`/streams/${id}/chat?limit=50`)).data.data,
    refetchInterval: 3000,
    enabled: !!id,
  });

  useEffect(() => {
    if (chatData?.messages) setMessages(chatData.messages);
  }, [chatData]);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      await api.post(`/streams/${id}/chat`, { message });
      setMessage('');
    } catch {}
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Player */}
      <View style={styles.player}>
        <View style={styles.playerInner}>
          <Text style={styles.playerIcon}>📡</Text>
          <Text style={styles.playerTitle} numberOfLines={1}>{stream?.title || 'Live Stream'}</Text>
          {stream?.status === 'live' ? (
            <View style={styles.liveBadge}>
              <Text style={styles.liveDot}>🔴</Text>
              <Text style={styles.liveText}>LIVE · {stream.total_viewers || 0} watching</Text>
            </View>
          ) : (
            <Text style={styles.offlineText}>
              {stream?.status === 'scheduled' ? '⏰ Stream not started yet' : '📺 Stream ended'}
            </Text>
          )}
          {stream?.ppv_price_ugx && (
            <TouchableOpacity style={styles.ppvBtn}
              onPress={() => api.post(`/streams/${id}/viewers/join`).catch(() => {})}>
              <Text style={styles.ppvBtnText}>Watch — {formatUGX(stream.ppv_price_ugx)}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Chat */}
      <View style={styles.chatSection}>
        <Text style={styles.chatTitle}>
          💬 Live Chat {stream?.status === 'live' && <Text style={{ color: COLORS.green }}>● Live</Text>}
        </Text>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          style={styles.chatList}
          renderItem={({ item }) => (
            <View style={styles.chatMsg}>
              {item.is_tip && (
                <View style={styles.tipBadge}>
                  <Text style={styles.tipText}>💰 Tipped {formatUGX(item.tip_amount_ugx)}</Text>
                </View>
              )}
              <Text style={styles.chatText}>
                <Text style={styles.chatUser}>@user </Text>
                {item.message}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyChatText}>No messages yet. Say something!</Text>
          }
        />

        {/* Chat input */}
        <View style={styles.chatInput}>
          <TextInput
            style={styles.chatTextInput}
            placeholder="Say something..."
            placeholderTextColor={COLORS.textDim}
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!message.trim()}
          >
            <Text style={styles.sendBtnText}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  backBtn: { padding: 16, paddingBottom: 8 },
  backText: { color: COLORS.electric, fontSize: 14 },
  player: { aspectRatio: 16 / 9, backgroundColor: '#0a0a1a', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  playerInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  playerIcon: { fontSize: 40 },
  playerTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(220,38,38,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  liveDot: { fontSize: 10 },
  liveText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  offlineText: { color: COLORS.textMuted, fontSize: 13 },
  ppvBtn: { backgroundColor: COLORS.yellow, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  ppvBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  chatSection: { flex: 1, padding: 12 },
  chatTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  chatList: { flex: 1 },
  chatMsg: { marginBottom: 8 },
  tipBadge: { backgroundColor: 'rgba(234,179,8,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 4, alignSelf: 'flex-start' },
  tipText: { color: COLORS.yellow, fontSize: 12, fontWeight: '600' },
  chatText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  chatUser: { color: COLORS.electric, fontWeight: '600' },
  emptyChatText: { color: COLORS.textDim, fontSize: 12, textAlign: 'center', paddingTop: 20 },
  chatInput: { flexDirection: 'row', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  chatTextInput: { flex: 1, backgroundColor: COLORS.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.text, fontSize: 13, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
