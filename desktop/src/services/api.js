const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getToken() { return localStorage.getItem('voltrix_token') }
function getDeviceId() { return localStorage.getItem('voltrix_device_id') }

async function req(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  return res.json()
}

export const api = {
  register: (payout_address, referral_code) =>
    req('POST', '/devices/register', { payout_address, platform: 'desktop', referral_code }),

  getEarnings: () => req('GET', `/earnings/${getDeviceId()}`),

  requestPayout: () => req('POST', '/payouts/request', {}),

  getPayoutHistory: () => req('GET', '/payouts/history'),

  isRegistered: () => !!getToken(),

  saveSession: (token, device_id) => {
    localStorage.setItem('voltrix_token', token)
    localStorage.setItem('voltrix_device_id', device_id)
  }
}

export function connectWS(onEarnings) {
  const deviceId = getDeviceId()
  if (!deviceId) return
  const ws = new WebSocket(`ws://localhost:3001?deviceId=${deviceId}`)
  ws.onmessage = e => onEarnings(JSON.parse(e.data))
  ws.onclose = () => setTimeout(() => connectWS(onEarnings), 3000)
  return ws
}
