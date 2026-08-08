import React from 'react';
import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, formatViews, formatDuration, timeAgo } from '../lib/utils';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface Props {
  content: {
    id: string;
    title: string;
    thumbnail_url?: string;
    duration_seconds?: number;
    view_count: number;
    published_at?: string;
    ppv_price_ugx?: number;
    visibility: string;
    channel?: { channel_name: string; avatar_url?: string };
  };
  fullWidth?: boolean;
}

export default function VideoCard({ content, fullWidth = false }: Props) {
  const navigation = useNavigation<any>();
  const cardWidth = fullWidth ? width - 32 : CARD_WIDTH;
  const isGated = content.visibility === 'ppv' || content.visibility === 'members_only';

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      onPress={() => navigation.navigate('Watch', { id: content.id })}
      activeOpacity={0.85}
    >
      {/* Thumbnail */}
      <View style={[styles.thumb, { width: cardWidth, height: cardWidth * 0.5625 }]}>
        {content.thumbnail_url ? (
          <Image source={{ uri: content.thumbnail_url }} style={styles.thumbImg} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Text style={styles.thumbIcon}>▶</Text>
          </View>
        )}

        {/* Duration badge */}
        {content.duration_seconds && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {formatDuration(content.duration_seconds)}
            </Text>
          </View>
        )}

        {/* PPV badge */}
        {content.ppv_price_ugx ? (
          <View style={styles.ppvBadge}>
            <Text style={styles.ppvText}>UGX {content.ppv_price_ugx.toLocaleString()}</Text>
          </View>
        ) : null}

        {/* Lock overlay for gated content */}
        {isGated && (
          <View style={styles.lockOverlay}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {content.channel?.channel_name?.charAt(0).toUpperCase() || 'V'}
          </Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={2}>{content.title}</Text>
          <Text style={styles.sub}>
            {content.channel?.channel_name || 'Voltrix Creator'}
          </Text>
          <Text style={styles.sub}>
            {formatViews(content.view_count)} views
            {content.published_at ? ` · ${timeAgo(content.published_at)}` : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16 },
  thumb: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f1f1f',
  },
  thumbIcon: { fontSize: 28, color: COLORS.textDim },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  ppvBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#eab308',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ppvText: { color: '#000', fontSize: 10, fontWeight: '700' },
  lockOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: { fontSize: 24 },
  info: { flexDirection: 'row', gap: 8, marginTop: 8, paddingHorizontal: 2 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  meta: { flex: 1 },
  title: { color: COLORS.text, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  sub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
});
