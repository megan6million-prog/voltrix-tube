import { useState, useEffect } from 'react'
import { admin } from '../services/api'

export default function AdminPanel() {
  const [fleet, setFleet] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [tab, setTab] = useState('fleet')

  async function load() {
    const [f, a] = await Promise.all([admin.getFleet(), admin.getAnalytics()])
    setFleet(f)
    setAnalytics(a)
  }

  useEffect(() => { load() }, [])

  async function toggleModule(id, field, current) {
    await admin.toggleModule(id, { [field]: current ? 0 : 1 })
    load()
  }

  async function banDevice(id, banned) {
    await admin.banDevice(id, !banned)
    load()
  }

  if (!fleet) return <div style={s.loading}>Loading...</div>

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.logo}>⚡ Voltrix Admin</span>
        <div style={s.stats}>
          <span style={s.stat}>Devices: {fleet.devices?.length}</span>
          <span style={s.stat}>Total Earned: {fleet.totalEarnings?.toFixed(2)} pts</span>
          <span style={s.stat}>Pending Payouts: {fleet.pendingPayouts?.toFixed(2)} pts</span>
        </div>
      </div>

      <div style={s.tabs}>
        {['fleet','modules','analytics'].map(t => (
          <button key={t} style={{...s.tab, ...(tab===t?s.activeTab:{})}} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'fleet' && (
        <table style={s.table}>
          <thead><tr>
            {['Payout Address','Platform','Tier','Uptime','Status','Action'].map(h => (
              <th key={h} style={s.th}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {fleet.devices?.map(d => (
              <tr key={d.id} style={s.tr}>
                <td style={s.td}>{d.payout_address.slice(0,16)}...</td>
                <td style={s.td}>{d.platform}</td>
                <td style={s.td}>{d.tier}</td>
                <td style={s.td}>{d.uptime_days?.toFixed(1)}d</td>
                <td style={s.td}>
                  <span style={{...s.badge, background: d.banned ? '#7f1d1d' : '#14532d'}}>
                    {d.banned ? 'Banned' : 'Active'}
                  </span>
                </td>
                <td style={s.td}>
                  <button style={s.actionBtn} onClick={() => banDevice(d.id, d.banned)}>
                    {d.banned ? 'Unban' : 'Ban'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'modules' && (
        <table style={s.table}>
          <thead><tr>
            {['Module','Desktop','Mobile'].map(h => <th key={h} style={s.th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {/* We'll fetch modules separately */}
            <ModulesTable toggleModule={toggleModule} />
          </tbody>
        </table>
      )}

      {tab === 'analytics' && (
        <div style={s.grid}>
          <div style={s.card}>
            <div style={s.cardTitle}>Earnings by Module</div>
            {analytics?.byModule?.map(m => (
              <div key={m.module_id} style={s.row}>
                <span style={s.modName}>{m.module_id}</span>
                <span style={s.modAmt}>{parseFloat(m.total).toFixed(4)} pts</span>
              </div>
            ))}
          </div>
          <div style={s.card}>
            <div style={s.cardTitle}>Top Earners</div>
            {analytics?.topEarners?.map((e, i) => (
              <div key={i} style={s.row}>
                <span style={s.modName}>{e.device_id.slice(0,12)}...</span>
                <span style={s.modAmt}>{parseFloat(e.total).toFixed(4)} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ModulesTable({ toggleModule }) {
  const [modules, setModules] = useState([])
  useEffect(() => {
    fetch('http://localhost:3001/modules/active?platform=all')
      .then(r => r.json()).then(setModules).catch(() => {})
    // fallback: fetch both platforms and merge
    Promise.all([
      fetch('http://localhost:3001/modules/active?platform=desktop').then(r=>r.json()),
      fetch('http://localhost:3001/modules/active?platform=mobile').then(r=>r.json())
    ]).then(([d, m]) => {
      const all = {}
      d.forEach(x => all[x.id] = { ...x, enabled_desktop: 1, enabled_mobile: 0 })
      m.forEach(x => all[x.id] = { ...all[x.id], ...x, enabled_mobile: 1 })
      setModules(Object.values(all))
    }).catch(() => {})
  }, [])

  return modules.map(m => (
    <tr key={m.id} style={{ borderBottom: '1px solid #222' }}>
      <td style={{ padding: '10px 16px', color: '#fff', textTransform: 'capitalize' }}>{m.name}</td>
      <td style={{ padding: '10px 16px' }}>
        <Toggle on={!!m.enabled_desktop} onChange={() => toggleModule(m.id, 'enabled_desktop', m.enabled_desktop)} />
      </td>
      <td style={{ padding: '10px 16px' }}>
        <Toggle on={!!m.enabled_mobile} onChange={() => toggleModule(m.id, 'enabled_mobile', m.enabled_mobile)} />
      </td>
    </tr>
  ))
}

function Toggle({ on, onChange }) {
  return (
    <div onClick={onChange} style={{
      width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
      background: on ? '#7c3aed' : '#333', position: 'relative', transition: 'background 0.2s'
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s'
      }} />
    </div>
  )
}

const s = {
  wrap: { background: '#0d0d0d', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui,sans-serif' },
  loading: { color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0d0d' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #1f1f1f' },
  logo: { fontSize: 20, fontWeight: 700, color: '#7c3aed' },
  stats: { display: 'flex', gap: 24 },
  stat: { color: '#888', fontSize: 13 },
  tabs: { display: 'flex', gap: 4, padding: '12px 24px', borderBottom: '1px solid #1f1f1f' },
  tab: { padding: '6px 16px', borderRadius: 6, border: 'none', background: 'transparent', color: '#666', cursor: 'pointer', fontSize: 13 },
  activeTab: { background: '#1a1a1a', color: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse', padding: '0 24px' },
  th: { padding: '12px 16px', textAlign: 'left', color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #1f1f1f' },
  tr: { borderBottom: '1px solid #1a1a1a' },
  td: { padding: '10px 16px', fontSize: 13, color: '#ccc' },
  badge: { padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 },
  actionBtn: { padding: '4px 10px', borderRadius: 4, border: '1px solid #333', background: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: 12 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 24 },
  card: { background: '#1a1a1a', borderRadius: 10, padding: 16 },
  cardTitle: { color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  row: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #222' },
  modName: { color: '#ccc', fontSize: 13, textTransform: 'capitalize' },
  modAmt: { color: '#7c3aed', fontSize: 13, fontWeight: 600 },
}
