import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { COLORS, timeAgo, formatUGX } from '../lib/utils';
import { useAppStore } from '../store/app.store';

export default function MessagesScreen({ navigation }: any) {
  const { data: convs } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => (await api.get('/messages/conversations')).data.data?.conversations || [],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.newBtn}>
          <Text style={styles.newBtnText}>✏️</Text>
        </TouchableOpacity>
      </View>

      {!convs?.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptyHint}>Start a conversation with a creator</Text>
        </View>
      ) : (
        <FlatList
          data={convs}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.convRow}
              onPress={() => navigation.navigate('Conversation', { conv: item })}
            >
              <View style={styles.convAvatar}>
                <Text style={styles.convAvatarText}>
                  {item.conversation_type === 'group' ? '👥' :
                   item.conversation_type === 'broadcast' ? '📢' :
                   item.title?.charAt(0) || '?'}
                </Text>
              </View>
              <View style={styles.convInfo}>
                <View style={styles.convTop}>
                  <Text style={styles.convTitle} numberOfLines={1}>
                    {item.title || 'Conversation'}
                  </Text>
                  {item.last_message_at && (
                    <Text style={styles.convTime}>{timeAgo(item.last_message_at)}</Text>
                  )}
                </View>
                {item.last_message_preview && (
                  <Text style={styles.convPreview} numberOfLines={1}>
                    {item.last_message_preview}
                  </Text>
                )}
              </View>
              {item.unread_count > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unread_count}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  newBtn: { padding: 4 },
  newBtnText: { fontSize: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: COLORS.textMuted, fontSize: 13 },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  convAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  convAvatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  convInfo: { flex: 1 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convTitle: { color: COLORS.text, fontWeight: '600', fontSize: 14, flex: 1 },
  convTime: { color: COLORS.textDim, fontSize: 11 },
  convPreview: { color: COLORS.textMuted, fontSize: 12 },
  unreadBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
