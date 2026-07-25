import { useState } from 'react'
import { api } from '../services/api'

export default function Setup({ onDone }) {
  const [address, setAddress] = useState('')
  const [referral, setReferral] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!address.trim()) return setError('Enter a payout address')
    setLoading(true)
    const res = await api.register(address.trim(), referral.trim() || undefined)
    setLoading(false)
    if (res.token) {
      api.saveSession(res.token, res.device_id)
      onDone()
    } else {
      setError('Registration failed. Try again.')
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.logo}>⚡ Voltrix</div>
      <p style={styles.sub}>Enter your payout address to start earning passively.</p>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          style={styles.input}
          placeholder="BTC / USDC wallet address"
          value={address}
          onChange={e => setAddress(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="Referral code (optional)"
          value={referral}
          onChange={e => setReferral(e.target.value)}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.btn} disabled={loading}>
          {loading ? 'Starting...' : 'Start Earning'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  container: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0d0d0d', color:'#fff', padding:32 },
  logo: { fontSize:32, fontWeight:700, marginBottom:8, color:'#7c3aed' },
  sub: { color:'#888', marginBottom:32, textAlign:'center', fontSize:14 },
  form: { display:'flex', flexDirection:'column', gap:12, width:'100%', maxWidth:320 },
  input: { padding:'12px 16px', borderRadius:8, border:'1px solid #333', background:'#1a1a1a', color:'#fff', fontSize:14, outline:'none' },
  btn: { padding:'12px 16px', borderRadius:8, background:'#7c3aed', color:'#fff', border:'none', fontSize:15, fontWeight:600, cursor:'pointer' },
  error: { color:'#f87171', fontSize:13, margin:0 }
}
