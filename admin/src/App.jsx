import { useState } from 'react'
import { admin } from './services/api'
import AdminPanel from './screens/AdminPanel'

export default function App() {
  const [authed, setAuthed] = useState(admin.isLoggedIn())
  const [token, setToken] = useState('')

  if (!authed) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0d0d0d', gap:12 }}>
      <div style={{ fontSize:24, fontWeight:700, color:'#7c3aed' }}>⚡ Voltrix Admin</div>
      <input
        style={{ padding:'10px 14px', borderRadius:8, border:'1px solid #333', background:'#1a1a1a', color:'#fff', width:280 }}
        placeholder="Admin secret"
        type="password"
        value={token}
        onChange={e => setToken(e.target.value)}
        onKeyDown={e => { if(e.key==='Enter'){ admin.login(token); setAuthed(true) }}}
      />
      <button
        style={{ padding:'10px 24px', borderRadius:8, background:'#7c3aed', color:'#fff', border:'none', cursor:'pointer', fontWeight:600 }}
        onClick={() => { admin.login(token); setAuthed(true) }}
      >Login</button>
    </div>
  )

  return <AdminPanel />
}
