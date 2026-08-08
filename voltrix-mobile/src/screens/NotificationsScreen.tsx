import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { COLORS, timeAgo } from '../lib/utils';
import { useAppStore } from '../store/app.store';

const ICONS: Record<string, string> = {
  new_video: '🎬', live_started: '🔴', comment_reply: '💬',
  tip_received: '💰', earning_credited: '✅', payout_completed: '💸',
  membership_joined: '⭐', strike_issued: '⚠️', system: '📢',
};

export default function NotificationsScreen() {
  const { setUnreadCount } = useAppStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications?limit=50')).data.data,
  });

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read', { notification_ids: 'all' }),
    onSuccess: () => {
      setUnreadCount(0);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = data?.notifications || [];
  const unread = notifications.filter((n: any) => !n.is_read);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Notifications {unread.length > 0 && <Text style={styles.unreadCount}>({unread.length})</Text>}
        </Text>
        {unread.length > 0 && (
          <TouchableOpacity onPress={() => markAll.mutate()}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : !notifications.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.notifRow, !item.is_read && styles.notifUnread]}
              onPress={() => api.post('/notifications/read', { notification_ids: [item.id] }).catch(() => {})}
            >
              <Text style={styles.notifIcon}>{ICONS[item.type] || '🔔'}</Text>
              <View style={styles.notifContent}>
                {item.title && <Text style={styles.notifTitle}>{item.title}</Text>}
                {item.body && <Text style={styles.notifBody}>{item.body}</Text>}
                <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
              </View>
              {!item.is_read && <View style={styles.unreadDot} />}
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
  unreadCount: { color: COLORS.primary, fontSize: 16 },
  markAll: { color: COLORS.electric, fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  notifUnread: { backgroundColor: 'rgba(255,255,255,0.04)' },
  notifIcon: { fontSize: 24, marginTop: 2 },
  notifContent: { flex: 1 },
  notifTitle: { color: COLORS.text, fontWeight: '600', fontSize: 14, marginBottom: 3 },
  notifBody: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  notifTime: { color: COLORS.textDim, fontSize: 11, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.electric, marginTop: 6 },
});
