import { useState } from 'react'
import { b2b } from './services/api'
import Portal from './screens/Portal'

export default function App() {
  const [authed, setAuthed] = useState(b2b.isLoggedIn())
  const [email, setEmail] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [msg, setMsg] = useState('')

  async function register() {
    const res = await b2b.register(email)
    if (res.api_key) {
      b2b.saveKey(res.api_key)
      setAuthed(true)
    } else setMsg(res.error || 'Failed')
  }

  function login() {
    if (!apiKey.trim()) return
    b2b.saveKey(apiKey.trim())
    setAuthed(true)
  }

  if (authed) return <Portal />

  return (
    <div style={s.container}>
      <div style={s.logo}>⚡ Voltrix B2B</div>
      <p style={s.sub}>Buy bandwidth, compute & storage from the Voltrix network.</p>
      <div style={s.tabs}>
        <button style={{...s.tab, ...(mode==='login'?s.active:{})}} onClick={() => setMode('login')}>Login</button>
        <button style={{...s.tab, ...(mode==='register'?s.active:{})}} onClick={() => setMode('register')}>Register</button>
      </div>
      {mode === 'register' ? <>
        <input style={s.input} placeholder="Business email" value={email} onChange={e => setEmail(e.target.value)} />
        <button style={s.btn} onClick={register}>Create Account</button>
      </> : <>
        <input style={s.input} placeholder="API Key (vx_...)" value={apiKey} onChange={e => setApiKey(e.target.value)} />
        <button style={s.btn} onClick={login}>Login</button>
      </>}
      {msg && <p style={s.err}>{msg}</p>}
    </div>
  )
}

const s = {
  container: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0d0d0d', color:'#fff', padding:32, gap:12 },
  logo: { fontSize:28, fontWeight:700, color:'#7c3aed' },
  sub: { color:'#888', fontSize:14, textAlign:'center', maxWidth:320 },
  tabs: { display:'flex', gap:4, background:'#1a1a1a', borderRadius:8, padding:4 },
  tab: { padding:'6px 20px', borderRadius:6, border:'none', background:'transparent', color:'#666', cursor:'pointer', fontSize:13 },
  active: { background:'#7c3aed', color:'#fff' },
  input: { width:300, padding:'12px 14px', borderRadius:8, border:'1px solid #333', background:'#1a1a1a', color:'#fff', fontSize:14 },
  btn: { width:300, padding:'12px', borderRadius:8, background:'#7c3aed', color:'#fff', border:'none', fontSize:15, fontWeight:600, cursor:'pointer' },
  err: { color:'#f87171', fontSize:13 }
}
