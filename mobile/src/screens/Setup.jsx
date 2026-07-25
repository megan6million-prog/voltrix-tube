import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { api } from '../services/api'
import { registerBackgroundTask } from '../services/worker'

export default function Setup({ onDone }) {
  const [address, setAddress] = useState('')
  const [referral, setReferral] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleStart() {
    if (!address.trim()) return setError('Enter a payout address')
    setLoading(true)
    const res = await api.register(address.trim(), referral.trim() || undefined)
    setLoading(false)
    if (res.token) {
      await api.saveSession(res.token, res.device_id)
      await registerBackgroundTask()
      onDone()
    } else {
      setError('Registration failed. Try again.')
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.logo}>⚡ Voltrix</Text>
      <Text style={s.sub}>Enter your payout address to start earning passively.</Text>
      <TextInput style={s.input} placeholder="BTC / USDC wallet address" placeholderTextColor="#555"
        value={address} onChangeText={setAddress} autoCapitalize="none" />
      <TextInput style={s.input} placeholder="Referral code (optional)" placeholderTextColor="#555"
        value={referral} onChangeText={setReferral} autoCapitalize="characters" />
      {!!error && <Text style={s.error}>{error}</Text>}
      <TouchableOpacity style={s.btn} onPress={handleStart} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Start Earning</Text>}
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:'#0d0d0d', alignItems:'center', justifyContent:'center', padding:32 },
  logo: { fontSize:32, fontWeight:'700', color:'#7c3aed', marginBottom:8 },
  sub: { color:'#888', fontSize:14, textAlign:'center', marginBottom:32 },
  input: { width:'100%', backgroundColor:'#1a1a1a', color:'#fff', borderRadius:8, padding:14, fontSize:14, marginBottom:12, borderWidth:1, borderColor:'#333' },
  error: { color:'#f87171', fontSize:13, marginBottom:8 },
  btn: { width:'100%', backgroundColor:'#7c3aed', borderRadius:8, padding:14, alignItems:'center' },
  btnText: { color:'#fff', fontWeight:'600', fontSize:15 }
})
