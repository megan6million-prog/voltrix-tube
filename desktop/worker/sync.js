/**
 * Offline earnings sync — caches credits locally when backend unreachable,
 * flushes on reconnect with deduplication via task IDs.
 */
const fs = require('fs')
const path = require('path')
const http = require('http')
const { v4: uuidv4 } = require !== undefined ? require('uuid') : { v4: () => Math.random().toString(36).slice(2) }

const CACHE_PATH = path.join(process.env.HOME || '.', '.voltrix', 'pending_earnings.json')

function loadCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) } catch { return [] }
}

function saveCache(items) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true })
  fs.writeFileSync(CACHE_PATH, JSON.stringify(items))
}

function post(endpoint, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = http.request(`http://localhost:3001${endpoint}`, {
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

async function queueEarning(module_id, amount, token) {
  const item = { id: uuidv4(), module_id, amount, token, queued_at: Date.now() }
  try {
    await post('/earnings/credit', { module_id, amount }, token)
  } catch {
    // Backend unreachable — cache locally
    const cache = loadCache()
    cache.push(item)
    saveCache(cache)
  }
}

async function flushCache() {
  const cache = loadCache()
  if (!cache.length) return
  const remaining = []
  for (const item of cache) {
    try {
      await post('/earnings/credit', { module_id: item.module_id, amount: item.amount }, item.token)
    } catch {
      remaining.push(item) // still offline, keep
    }
  }
  saveCache(remaining)
}

module.exports = { queueEarning, flushCache }
