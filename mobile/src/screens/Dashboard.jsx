import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { api } from '../services/api'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [payouts, setPayouts] = useState([])
  const [msg, setMsg] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const [e, p] = await Promise.all([api.getEarnings(), api.getPayoutHistory()])
    setData(e)
    setPayouts(Array.isArray(p) ? p : [])
  }

  useEffect(() => { load() }, [])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function withdraw() {
    const res = await api.requestPayout()
    if (res.payout_id) {
      setMsg(`Payout of ${res.amount.toFixed(4)} pts requested!`)
      load()
    } else {
      setMsg(res.error || 'Payout failed')
    }
    setTimeout(() => setMsg(''), 4000)
  }

  if (!data) return (
    <View style={s.loading}><Text style={{ color:'#888' }}>Loading...</Text></View>
  )

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}>
      <Text style={s.logo}>⚡ Voltrix</Text>

      {/* Earnings Card */}
      <View style={s.card}>
        <Text style={s.label}>Total Earned</Text>
        <Text style={s.total}>{(data.total || 0).toFixed(4)} pts</Text>
        <Text style={s.meta}>Tier {data.tier} · Streak {data.streak} days · {data.uptime_days?.toFixed(1)}d uptime</Text>
        {data.referral_total > 0 && <Text style={s.referral}>+{data.referral_total.toFixed(4)} from referrals</Text>}
      </View>

      {/* Referral */}
      <View style={s.refBox}>
        <Text style={s.refText}>Your referral code: <Text style={{ color:'#7c3aed', fontWeight:'700' }}>{data.referral_code}</Text></Text>
      </View>

      {/* Withdraw */}
      <TouchableOpacity style={s.btn} onPress={withdraw}>
        <Text style={s.btnText}>Withdraw</Text>
      </TouchableOpacity>
      {!!msg && <Text style={s.msg}>{msg}</Text>}

      {/* Earnings History */}
      <Text style={s.section}>Recent Earnings</Text>
      {data.history?.slice(0, 10).map((h, i) => (
        <View key={i} style={s.row}>
          <Text style={s.modName}>{h.module_id}</Text>
          <Text style={s.modAmt}>+{h.amount.toFixed(6)}</Text>
        </View>
      ))}
      {!data.history?.length && <Text style={s.empty}>No earnings yet — worker is starting...</Text>}

      {/* Payout History */}
      {payouts.length > 0 && <>
        <Text style={s.section}>Payout History</Text>
        {payouts.map((p, i) => (
          <View key={i} style={s.row}>
            <Text style={s.modName}>{p.status}</Text>
            <Text style={s.modAmt}>{p.amount.toFixed(4)} {p.currency}</Text>
          </View>
        ))}
      </>}
      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:'#0d0d0d', padding:20 },
  loading: { flex:1, backgroundColor:'#0d0d0d', alignItems:'center', justifyContent:'center' },
  logo: { fontSize:22, fontWeight:'700', color:'#7c3aed', marginBottom:20, marginTop:48 },
  card: { backgroundColor:'#1a1a1a', borderRadius:12, padding:20, marginBottom:12 },
  label: { color:'#888', fontSize:12, marginBottom:4 },
  total: { fontSize:36, fontWeight:'700', color:'#fff' },
  meta: { color:'#666', fontSize:12, marginTop:6 },
  referral: { color:'#34d399', fontSize:12, marginTop:4 },
  refBox: { backgroundColor:'#1a1a1a', borderRadius:8, padding:12, marginBottom:12 },
  refText: { color:'#aaa', fontSize:13 },
  btn: { backgroundColor:'#7c3aed', borderRadius:8, padding:14, alignItems:'center', marginBottom:8 },
  btnText: { color:'#fff', fontWeight:'600', fontSize:15 },
  msg: { color:'#34d399', fontSize:13, textAlign:'center', marginBottom:8 },
  section: { color:'#555', fontSize:11, textTransform:'uppercase', letterSpacing:1, marginTop:16, marginBottom:8 },
  row: { flexDirection:'row', justifyContent:'space-between', backgroundColor:'#1a1a1a', borderRadius:6, padding:10, marginBottom:6 },
  modName: { color:'#aaa', fontSize:13, textTransform:'capitalize' },
  modAmt: { color:'#34d399', fontWeight:'600', fontSize:13 },
  empty: { color:'#555', fontSize:13, textAlign:'center', padding:12 }
})
