import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAppStore } from '../store/app.store';
import api from '../lib/api';
import { COLORS } from '../lib/utils';

export default function VerifyOTPScreen({ route, navigation }: any) {
  const { phone } = route.params;
  const { setUser } = useAppStore();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { phone, otp: code });
      const { access_token, refresh_token, user } = res.data.data;
      await SecureStore.setItemAsync('voltrix_access_token', access_token);
      await SecureStore.setItemAsync('voltrix_refresh_token', refresh_token);
      setUser(user);
    } catch (err: any) {
      Alert.alert('Invalid code', err.response?.data?.detail || 'Try again');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Auto verify when all 6 filled
  useEffect(() => {
    if (otp.every(d => d !== '')) handleVerify();
  }, [otp]);

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoEmoji}>⚡</Text>
        </View>
        <Text style={styles.logoText}>Voltrix</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Verify your phone</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.phone}>{phone}</Text>
        </Text>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(el) => { if (el) inputRefs.current[i] = el; }}
              style={[styles.otpInput, digit ? styles.otpFilled : null]}
              value={digit}
              onChangeText={(v) => handleChange(i, v)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, (loading || otp.some(d => !d)) && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={loading || otp.some(d => !d)}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Verify</Text>
          }
        </TouchableOpacity>

        <View style={styles.resendWrap}>
          {resendTimer > 0 ? (
            <Text style={styles.resendText}>
              Resend code in <Text style={styles.resendTimer}>{resendTimer}s</Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={() => {
              api.post('/auth/login/otp', { phone }).catch(() => {});
              setResendTimer(60);
            }}>
              <Text style={styles.resendLink}>Resend code</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.devHint}>
          Dev mode: any 6-digit code works (e.g. 123456)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 24, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoIcon: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: '#050d1a', borderWidth: 1, borderColor: '#38bdf8',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoEmoji: { fontSize: 32 },
  logoText: { fontSize: 28, fontWeight: '900', color: '#38bdf8' },
  card: {
    backgroundColor: COLORS.card, borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  phone: { color: COLORS.text, fontWeight: '600' },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  otpInput: {
    width: 46, height: 56, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.text, fontSize: 22, fontWeight: '700',
    textAlign: 'center',
  },
  otpFilled: { borderColor: '#38bdf8' },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', width: '100%',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  resendWrap: { marginTop: 16 },
  resendText: { color: COLORS.textMuted, fontSize: 13 },
  resendTimer: { color: COLORS.text, fontWeight: '600' },
  resendLink: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  devHint: { color: COLORS.textDim, fontSize: 11, marginTop: 16, textAlign: 'center' },
});
