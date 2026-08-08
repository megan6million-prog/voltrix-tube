import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { COLORS, formatViews, formatUGX, timeAgo } from '../lib/utils';
import { useAppStore } from '../store/app.store';

export default function StudioScreen({ navigation }: any) {
  const { user } = useAppStore();

  const { data: earnings } = useQuery({
    queryKey: ['creator-earnings'],
    queryFn: async () => (await api.get('/channels/me/earnings')).data.data,
  });

  const { data: analytics } = useQuery({
    queryKey: ['creator-analytics'],
    queryFn: async () => (await api.get('/channels/me/analytics')).data.data,
  });

  const { data: recentVideos } = useQuery({
    queryKey: ['my-videos'],
    queryFn: async () => (await api.get('/content/feed?limit=5')).data.data?.items || [],
  });

  const stats = [
    { label: 'Views', value: formatViews(analytics?.views || 0), icon: '👁', color: COLORS.electric },
    { label: 'Subscribers', value: formatViews(analytics?.subscribers || 0), icon: '👥', color: '#a78bfa' },
    { label: 'Available', value: formatUGX(earnings?.available_ugx || 0), icon: '💰', color: COLORS.green },
    { label: 'Pending', value: formatUGX(earnings?.pending_ugx || 0), icon: '⏳', color: COLORS.yellow },
  ];

  const quickActions = [
    { icon: '⬆️', label: 'Upload', onPress: () => navigation.navigate('Upload') },
    { icon: '🔴', label: 'Go Live', onPress: () => navigation.navigate('GoLive') },
    { icon: '📊', label: 'Analytics', onPress: () => {} },
    { icon: '💸', label: 'Earnings', onPress: () => navigation.navigate('Earnings') },
  ];

  const earningTypes = [
    { type: 'Ad Revenue', cut: '55%', status: '✅' },
    { type: 'Tips', cut: '90%', status: '✅' },
    { type: 'Memberships', cut: '75%', status: '✅' },
    { type: 'Pay-Per-View', cut: '70%', status: '✅' },
    { type: 'Movie Referral', cut: '10% per sale', status: '✅' },
    { type: 'Sports Referral', cut: '8% per PPV', status: '✅' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Creator Studio</Text>
          <Text style={styles.handle}>@{user?.username}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>⚡ Creator</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        {stats.map(({ label, value, icon, color }) => (
          <View key={label} style={styles.statCard}>
            <Text style={styles.statIcon}>{icon}</Text>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Quick actions */}
      <View style={styles.actionsGrid}>
        {quickActions.map(({ icon, label, onPress }) => (
          <TouchableOpacity key={label} style={styles.actionCard} onPress={onPress}>
            <Text style={styles.actionIcon}>{icon}</Text>
            <Text style={styles.actionLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Withdraw button */}
      <TouchableOpacity
        style={styles.withdrawBtn}
        onPress={() => navigation.navigate('Earnings')}
      >
        <Text style={styles.withdrawBtnText}>
          💸 Withdraw {formatUGX(earnings?.available_ugx || 0)} to Mobile Money
        </Text>
      </TouchableOpacity>

      {/* Recent videos */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Videos</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {!recentVideos?.length ? (
          <View style={styles.emptyVideos}>
            <Text style={styles.emptyIcon}>🎬</Text>
            <Text style={styles.emptyText}>No videos yet</Text>
            <TouchableOpacity style={styles.uploadPromptBtn} onPress={() => navigation.navigate('Upload')}>
              <Text style={styles.uploadPromptText}>Upload your first video</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentVideos.map((v: any) => (
            <View key={v.id} style={styles.videoRow}>
              <View style={styles.videoThumb}>
                <Text style={{ fontSize: 20 }}>🎬</Text>
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={1}>{v.title}</Text>
                <Text style={styles.videoMeta}>
                  {formatViews(v.view_count)} views · {v.processing_status}
                </Text>
              </View>
              <View style={[styles.statusDot,
                { backgroundColor: v.processing_status === 'ready' ? COLORS.green : COLORS.yellow }
              ]} />
            </View>
          ))
        )}
      </View>

      {/* How you earn */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How You Earn</Text>
        <View style={styles.earningsTable}>
          {earningTypes.map(({ type, cut, status }) => (
            <View key={type} style={styles.earningRow}>
              <Text style={styles.earningType}>{type}</Text>
              <Text style={styles.earningCut}>{cut}</Text>
              <Text style={styles.earningStatus}>{status}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  handle: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  roleBadge: { backgroundColor: 'rgba(56,189,248,0.15)', borderWidth: 1, borderColor: 'rgba(56,189,248,0.3)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  roleBadgeText: { color: COLORS.electric, fontSize: 12, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, alignItems: 'center', gap: 4 },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { color: COLORS.textMuted, fontSize: 11 },
  actionsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, alignItems: 'center', gap: 6 },
  actionIcon: { fontSize: 24 },
  actionLabel: { color: COLORS.text, fontSize: 12, fontWeight: '500' },
  withdrawBtn: { backgroundColor: COLORS.green, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 20 },
  withdrawBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  seeAll: { color: COLORS.electric, fontSize: 13 },
  emptyVideos: { alignItems: 'center', padding: 24, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  uploadPromptBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  uploadPromptText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  videoThumb: { width: 56, height: 40, borderRadius: 8, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  videoInfo: { flex: 1 },
  videoTitle: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
  videoMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  earningsTable: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  earningRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  earningType: { flex: 1, color: COLORS.text, fontSize: 13 },
  earningCut: { color: COLORS.green, fontSize: 13, fontWeight: '600', marginRight: 12 },
  earningStatus: { fontSize: 14 },
});
