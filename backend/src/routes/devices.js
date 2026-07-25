const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Register device with payout address
router.post('/register', (req, res) => {
  const { payout_address, platform, referral_code } = req.body;
  if (!payout_address || !platform) return res.status(400).json({ error: 'payout_address and platform required' });

  const id = uuidv4();
  const myReferralCode = uuidv4().slice(0, 8).toUpperCase();

  let referred_by = null;
  if (referral_code) {
    const referrer = db.prepare('SELECT id FROM devices WHERE referral_code = ?').get(referral_code);
    if (referrer) referred_by = referrer.id;
  }

  db.prepare(`
    INSERT INTO devices (id, payout_address, platform, referral_code, referred_by, last_seen)
    VALUES (?, ?, ?, ?, ?, strftime('%s','now'))
  `).run(id, payout_address, platform, myReferralCode, referred_by);

  const token = jwt.sign({ id, platform }, process.env.JWT_SECRET);
  res.json({ token, device_id: id, referral_code: myReferralCode });
});

// Heartbeat — update last_seen, uptime, streak
router.post('/heartbeat', require('../middleware/auth').authMiddleware, (req, res) => {
  const { id } = req.device;
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  const now = Math.floor(Date.now() / 1000);
  const hoursSince = (now - (device.last_seen || now)) / 3600;
  const newStreak = hoursSince < 24 ? device.streak : 0;
  const newUptime = device.uptime_days + (hoursSince / 24);
  const tier = newUptime >= 30 ? 3 : newUptime >= 7 ? 2 : 1;

  db.prepare(`
    UPDATE devices SET last_seen = ?, uptime_days = ?, streak = ?, tier = ? WHERE id = ?
  `).run(now, newUptime, newStreak + 1, tier, id);

  res.json({ ok: true });
});

module.exports = router;
