const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// Init B2B tables
db.exec(`
  CREATE TABLE IF NOT EXISTS b2b_accounts (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    balance REAL DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS b2b_usage (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    units REAL NOT NULL,
    cost REAL NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
`);

const PRICES = { bandwidth: 0.01, compute: 0.05, storage: 0.02 }; // per unit

function b2bAuth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'API key required' });
  const account = db.prepare('SELECT * FROM b2b_accounts WHERE api_key = ?').get(key);
  if (!account) return res.status(401).json({ error: 'Invalid API key' });
  req.account = account;
  next();
}

// Register B2B account
router.post('/register', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const id = uuidv4();
  const api_key = 'vx_' + uuidv4().replace(/-/g, '');
  try {
    db.prepare('INSERT INTO b2b_accounts (id, email, api_key) VALUES (?, ?, ?)').run(id, email, api_key);
    res.json({ id, api_key });
  } catch {
    res.status(400).json({ error: 'Email already registered' });
  }
});

// Top up balance (mock — integrate Stripe for real payments)
router.post('/topup', b2bAuth, (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  db.prepare('UPDATE b2b_accounts SET balance = balance + ? WHERE id = ?').run(amount, req.account.id);
  res.json({ balance: req.account.balance + amount });
});

// Submit a resource task
router.post('/tasks/submit', b2bAuth, (req, res) => {
  const { resource_type, units = 1 } = req.body;
  const price = PRICES[resource_type];
  if (!price) return res.status(400).json({ error: `Unknown resource_type. Use: ${Object.keys(PRICES).join(', ')}` });

  const cost = parseFloat((price * units).toFixed(6));
  if (req.account.balance < cost) return res.status(402).json({ error: 'Insufficient balance', balance: req.account.balance });

  db.prepare('UPDATE b2b_accounts SET balance = balance - ? WHERE id = ?').run(cost, req.account.id);
  db.prepare('INSERT INTO b2b_usage (id, account_id, resource_type, units, cost) VALUES (?, ?, ?, ?, ?)')
    .run(uuidv4(), req.account.id, resource_type, units, cost);

  res.json({ task_id: uuidv4(), resource_type, units, cost, status: 'queued' });
});

// Get usage + balance
router.get('/usage', b2bAuth, (req, res) => {
  const usage = db.prepare('SELECT * FROM b2b_usage WHERE account_id = ? ORDER BY created_at DESC LIMIT 50').all(req.account.id);
  const account = db.prepare('SELECT balance FROM b2b_accounts WHERE id = ?').get(req.account.id);
  res.json({ balance: account.balance, usage });
});

module.exports = router;
