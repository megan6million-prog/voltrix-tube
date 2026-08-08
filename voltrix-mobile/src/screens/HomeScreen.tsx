import React, { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import VideoCard from '../components/VideoCard';
import { COLORS } from '../lib/utils';

const CATEGORIES = ['All', 'Trending', 'Movies', 'Sports', 'Gaming', 'Education', 'Comedy', 'Ugandan'];

export default function HomeScreen({ navigation }: any) {
  const [activeCategory, setActiveCategory] = React.useState('All');

  const { data: feedData, isLoading, refetch } = useQuery({
    queryKey: ['feed', activeCategory],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeCategory !== 'All') params.content_type = activeCategory.toLowerCase();
      const res = await api.get('/content/feed', { params });
      return res.data.data?.items || [];
    },
  });

  const { data: liveData } = useQuery({
    queryKey: ['live'],
    queryFn: async () => {
      const res = await api.get('/streams/live?limit=3');
      return res.data.data || [];
    },
  });

  const renderHeader = () => (
    <View>
      {/* Live Now */}
      {liveData && liveData.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.liveDot} />
            <Text style={styles.sectionTitle}>Live Now</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {liveData.map((stream: any) => (
              <TouchableOpacity
                key={stream.id}
                style={styles.liveCard}
                onPress={() => navigation.navigate('Live', { id: stream.id })}
              >
                <View style={styles.liveThumbnail}>
                  <Text style={styles.liveBadge}>🔴 LIVE</Text>
                </View>
                <Text style={styles.liveTitle} numberOfLines={1}>{stream.title}</Text>
                <Text style={styles.liveViewers}>{stream.viewer_count || 0} watching</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={styles.tabsContent}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, activeCategory === cat && styles.tabActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.tabText, activeCategory === cat && styles.tabTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {activeCategory === 'All' ? 'Recommended For You' : activeCategory}
        </Text>
      </View>
    </View>
  );

  const renderItem = ({ item, index }: any) => (
    <View style={index % 2 === 0 ? styles.leftItem : styles.rightItem}>
      <VideoCard content={item} />
    </View>
  );

  const pairs = [];
  const items = feedData || [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push([items[i], items[i + 1]].filter(Boolean));
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pairs}
        keyExtractor={(_, i) => String(i)}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.map((c: any) => (
              <VideoCard key={c.id} content={c} />
            ))}
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎬</Text>
              <Text style={styles.emptyText}>No content yet</Text>
              <Text style={styles.emptySubText}>Be the first to upload!</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  list: { padding: 16, paddingBottom: 80 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  liveCard: { width: 160, marginRight: 12 },
  liveThumbnail: {
    width: 160, height: 90, borderRadius: 10,
    backgroundColor: '#1a0a0a', justifyContent: 'flex-end',
    padding: 8, marginBottom: 6,
  },
  liveBadge: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  liveTitle: { color: COLORS.text, fontSize: 12, fontWeight: '500' },
  liveViewers: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  tabs: { marginBottom: 16 },
  tabsContent: { paddingRight: 16, gap: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: '#000', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  leftItem: { flex: 1 },
  rightItem: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptySubText: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
});
