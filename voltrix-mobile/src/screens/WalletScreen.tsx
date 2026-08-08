import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { COLORS, formatUGX, timeAgo } from '../lib/utils';
import { useAppStore } from '../store/app.store';

const GATEWAYS = [
  { id: 'mtn', label: 'MTN Mobile Money', emoji: '📱' },
  { id: 'airtel', label: 'Airtel Money', emoji: '📱' },
  { id: 'card', label: 'Visa / Mastercard', emoji: '💳' },
  { id: 'crypto', label: 'Crypto (USDT/BTC)', emoji: '₿' },
];

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000];

export default function WalletScreen() {
  const { walletBalance, bonusBalance, setWalletBalance } = useAppStore();
  const [showTopup, setShowTopup] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(20000);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedGateway, setSelectedGateway] = useState('mtn');
  const [phone, setPhone] = useState('');
  const [topping, setTopping] = useState(false);
  const [topupMsg, setTopupMsg] = useState('');

  const { data: txData, refetch } = useQuery({
    queryKey: ['wallet-txns'],
    queryFn: async () => {
      const [wRes, txRes] = await Promise.all([
        api.get('/wallet'),
        api.get('/wallet/transactions?limit=20'),
      ]);
      setWalletBalance(wRes.data.data.balance_ugx, wRes.data.data.bonus_balance_ugx);
      return txRes.data.data?.transactions || [];
    },
  });

  const handleTopup = async () => {
    const amount = customAmount ? parseInt(customAmount) : selectedAmount;
    if (amount < 1000) { Alert.alert('Minimum UGX 1,000'); return; }
    setTopping(true);
    setTopupMsg('');
    try {
      const res = await api.post('/wallet/topup', {
        amount_ugx: amount,
        gateway: selectedGateway,
        phone_number: phone || undefined,
      });
      setTopupMsg(res.data.data.message || 'Confirm on your phone');
      const topupId = res.data.data.topup_id;
      let attempts = 0;
      const poll = setInterval(async () => {
        if (++attempts > 20) { clearInterval(poll); return; }
        const st = await api.get(`/wallet/topup/${topupId}`);
        if (st.data.data.status === 'completed') {
          clearInterval(poll);
          setShowTopup(false);
          setTopupMsg('');
          refetch();
          Alert.alert('✅ Done!', `${formatUGX(amount)} added to your wallet`);
        }
      }, 3000);
    } catch (err: any) {
      setTopupMsg(err.response?.data?.detail || 'Payment failed');
    } finally {
      setTopping(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Balance card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>💰 Available Balance</Text>
        <Text style={styles.balanceAmount}>{formatUGX(walletBalance)}</Text>
        {bonusBalance > 0 && (
          <Text style={styles.bonusText}>🎁 +{formatUGX(bonusBalance)} bonus credits</Text>
        )}
        <TouchableOpacity style={styles.topupBtn} onPress={() => setShowTopup(!showTopup)}>
          <Text style={styles.topupBtnText}>{showTopup ? 'Cancel' : '+ Add Money'}</Text>
        </TouchableOpacity>
      </View>

      {/* Top-up form */}
      {showTopup && (
        <View style={styles.topupCard}>
          <Text style={styles.cardTitle}>Add Money</Text>
          <View style={styles.amountGrid}>
            {QUICK_AMOUNTS.map(amt => (
              <TouchableOpacity
                key={amt}
                style={[styles.amountBtn, selectedAmount === amt && !customAmount && styles.amountBtnActive]}
                onPress={() => { setSelectedAmount(amt); setCustomAmount(''); }}
              >
                <Text style={[styles.amountBtnText, selectedAmount === amt && !customAmount && styles.amountBtnTextActive]}>
                  {formatUGX(amt)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Custom amount (min UGX 1,000)"
            placeholderTextColor={COLORS.textDim}
            value={customAmount}
            onChangeText={(v) => { setCustomAmount(v); setSelectedAmount(0); }}
            keyboardType="numeric"
          />
          <Text style={styles.inputLabel}>Pay with</Text>
          {GATEWAYS.map(gw => (
            <TouchableOpacity
              key={gw.id}
              style={[styles.gwBtn, selectedGateway === gw.id && styles.gwBtnActive]}
              onPress={() => setSelectedGateway(gw.id)}
            >
              <Text style={styles.gwEmoji}>{gw.emoji}</Text>
              <Text style={styles.gwLabel}>{gw.label}</Text>
              {selectedGateway === gw.id && <Text style={styles.gwCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
          {(selectedGateway === 'mtn' || selectedGateway === 'airtel') && (
            <TextInput
              style={styles.input}
              placeholder="+256 7XX XXX XXX"
              placeholderTextColor={COLORS.textDim}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          )}
          {topupMsg ? (
            <View style={styles.msgBox}>
              <Text style={styles.msgText}>{topupMsg}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.confirmBtn, topping && styles.btnDisabled]}
            onPress={handleTopup}
            disabled={topping}
          >
            {topping
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.confirmBtnText}>
                  Add {formatUGX(customAmount ? parseInt(customAmount) || 0 : selectedAmount)}
                </Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {!txData?.length && (
          <Text style={styles.emptyText}>No transactions yet</Text>
        )}
        {txData?.map((tx: any) => (
          <View key={tx.id} style={styles.txRow}>
            <View style={[styles.txIcon, { backgroundColor: tx.amount_ugx > 0 ? '#14532d' : '#450a0a' }]}>
              <Text style={styles.txIconText}>{tx.amount_ugx > 0 ? '↓' : '↑'}</Text>
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txDesc} numberOfLines={1}>{tx.description || tx.type}</Text>
              <Text style={styles.txDate}>{timeAgo(tx.created_at)}</Text>
            </View>
            <Text style={[styles.txAmount, { color: tx.amount_ugx > 0 ? COLORS.green : '#f87171' }]}>
              {tx.amount_ugx > 0 ? '+' : ''}{formatUGX(Math.abs(tx.amount_ugx))}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 80 },
  balanceCard: {
    backgroundColor: '#0c1a2e', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#1e3a5f', marginBottom: 16, alignItems: 'center',
  },
  balanceLabel: { color: COLORS.textMuted, fontSize: 13, marginBottom: 8 },
  balanceAmount: { fontSize: 36, fontWeight: '900', color: COLORS.electric, marginBottom: 4 },
  bonusText: { color: COLORS.green, fontSize: 12, marginBottom: 16 },
  topupBtn: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12 },
  topupBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  topupCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  amountBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)' },
  amountBtnActive: { backgroundColor: '#fff' },
  amountBtnText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  amountBtnTextActive: { color: '#000', fontWeight: '700' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    color: COLORS.text, fontSize: 14, marginBottom: 12,
  },
  inputLabel: { color: COLORS.textMuted, fontSize: 13, marginBottom: 8 },
  gwBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  gwBtnActive: { borderColor: COLORS.electric, backgroundColor: 'rgba(56,189,248,0.08)' },
  gwEmoji: { fontSize: 18 },
  gwLabel: { flex: 1, color: COLORS.text, fontSize: 13 },
  gwCheck: { color: COLORS.green, fontWeight: '700' },
  msgBox: {
    backgroundColor: 'rgba(56,189,248,0.1)', borderRadius: 10, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)',
  },
  msgText: { color: COLORS.electric, fontSize: 13 },
  confirmBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txIconText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  txInfo: { flex: 1 },
  txDesc: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
  txDate: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 13, fontWeight: '700' },
});
