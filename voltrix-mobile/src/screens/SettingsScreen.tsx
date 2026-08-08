import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Alert,
} from 'react-native';
import { COLORS } from '../lib/utils';
import { useAppStore } from '../store/app.store';
import * as SecureStore from 'expo-secure-store';

export default function SettingsScreen({ navigation }: any) {
  const { user, dataSaverMode, setDataSaverMode, logout } = useAppStore() as any;
  const [dataSaver, setDataSaver] = useState(dataSaverMode || false);

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('voltrix_access_token');
          await SecureStore.deleteItemAsync('voltrix_refresh_token');
          logout();
        },
      },
    ]);
  };

  const sections = [
    {
      title: 'Account',
      items: [
        { icon: '👤', label: 'Edit Profile', sub: 'Username, bio, avatar', onPress: () => {} },
        { icon: '🔐', label: 'Security', sub: 'Password, 2FA', onPress: () => {} },
        { icon: '🔗', label: 'Social Links', sub: 'TikTok, YouTube, WhatsApp', onPress: () => {} },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: '🔔', label: 'Notifications', sub: 'Push, SMS alerts', onPress: () => {} },
        { icon: '🌐', label: 'Language', sub: 'English, Luganda, Swahili', onPress: () => {} },
        { icon: '🛡️', label: 'Privacy', sub: 'Who can message you', onPress: () => {} },
      ],
    },
    {
      title: 'Family',
      items: [
        { icon: '👨‍👩‍👧', label: 'Family Controls', sub: 'Link and manage child accounts', onPress: () => navigation.navigate('Family') },
        { icon: '🧒', label: 'Kids Mode', sub: 'Set PIN and enable kids view', onPress: () => {} },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: '❓', label: 'Help Center', sub: 'FAQs and support', onPress: () => {} },
        { icon: '📄', label: 'Terms of Service', onPress: () => {} },
        { icon: '🔒', label: 'Privacy Policy', onPress: () => {} },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Settings</Text>

      {/* Data saver toggle */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleTitle}>Data Saver Mode</Text>
          <Text style={styles.toggleSub}>Lower quality video, saves mobile data</Text>
        </View>
        <Switch
          value={dataSaver}
          onValueChange={(v) => {
            setDataSaver(v);
            if (setDataSaverMode) setDataSaverMode(v);
          }}
          trackColor={{ false: COLORS.border, true: COLORS.green }}
          thumbColor="#fff"
        />
      </View>

      {/* Sections */}
      {sections.map(({ title, items }) => (
        <View key={title} style={styles.section}>
          <Text style={styles.sectionLabel}>{title}</Text>
          <View style={styles.sectionCard}>
            {items.map(({ icon, label, sub, onPress }, i) => (
              <TouchableOpacity
                key={label}
                style={[styles.menuItem, i < items.length - 1 && styles.menuItemBorder]}
                onPress={onPress}
              >
                <Text style={styles.menuIcon}>{icon}</Text>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{label}</Text>
                  {sub && <Text style={styles.menuSub}>{sub}</Text>}
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Sign out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Voltrix v1.0.0 · Uganda 🇺🇬</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 80 },
  backBtn: { padding: 16, paddingBottom: 8 },
  backText: { color: COLORS.electric, fontSize: 14 },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text, paddingHorizontal: 16, marginBottom: 20 },
  toggleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginHorizontal: 16, marginBottom: 20 },
  toggleInfo: { flex: 1 },
  toggleTitle: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  toggleSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  section: { marginBottom: 20, paddingHorizontal: 16 },
  sectionLabel: { color: COLORS.textDim, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  sectionCard: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  menuText: { flex: 1 },
  menuLabel: { color: COLORS.text, fontSize: 14 },
  menuSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },
  menuArrow: { color: COLORS.textDim, fontSize: 20 },
  logoutBtn: { marginHorizontal: 16, backgroundColor: 'rgba(248,113,113,0.1)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16 },
  logoutText: { color: '#f87171', fontWeight: '600', fontSize: 14 },
  version: { color: COLORS.textDim, fontSize: 11, textAlign: 'center' },
});
