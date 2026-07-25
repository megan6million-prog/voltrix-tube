const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const REFERRAL_CUT = 0.05; // 5% of earnings go to referrer
const TIER_MULTIPLIERS = { 1: 1.0, 2: 1.1, 3: 1.25 };

// Credit earnings (called internally by workers)
router.post('/credit', authMiddleware, (req, res) => {
  const { id } = req.device;
  const { module_id, amount, currency = 'points' } = req.body;
  if (!module_id || !amount) return res.status(400).json({ error: 'module_id and amount required' });

  const device = db.prepare('SELECT * FROM devices WHERE id = ? AND banned = 0').get(id);
  if (!device) return res.status(403).json({ error: 'Device banned or not found' });

  // Fraud check — cap max single credit
  if (amount > 100) return res.status(400).json({ error: 'Suspicious earning amount' });

  const multiplier = TIER_MULTIPLIERS[device.tier] || 1.0;
  const finalAmount = parseFloat((amount * multiplier).toFixed(6));

  db.prepare(`
    INSERT INTO earnings (id, device_id, module_id, amount, currency)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), id, module_id, finalAmount, currency);

  // Credit referrer 5% cut
  if (device.referred_by) {
    const referralAmount = parseFloat((finalAmount * REFERRAL_CUT).toFixed(6));
    db.prepare(`
      INSERT INTO referral_earnings (id, referrer_id, referred_id, amount)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), device.referred_by, id, referralAmount);
  }

  res.json({ credited: finalAmount, multiplier });
});

// Get earnings summary for a device
router.get('/:deviceId', authMiddleware, (req, res) => {
  const { deviceId } = req.params;
  if (req.device.id !== deviceId) return res.status(403).json({ error: 'Forbidden' });

  const total = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM earnings WHERE device_id = ?
  `).get(deviceId).total;

  const referral_total = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM referral_earnings WHERE referrer_id = ?
  `).get(deviceId).total;

  const history = db.prepare(`
    SELECT module_id, amount, currency, created_at FROM earnings
    WHERE device_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(deviceId);

  const device = db.prepare('SELECT tier, streak, uptime_days, referral_code FROM devices WHERE id = ?').get(deviceId);

  res.json({ total: total + referral_total, referral_total, history, ...device });
});

module.exports = router;
