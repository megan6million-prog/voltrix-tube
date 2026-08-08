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

export default function SignupScreen({ navigation }: any) {
  const { setUser } = useAppStore();
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!username || !phone || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters');
      return;
    }
    if (!phone.startsWith('+256')) {
      Alert.alert('Invalid phone', 'Phone must start with +256');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/signup', {
        username: username.toLowerCase().trim(),
        phone_primary: phone.trim(),
        password,
      });
      const result = res.data.data;

      // Dev mode — tokens returned immediately
      if (result.skip_otp && result.access_token) {
        await SecureStore.setItemAsync('voltrix_access_token', result.access_token);
        await SecureStore.setItemAsync('voltrix_refresh_token', result.refresh_token);
        setUser(result.user);
        return;
      }

      // Production — go to OTP
      navigation.navigate('VerifyOTP', { phone: phone.trim() });
    } catch (err: any) {
      Alert.alert('Signup failed', err.response?.data?.detail || 'Something went wrong');
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
        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>⚡</Text>
          </View>
          <Text style={styles.logoText}>Voltrix</Text>
          <Text style={styles.tagline}>Join Uganda's video platform</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Free signup — get UGX 10,000 credit</Text>

          {/* Username */}
          <Text style={styles.label}>Username</Text>
          <View style={styles.usernameWrap}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="yourname"
              placeholderTextColor={COLORS.textDim}
              value={username}
              onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
              autoComplete="username"
            />
          </View>
          <Text style={styles.hint}>Lowercase, letters, numbers, underscore only</Text>

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
              placeholder="Min 8 characters"
              placeholderTextColor={COLORS.textDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Create Account</Text>
            }
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.socialBtn}>
            <Text style={styles.socialBtnText}>🔵  Continue with Google</Text>
          </TouchableOpacity>

          <Text style={styles.terms}>
            By signing up you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 28 },
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
  logoText: { fontSize: 28, fontWeight: '900', color: '#38bdf8' },
  tagline: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: COLORS.border,
  },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#22c55e', marginBottom: 20 },
  label: { fontSize: 13, color: COLORS.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: COLORS.text, fontSize: 14, marginBottom: 16,
  },
  usernameWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  atSign: { color: COLORS.textDim, fontSize: 16, paddingHorizontal: 12 },
  hint: { color: COLORS.textDim, fontSize: 11, marginBottom: 16 },
  passwordWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  eyeBtn: { padding: 14, position: 'absolute', right: 0 },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textDim, fontSize: 13 },
  socialBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  socialBtnText: { color: COLORS.text, fontSize: 14 },
  terms: { color: COLORS.textDim, fontSize: 11, textAlign: 'center', marginTop: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: COLORS.textMuted, fontSize: 14 },
  linkText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
});
