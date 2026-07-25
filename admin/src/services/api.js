const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const getToken = () => localStorage.getItem('admin_token')

async function req(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getToken()
    },
    body: body ? JSON.stringify(body) : undefined
  })
  return res.json()
}

export const admin = {
  login: token => localStorage.setItem('admin_token', token),
  isLoggedIn: () => !!getToken(),
  getFleet: () => req('GET', '/admin/fleet'),
  getAnalytics: () => req('GET', '/admin/analytics'),
  toggleModule: (id, patch) => req('PATCH', `/admin/modules/${id}`, patch),
  banDevice: (id, banned) => req('PATCH', `/admin/devices/${id}/ban`, { banned }),
  processPayout: (id, status) => req('PATCH', `/admin/payouts/${id}`, { status }),
}
