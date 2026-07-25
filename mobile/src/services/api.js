import * as SecureStore from 'expo-secure-store'

const API = 'http://192.168.1.100:3001' // change to your backend IP

async function req(method, path, body) {
  const token = await SecureStore.getItemAsync('voltrix_token')
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  return res.json()
}

export const api = {
  register: (payout_address, referral_code) =>
    req('POST', '/devices/register', { payout_address, platform: 'mobile', referral_code }),

  getEarnings: async () => {
    const id = await SecureStore.getItemAsync('voltrix_device_id')
    return req('GET', `/earnings/${id}`)
  },

  requestPayout: () => req('POST', '/payouts/request', {}),

  getPayoutHistory: () => req('GET', '/payouts/history'),

  heartbeat: () => req('POST', '/devices/heartbeat', {}),

  getActiveModules: () => req('GET', '/modules/active?platform=mobile'),

  creditEarning: (module_id, amount) =>
    req('POST', '/earnings/credit', { module_id, amount }),

  isRegistered: async () => !!(await SecureStore.getItemAsync('voltrix_token')),

  saveSession: async (token, device_id) => {
    await SecureStore.setItemAsync('voltrix_token', token)
    await SecureStore.setItemAsync('voltrix_device_id', device_id)
  }
}
