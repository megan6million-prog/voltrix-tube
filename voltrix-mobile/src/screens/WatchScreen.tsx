import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, Share, Dimensions,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { COLORS, formatViews, timeAgo, formatUGX } from '../lib/utils';
import { useAppStore } from '../store/app.store';

const { width } = Dimensions.get('window');

export default function WatchScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { user } = useAppStore();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [liked, setLiked] = useState(false);

  const { data: content, isLoading } = useQuery({
    queryKey: ['content', id],
    queryFn: async () => (await api.get(`/content/${id}`)).data.data,
  });

  const { data: playback } = useQuery({
    queryKey: ['playback', id],
    queryFn: async () => (await api.get(`/content/${id}/playback`)).data.data,
    enabled: !!content,
    retry: false,
  });

  const { data: commentsData } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => (await api.get(`/content/${id}/comments?limit=20`)).data.data,
  });

  const { data: related } = useQuery({
    queryKey: ['related-feed'],
    queryFn: async () => (await api.get('/content/feed?limit=8')).data.data?.items || [],
  });

  if (isLoading || !content) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>
          {isLoading ? 'Loading...' : 'Content not found'}
        </Text>
      </View>
    );
  }

  const isGated = !playback?.hls_url && (content.ppv_price_ugx || content.rental_price_ugx);

  const handleLike = () => {
    setLiked(!liked);
    api.post(`/content/${id}/react`, { reaction: 'like' }).catch(() => {});
  };

  const handleShare = () => {
    api.post(`/content/${id}/share`, { destination: 'native', share_type: 'full' }).catch(() => {});
    Share.share({ message: `Watch "${content.title}" on Voltrix` });
  };

  const handlePurchase = (type: string) => {
    api.post(`/content/${id}/purchase`, { purchase_type: type, payment_source: 'wallet' })
      .then(() => qc.invalidateQueries({ queryKey: ['playback', id] }))
      .catch(() => Alert.alert('Purchase failed', 'Check your wallet balance'));
  };

  const postComment = () => {
    if (!comment.trim()) return;
    api.post(`/content/${id}/comments`, { body: comment }).then(() => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['comments', id] });
    }).catch(() => {});
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Player area */}
      <View style={styles.player}>
        {isGated ? (
          <View style={styles.paywall}>
            <Text style={{ fontSize: 40 }}>🔒</Text>
            <Text style={styles.paywallTitle}>Premium Content</Text>
            <View style={styles.paywallBtns}>
              {content.rental_price_ugx && (
                <TouchableOpacity style={styles.rentBtn} onPress={() => handlePurchase('rent')}>
                  <Text style={styles.rentBtnText}>Rent {formatUGX(content.rental_price_ugx)}</Text>
                </TouchableOpacity>
              )}
              {content.purchase_price_ugx && (
                <TouchableOpacity style={styles.buyBtn} onPress={() => handlePurchase('buy')}>
                  <Text style={styles.buyBtnText}>Buy {formatUGX(content.purchase_price_ugx)}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : playback?.hls_url ? (
          <View style={styles.videoBox}>
            <Text style={styles.videoPlaceholder}>▶ Video Player</Text>
            <Text style={styles.videoUrl} numberOfLines={1}>{playback.hls_url}</Text>
          </View>
        ) : (
          <View style={styles.videoBox}>
            <Text style={{ color: COLORS.textMuted }}>
              {content.processing_status === 'pending' ? '⏳ Processing...' : '📺 Unavailable'}
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.infoSection}>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.stats}>
          {formatViews(content.view_count)} views
          {content.published_at ? ` · ${timeAgo(content.published_at)}` : ''}
        </Text>

        {/* Actions */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { icon: liked ? '👍' : '👍', label: formatViews(content.like_count), onPress: handleLike },
            { icon: '↗', label: 'Share', onPress: handleShare },
            { icon: '🔖', label: 'Save', onPress: () => api.post(`/content/${id}/save`).catch(() => {}) },
          ].map(({ icon, label, onPress }) => (
            <TouchableOpacity key={label} style={styles.actionBtn} onPress={onPress}>
              <Text style={styles.actionIcon}>{icon}</Text>
              <Text style={styles.actionLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Channel */}
      <View style={styles.channelRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {content.channel?.channel_name?.charAt(0).toUpperCase() || 'V'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.channelName}>{content.channel?.channel_name}</Text>
          <Text style={styles.channelSubs}>
            {formatViews(content.channel?.subscriber_count || 0)} subscribers
          </Text>
        </View>
        <TouchableOpacity style={styles.subBtn}
          onPress={() => api.post(`/channels/${content.channel?.handle}/subscribe`).catch(() => {})}>
          <Text style={styles.subBtnText}>Subscribe</Text>
        </TouchableOpacity>
      </View>

      {/* Description */}
      {content.description && (
        <View style={styles.desc}>
          <Text style={styles.descText} numberOfLines={3}>{content.description}</Text>
        </View>
      )}

      {/* Comments */}
      <View style={styles.comments}>
        <Text style={styles.sectionTitle}>{formatViews(content.comment_count)} Comments</Text>

        {user && (
          <View style={styles.commentInput}>
            <View style={styles.miniAvatar}>
              <Text style={styles.miniAvatarText}>{user.username?.charAt(0).toUpperCase()}</Text>
            </View>
            <TextInput
              style={styles.commentBox}
              placeholder="Add a comment..."
              placeholderTextColor={COLORS.textDim}
              value={comment}
              onChangeText={setComment}
              onSubmitEditing={postComment}
              returnKeyType="send"
            />
            {comment.length > 0 && (
              <TouchableOpacity onPress={postComment}>
                <Text style={{ color: COLORS.electric, fontSize: 20 }}>→</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {commentsData?.comments?.map((c: any) => (
          <View key={c.id} style={styles.commentRow}>
            <View style={styles.miniAvatar}>
              <Text style={styles.miniAvatarText}>U</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.commentBody}>{c.body}</Text>
              <Text style={styles.commentMeta}>{timeAgo(c.created_at)} · 👍 {c.like_count}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Related */}
      {related?.filter((c: any) => c.id !== id)?.slice(0, 5)?.map((c: any) => (
        <TouchableOpacity
          key={c.id}
          style={styles.relatedRow}
          onPress={() => navigation.replace('Watch', { id: c.id })}
        >
          <View style={styles.relatedThumb}>
            <Text style={{ color: COLORS.textDim, fontSize: 18 }}>▶</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.relatedTitle} numberOfLines={2}>{c.title}</Text>
            <Text style={styles.relatedMeta}>{formatViews(c.view_count)} views</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 80 },
  loading: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  backBtn: { padding: 16, paddingBottom: 8 },
  backText: { color: COLORS.electric, fontSize: 14 },
  player: { width, height: width * 0.5625, backgroundColor: '#000' },
  videoBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  videoPlaceholder: { color: COLORS.textMuted, fontSize: 16 },
  videoUrl: { color: COLORS.textDim, fontSize: 10, paddingHorizontal: 16 },
  paywall: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  paywallTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  paywallBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  rentBtn: { backgroundColor: COLORS.yellow, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  rentBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  buyBtn: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  buyBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  infoSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, lineHeight: 24, marginBottom: 6 },
  stats: { color: COLORS.textMuted, fontSize: 12, marginBottom: 14 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
  },
  actionIcon: { fontSize: 14 },
  actionLabel: { color: COLORS.text, fontSize: 12, fontWeight: '500' },
  channelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  channelName: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  channelSubs: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  subBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  subBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  desc: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  descText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20 },
  comments: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  commentInput: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 12 },
  miniAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  miniAvatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  commentBox: { flex: 1, color: COLORS.text, fontSize: 13 },
  commentRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  commentBody: { color: COLORS.text, fontSize: 13, lineHeight: 20 },
  commentMeta: { color: COLORS.textDim, fontSize: 11, marginTop: 4 },
  relatedRow: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  relatedThumb: { width: 120, height: 68, borderRadius: 8, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  relatedTitle: { color: COLORS.text, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  relatedMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
});
