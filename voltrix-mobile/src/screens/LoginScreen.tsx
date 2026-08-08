import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAppStore } from '../store/app.store';
import api from '../lib/api';
import { COLORS } from '../lib/utils';

export default function LoginScreen({ navigation }: any) {
  const { setUser } = useAppStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Missing fields', 'Please enter your phone and password');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { phone, password });
      const { access_token, refresh_token, user } = res.data.data;
      await SecureStore.setItemAsync('voltrix_access_token', access_token);
      await SecureStore.setItemAsync('voltrix_refresh_token', refresh_token);
      setUser(user);
    } catch (err: any) {
      Alert.alert('Login failed', err.response?.data?.detail || 'Incorrect phone or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>⚡</Text>
          </View>
          <Text style={styles.logoText}>Voltrix</Text>
          <Text style={styles.tagline}>Uganda's video platform</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          {/* Phone */}
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+256 7XX XXX XXX"
            placeholderTextColor={COLORS.textDim}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
          />

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Your password"
              placeholderTextColor={COLORS.textDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Login button */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Log In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google button */}
          <TouchableOpacity style={styles.socialBtn}>
            <Text style={styles.socialBtnText}>🔵  Continue with Google</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Voltrix? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.linkText}>Create account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoIcon: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: '#050d1a',
    borderWidth: 1, borderColor: '#38bdf8',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 12,
  },
  logoEmoji: { fontSize: 32 },
  logoText: {
    fontSize: 28, fontWeight: '900', letterSpacing: -0.5,
    color: '#38bdf8',
  },
  tagline: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },
  label: { fontSize: 13, color: COLORS.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: COLORS.text, fontSize: 14, marginBottom: 16,
  },
  passwordWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  eyeBtn: { padding: 14, position: 'absolute', right: 0 },
  eyeText: { fontSize: 16 },
  forgotText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'right', marginBottom: 20 },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textDim, fontSize: 13 },
  socialBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingVertical: 14,
    alignItems: 'center',
  },
  socialBtnText: { color: COLORS.text, fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: COLORS.textMuted, fontSize: 14 },
  linkText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
});
