import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import api from '../lib/api';
import { COLORS, formatUGX } from '../lib/utils';
import { useAppStore } from '../store/app.store';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, walletBalance, bonusBalance } = useAppStore();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data.data;
    },
  });

  const handleLogout = async () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('voltrix_access_token');
          await SecureStore.deleteItemAsync('voltrix_refresh_token');
          logout();
        },
      },
    ]);
  };

  const p = profile || user;

  const menuItems = [
    { icon: '🎬', label: 'Creator Studio', onPress: () => navigation.navigate('Studio') },
    { icon: '💰', label: 'Wallet & Payments', onPress: () => navigation.navigate('Wallet') },
    { icon: '🔖', label: 'Library', onPress: () => navigation.navigate('Library') },
    { icon: '👨‍👩‍👧', label: 'Family Controls', onPress: () => navigation.navigate('Family') },
    { icon: '⚙️', label: 'Settings', onPress: () => navigation.navigate('Settings') },
    { icon: '❓', label: 'Help Center', onPress: () => {} },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar + info */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {p?.username?.charAt(0).toUpperCase() || 'V'}
          </Text>
        </View>
        <Text style={styles.username}>@{p?.username}</Text>
        <Text style={styles.role}>{p?.role || 'viewer'} · Uganda 🇺🇬</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatUGX(walletBalance)}</Text>
            <Text style={styles.statLabel}>Wallet</Text>
          </View>
          {bonusBalance > 0 && (
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: COLORS.green }]}>{formatUGX(bonusBalance)}</Text>
              <Text style={styles.statLabel}>Bonus</Text>
            </View>
          )}
          <View style={styles.stat}>
            <Text style={[styles.statValue, { textTransform: 'capitalize' }]}>{p?.role || 'viewer'}</Text>
            <Text style={styles.statLabel}>Role</Text>
          </View>
        </View>
      </View>

      {/* Become a creator CTA */}
      {p?.role === 'viewer' && (
        <TouchableOpacity
          style={styles.creatorCta}
          onPress={() => navigation.navigate('CreateChannel')}
        >
          <Text style={styles.ctaEmoji}>⚡</Text>
          <View style={styles.ctaText}>
            <Text style={styles.ctaTitle}>Become a Creator</Text>
            <Text style={styles.ctaSub}>Start earning from your content today</Text>
          </View>
          <Text style={styles.ctaArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map(({ icon, label, onPress }) => (
          <TouchableOpacity key={label} style={styles.menuItem} onPress={onPress}>
            <Text style={styles.menuIcon}>{icon}</Text>
            <Text style={styles.menuLabel}>{label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Voltrix v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 100 },
  profileCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', marginBottom: 16,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary, alignItems: 'center',
    justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  username: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  role: { color: COLORS.textMuted, fontSize: 13, marginBottom: 20, textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', gap: 24 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.electric },
  statLabel: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
  creatorCta: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)',
    borderRadius: 16, padding: 16, marginBottom: 16,
  },
  ctaEmoji: { fontSize: 24 },
  ctaText: { flex: 1 },
  ctaTitle: { color: COLORS.electric, fontWeight: '700', fontSize: 14 },
  ctaSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  ctaArrow: { color: COLORS.electric, fontSize: 22 },
  menu: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  menuIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  menuLabel: { flex: 1, color: COLORS.text, fontSize: 14 },
  menuArrow: { color: COLORS.textDim, fontSize: 20 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16,
  },
  logoutText: { color: '#f87171', fontWeight: '600', fontSize: 14 },
  version: { color: COLORS.textDim, fontSize: 11, textAlign: 'center' },
});
