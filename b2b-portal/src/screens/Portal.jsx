import { useState, useEffect } from 'react'
import { b2b } from '../services/api'

const RESOURCES = [
  { id: 'bandwidth', label: 'Bandwidth', unit: 'GB', price: '$0.01/GB' },
  { id: 'compute',   label: 'Compute',   unit: 'hr', price: '$0.05/hr' },
  { id: 'storage',   label: 'Storage',   unit: 'GB', price: '$0.02/GB' },
]

export default function Portal() {
  const [usage, setUsage] = useState(null)
  const [units, setUnits] = useState({})
  const [msg, setMsg] = useState('')
  const [topupAmt, setTopupAmt] = useState('')

  async function load() {
    const u = await b2b.getUsage()
    setUsage(u)
  }

  useEffect(() => { load() }, [])

  async function submit(resource_type) {
    const u = parseFloat(units[resource_type] || 1)
    const res = await b2b.submitTask(resource_type, u)
    setMsg(res.error || `Task queued! Cost: $${res.cost?.toFixed(4)}`)
    setTimeout(() => setMsg(''), 4000)
    load()
  }

  async function topup() {
    const amt = parseFloat(topupAmt)
    if (!amt || amt <= 0) return
    const res = await b2b.topup(amt)
    setMsg(`Balance topped up to $${res.balance?.toFixed(2)}`)
    setTopupAmt('')
    setTimeout(() => setMsg(''), 4000)
    load()
  }

  if (!usage) return <div style={s.loading}>Loading...</div>

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.logo}>⚡ Voltrix B2B</span>
        <span style={s.balance}>Balance: <strong style={{color:'#7c3aed'}}>${usage.balance?.toFixed(4)}</strong></span>
      </div>

      {/* Top up */}
      <div style={s.card}>
        <div style={s.cardTitle}>Top Up Balance</div>
        <div style={s.row}>
          <input style={s.input} type="number" placeholder="Amount ($)" value={topupAmt}
            onChange={e => setTopupAmt(e.target.value)} />
          <button style={s.btn} onClick={topup}>Top Up</button>
        </div>
      </div>

      {/* Resource cards */}
      <div style={s.grid}>
        {RESOURCES.map(r => (
          <div key={r.id} style={s.resCard}>
            <div style={s.resTitle}>{r.label}</div>
            <div style={s.resPrice}>{r.price}</div>
            <input style={s.input} type="number" min="1" placeholder={`Units (${r.unit})`}
              value={units[r.id] || ''} onChange={e => setUnits(u => ({...u, [r.id]: e.target.value}))} />
            <button style={s.btn} onClick={() => submit(r.id)}>Buy {r.label}</button>
          </div>
        ))}
      </div>

      {msg && <div style={s.msg}>{msg}</div>}

      {/* API Key */}
      <div style={s.card}>
        <div style={s.cardTitle}>Your API Key</div>
        <code style={s.apiKey}>{b2b.getKey()}</code>
      </div>

      {/* Usage history */}
      <div style={s.card}>
        <div style={s.cardTitle}>Usage History</div>
        {usage.usage?.length === 0 && <div style={s.empty}>No usage yet</div>}
        {usage.usage?.map((u, i) => (
          <div key={i} style={s.usageRow}>
            <span style={s.usageType}>{u.resource_type}</span>
            <span style={s.usageUnits}>{u.units} units</span>
            <span style={s.usageCost}>${u.cost.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const s = {
  wrap: { background:'#0d0d0d', minHeight:'100vh', color:'#fff', fontFamily:'system-ui,sans-serif', padding:24 },
  loading: { color:'#888', display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0d0d0d' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 },
  logo: { fontSize:22, fontWeight:700, color:'#7c3aed' },
  balance: { color:'#aaa', fontSize:15 },
  card: { background:'#1a1a1a', borderRadius:10, padding:16, marginBottom:16 },
  cardTitle: { color:'#555', fontSize:11, textTransform:'uppercase', letterSpacing:1, marginBottom:12 },
  grid: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 },
  resCard: { background:'#1a1a1a', borderRadius:10, padding:16, display:'flex', flexDirection:'column', gap:8 },
  resTitle: { color:'#fff', fontWeight:600, fontSize:15 },
  resPrice: { color:'#7c3aed', fontSize:12 },
  row: { display:'flex', gap:8 },
  input: { flex:1, padding:'10px 12px', borderRadius:6, border:'1px solid #333', background:'#111', color:'#fff', fontSize:13 },
  btn: { padding:'10px 16px', borderRadius:6, background:'#7c3aed', color:'#fff', border:'none', cursor:'pointer', fontWeight:600, fontSize:13 },
  msg: { background:'#1a1a1a', borderRadius:8, padding:'10px 16px', color:'#34d399', fontSize:13, marginBottom:16 },
  apiKey: { color:'#7c3aed', fontSize:12, wordBreak:'break-all', background:'#111', padding:'8px 12px', borderRadius:6, display:'block' },
  empty: { color:'#555', fontSize:13 },
  usageRow: { display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #222', fontSize:13 },
  usageType: { color:'#aaa', textTransform:'capitalize' },
  usageUnits: { color:'#666' },
  usageCost: { color:'#f87171' },
}
