import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import VideoCard from '../components/VideoCard';
import { COLORS, formatViews } from '../lib/utils';

export default function ChannelScreen({ route, navigation }: any) {
  const { handle } = route.params;
  const [activeTab, setActiveTab] = useState('videos');
  const [subscribed, setSubscribed] = useState(false);

  const { data: channel, isLoading } = useQuery({
    queryKey: ['channel', handle],
    queryFn: async () => (await api.get(`/channels/${handle}`)).data.data,
  });

  const { data: videos } = useQuery({
    queryKey: ['channel-videos', handle],
    queryFn: async () => (await api.get('/content/feed?limit=12')).data.data?.items || [],
    enabled: !!channel,
  });

  const handleSubscribe = async () => {
    try {
      if (subscribed) {
        await api.delete(`/channels/${handle}/subscribe`);
      } else {
        await api.post(`/channels/${handle}/subscribe`);
      }
      setSubscribed(!subscribed);
    } catch {}
  };

  if (isLoading || !channel) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: COLORS.textMuted }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Banner */}
      <View style={styles.banner} />

      {/* Channel info */}
      <View style={styles.channelInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {channel.channel_name?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.channelName}>{channel.channel_name}</Text>
          <Text style={styles.handle}>@{channel.handle}</Text>
          <Text style={styles.subs}>{formatViews(channel.subscriber_count)} subscribers</Text>
        </View>
        <TouchableOpacity
          style={[styles.subBtn, subscribed && styles.subBtnActive]}
          onPress={handleSubscribe}
        >
          <Text style={[styles.subBtnText, subscribed && styles.subBtnTextActive]}>
            {subscribed ? 'Subscribed ✓' : 'Subscribe'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Description */}
      {channel.description && (
        <Text style={styles.description} numberOfLines={3}>{channel.description}</Text>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {['videos', 'about'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'videos' && (
        <View style={styles.videosGrid}>
          {!videos?.length ? (
            <Text style={styles.emptyText}>No videos yet</Text>
          ) : (
            <View style={styles.videoRows}>
              {videos.map((_: any, i: number) => {
                if (i % 2 !== 0) return null;
                return (
                  <View key={i} style={styles.videoRow}>
                    <VideoCard content={videos[i]} />
                    {videos[i + 1] && <VideoCard content={videos[i + 1]} />}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {activeTab === 'about' && (
        <View style={styles.about}>
          {[
            { label: 'Channel', value: channel.channel_name },
            { label: 'Handle', value: `@${channel.handle}` },
            { label: 'Subscribers', value: formatViews(channel.subscriber_count) },
            { label: 'Verified', value: channel.is_verified ? '✅ Yes' : 'Not yet' },
          ].map(({ label, value }) => (
            <View key={label} style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>{label}</Text>
              <Text style={styles.aboutValue}>{value}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  backBtn: { padding: 16, paddingBottom: 8 },
  backText: { color: COLORS.electric, fontSize: 14 },
  banner: { height: 120, backgroundColor: '#0c1a2e', marginHorizontal: 16, borderRadius: 14, marginBottom: -40 },
  channelInfo: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: COLORS.bg },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  meta: { flex: 1, paddingBottom: 4 },
  channelName: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  handle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  subs: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  subBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 4 },
  subBtnActive: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: COLORS.border },
  subBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  subBtnTextActive: { color: COLORS.text },
  description: { color: COLORS.textMuted, fontSize: 13, paddingHorizontal: 16, marginBottom: 16, lineHeight: 20 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#fff' },
  tabText: { color: COLORS.textMuted, fontSize: 14 },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  videosGrid: { paddingHorizontal: 16 },
  videoRows: { gap: 16 },
  videoRow: { flexDirection: 'row', gap: 16 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', paddingVertical: 32, fontSize: 14 },
  about: { padding: 16, backgroundColor: COLORS.card, marginHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  aboutLabel: { color: COLORS.textMuted, fontSize: 13 },
  aboutValue: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
});
