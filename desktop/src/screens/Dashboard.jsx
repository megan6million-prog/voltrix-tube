import { useEffect, useState } from 'react'
import { api, connectWS } from '../services/api'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [payouts, setPayouts] = useState([])
  const [msg, setMsg] = useState('')

  async function load() {
    const [e, p] = await Promise.all([api.getEarnings(), api.getPayoutHistory()])
    setData(e)
    setPayouts(p)
  }

  useEffect(() => {
    load()
    const ws = connectWS(() => load()) // refresh on any WS push
    return () => ws?.close()
  }, [])

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

  if (!data) return <div style={styles.loading}>Loading...</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>⚡ Voltrix</div>

      {/* Earnings Card */}
      <div style={styles.card}>
        <div style={styles.label}>Total Earned</div>
        <div style={styles.total}>{(data.total || 0).toFixed(4)} pts</div>
        <div style={styles.meta}>
          Tier {data.tier} · Streak {data.streak} days · {data.uptime_days?.toFixed(1)}d uptime
        </div>
        {data.referral_total > 0 && (
          <div style={styles.referral}>+{data.referral_total.toFixed(4)} from referrals</div>
        )}
      </div>

      {/* Referral Code */}
      <div style={styles.refBox}>
        Your referral code: <strong style={{color:'#7c3aed'}}>{data.referral_code}</strong>
      </div>

      {/* Withdraw */}
      <button style={styles.btn} onClick={withdraw}>Withdraw</button>
      {msg && <p style={styles.msg}>{msg}</p>}

      {/* History */}
      <div style={styles.section}>Recent Earnings</div>
      <div style={styles.list}>
        {data.history?.slice(0, 10).map((h, i) => (
          <div key={i} style={styles.row}>
            <span style={styles.mod}>{h.module_id}</span>
            <span style={styles.amt}>+{h.amount.toFixed(6)}</span>
          </div>
        ))}
        {!data.history?.length && <div style={styles.empty}>No earnings yet — worker is starting...</div>}
      </div>

      {/* Payout History */}
      {payouts.length > 0 && <>
        <div style={styles.section}>Payout History</div>
        <div style={styles.list}>
          {payouts.map((p, i) => (
            <div key={i} style={styles.row}>
              <span style={styles.mod}>{p.status}</span>
              <span style={styles.amt}>{p.amount.toFixed(4)} {p.currency}</span>
            </div>
          ))}
        </div>
      </>}
    </div>
  )
}

const styles = {
  container: { background:'#0d0d0d', color:'#fff', minHeight:'100vh', padding:'24px 20px', fontFamily:'system-ui,sans-serif' },
  loading: { color:'#888', display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0d0d0d' },
  header: { fontSize:22, fontWeight:700, color:'#7c3aed', marginBottom:20 },
  card: { background:'#1a1a1a', borderRadius:12, padding:20, marginBottom:12 },
  label: { color:'#888', fontSize:12, marginBottom:4 },
  total: { fontSize:36, fontWeight:700, color:'#fff' },
  meta: { color:'#666', fontSize:12, marginTop:6 },
  referral: { color:'#34d399', fontSize:12, marginTop:4 },
  refBox: { background:'#1a1a1a', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#aaa', marginBottom:12 },
  btn: { width:'100%', padding:'13px', borderRadius:8, background:'#7c3aed', color:'#fff', border:'none', fontSize:15, fontWeight:600, cursor:'pointer', marginBottom:8 },
  msg: { color:'#34d399', fontSize:13, textAlign:'center', margin:'4px 0 8px' },
  section: { color:'#555', fontSize:11, textTransform:'uppercase', letterSpacing:1, margin:'16px 0 8px' },
  list: { display:'flex', flexDirection:'column', gap:6 },
  row: { display:'flex', justifyContent:'space-between', background:'#1a1a1a', borderRadius:6, padding:'8px 12px', fontSize:13 },
  mod: { color:'#aaa', textTransform:'capitalize' },
  amt: { color:'#34d399', fontWeight:600 },
  empty: { color:'#555', fontSize:13, textAlign:'center', padding:12 }
}
