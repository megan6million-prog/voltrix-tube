const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(process.env.DB_PATH || path.join(__dirname, '../../voltrix.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    payout_address TEXT NOT NULL,
    platform TEXT NOT NULL,
    referral_code TEXT UNIQUE,
    referred_by TEXT,
    tier INTEGER DEFAULT 1,
    streak INTEGER DEFAULT 0,
    uptime_days REAL DEFAULT 0,
    last_seen INTEGER,
    banned INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    enabled_desktop INTEGER DEFAULT 1,
    enabled_mobile INTEGER DEFAULT 0,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS earnings (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'points',
    synced INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY(device_id) REFERENCES devices(id)
  );

  CREATE TABLE IF NOT EXISTS payouts (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USDC',
    status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY(device_id) REFERENCES devices(id)
  );

  CREATE TABLE IF NOT EXISTS referral_earnings (
    id TEXT PRIMARY KEY,
    referrer_id TEXT NOT NULL,
    referred_id TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
`);

// Seed default modules
const modules = [
  { id: 'bandwidth', name: 'Bandwidth Sharing', desktop: 1, mobile: 1 },
  { id: 'storage',   name: 'Storage Sharing',   desktop: 1, mobile: 0 },
  { id: 'compute',   name: 'Compute Tasks',      desktop: 1, mobile: 0 },
  { id: 'mining',    name: 'Crypto Mining',      desktop: 1, mobile: 0 },
  { id: 'ai',        name: 'AI Training',        desktop: 1, mobile: 0 },
  { id: 'data',      name: 'Data/Surveys',       desktop: 1, mobile: 1 },
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO modules (id, name, enabled_desktop, enabled_mobile)
  VALUES (@id, @name, @desktop, @mobile)
`);
modules.forEach(m => insert.run(m));

module.exports = db;
