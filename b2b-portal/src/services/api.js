const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const API = `${BASE}/b2b`
const getKey = () => localStorage.getItem('b2b_api_key')

async function req(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': getKey() },
    body: body ? JSON.stringify(body) : undefined
  })
  return res.json()
}

export const b2b = {
  register: email => fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  }).then(r => r.json()),

  saveKey: key => localStorage.setItem('b2b_api_key', key),
  getKey,
  isLoggedIn: () => !!getKey(),

  topup: amount => req('POST', '/topup', { amount }),
  submitTask: (resource_type, units) => req('POST', '/tasks/submit', { resource_type, units }),
  getUsage: () => req('GET', '/usage'),
}
