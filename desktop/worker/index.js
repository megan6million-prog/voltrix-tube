const http = require('http')
const fs = require('fs')
const path = require('path')
const { queueEarning, flushCache } = require('./sync')

const CONFIG_PATH = path.join(process.env.HOME || '.', '.voltrix', 'config.json')
const API = 'http://localhost:3001'

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) } catch { return null }
}

function get(endpoint, token) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${API}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }, res => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => resolve(JSON.parse(raw)))
    })
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')) })
    req.on('error', reject)
  })
}

function post(endpoint, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = http.request(`${API}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }, res => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => resolve(JSON.parse(raw)))
    })
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')) })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function runModule(moduleId) {
  const rates = {
    bandwidth: () => Math.random() * 0.05,
    storage:   () => Math.random() * 0.03,
    compute:   () => Math.random() * 0.08,
    mining:    () => Math.random() * 0.04,
    ai:        () => Math.random() * 0.06,
    data:      () => Math.random() * 0.02,
  }
  return parseFloat(((rates[moduleId] || (() => 0))()).toFixed(6))
}

async function tick() {
  const config = loadConfig()
  if (!config?.token) return

  // Flush any cached offline earnings first
  await flushCache()

  try {
    await post('/devices/heartbeat', {}, config.token)
    const modules = await get('/modules/active?platform=desktop', config.token)
    for (const mod of modules) {
      const amount = runModule(mod.id)
      if (amount > 0) await queueEarning(mod.id, amount, config.token)
    }
  } catch {
    // Will retry next tick
  }
}

tick()
setInterval(tick, 60_000)
